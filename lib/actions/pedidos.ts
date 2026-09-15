"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAdmin, exigirSessao } from "@/lib/auth";
import { avaliarLimites } from "@/lib/limites";
import { avaliarHorarioAtividade } from "@/lib/atividades";
import { lerArquivoEnviado } from "@/lib/storage";
import type { StatusPedido } from "@prisma/client";

export type TipoPedido = "DIARIA" | "HOSPEDAGEM";

async function obterConfiguracao() {
  const config = await prisma.configuracaoSistema.findUnique({ where: { id: 1 } });
  if (!config) {
    throw new Error("Configuração do sistema não encontrada. Rode o seed.");
  }
  return config;
}

async function buscarPedido(tipo: TipoPedido, pedidoId: string) {
  if (tipo === "DIARIA") {
    return prisma.pedidoDiaria.findUniqueOrThrow({
      where: { id: pedidoId },
      include: { viagem: { include: { beneficiario: { include: { categoria: true } }, atividades: true } } },
    });
  }
  return prisma.pedidoHospedagem.findUniqueOrThrow({
    where: { id: pedidoId },
    include: { viagem: { include: { beneficiario: { include: { categoria: true } }, atividades: true } } },
  });
}

async function verificarAcessoPedido(tipo: TipoPedido, pedidoId: string) {
  const sessao = await exigirSessao();
  const pedido = await buscarPedido(tipo, pedidoId);

  if (sessao.perfil !== "ADMIN" && pedido.viagem.unidadeSolicitanteId !== sessao.unidadeId) {
    throw new Error("Você não tem acesso a este pedido.");
  }

  return { sessao, pedido };
}

function atualizarStatus(tipo: TipoPedido, pedidoId: string, status: StatusPedido) {
  if (tipo === "DIARIA") {
    return prisma.pedidoDiaria.update({ where: { id: pedidoId }, data: { status } });
  }
  return prisma.pedidoHospedagem.update({ where: { id: pedidoId }, data: { status } });
}

/**
 * Re-avalia, em ordem, os "gates" que podem ainda estar pendentes depois que
 * uma justificativa (prazo ou atividade) acaba de ser aceita: folga de
 * atividade ainda sem justificativa do gestor -> limite mensal/anual (só
 * diária, hospedagem não tem esse conceito) -> deferimento.
 */
async function reavaliarStatusPosJustificativas(tipo: TipoPedido, pedidoId: string) {
  const pedido = await buscarPedido(tipo, pedidoId);
  const config = await obterConfiguracao();

  if (!pedido.justificativaGestorAceitaPor) {
    const situacaoAtividade = avaliarHorarioAtividade(
      { chegadaDestino: pedido.viagem.chegadaDestino, saidaDestino: pedido.viagem.saidaDestino },
      pedido.viagem.atividades,
    );
    if (situacaoAtividade.situacao === "REQUER_JUSTIFICATIVA_FOLGA") {
      await atualizarStatus(tipo, pedidoId, "AGUARDANDO_JUSTIFICATIVA_ATIVIDADE");
      return;
    }
  }

  if (tipo === "HOSPEDAGEM") {
    await atualizarStatus(tipo, pedidoId, "AGUARDANDO_DEFERIMENTO");
    return;
  }

  const pedidoDiaria = await prisma.pedidoDiaria.findUniqueOrThrow({ where: { id: pedidoId } });
  const pedidosExistentes = await prisma.pedidoDiaria.findMany({
    where: {
      viagem: { beneficiarioId: pedido.viagem.beneficiarioId },
      status: { not: "INDEFERIDO" },
      diarias: { not: null },
      id: { not: pedidoId },
    },
    select: { diarias: true, viagem: { select: { saidaSede: true } } },
  });

  const situacaoLimite = avaliarLimites(
    { diarias: Number(pedidoDiaria.diarias), saidaSede: pedido.viagem.saidaSede },
    pedidosExistentes.map((p) => ({ diarias: Number(p.diarias), saidaSede: p.viagem.saidaSede })),
    config.limiteMensalDiarias,
    pedido.viagem.beneficiario.categoria.limiteAnualDias,
  );

  await atualizarStatus(
    tipo,
    pedidoId,
    situacaoLimite.situacao === "DENTRO_DO_LIMITE" ? "AGUARDANDO_DEFERIMENTO" : "AGUARDANDO_DELIBERACAO_LIMITE",
  );
}

export async function aprovarJustificativaPrazoAction(tipo: TipoPedido, pedidoId: string) {
  const sessao = await exigirAdmin();
  const pedido = await buscarPedido(tipo, pedidoId);

  if (pedido.status !== "AGUARDANDO_JUSTIFICATIVA_PRAZO") {
    throw new Error("Este pedido não está aguardando justificativa de prazo.");
  }

  if (tipo === "DIARIA") {
    await prisma.pedidoDiaria.update({ where: { id: pedidoId }, data: { justificativaPrazoAceitaPor: sessao.userId } });
  } else {
    await prisma.pedidoHospedagem.update({ where: { id: pedidoId }, data: { justificativaPrazoAceitaPor: sessao.userId } });
  }

  await reavaliarStatusPosJustificativas(tipo, pedidoId);
  revalidatePath(`/pedidos/${pedido.viagemId}`);
  revalidatePath("/pedidos");
}

/**
 * Aprovação, pelo admin (gestor da unidade), da folga entre a janela de
 * viagem e as atividades vinculadas — exige texto justificando que não há
 * prejuízo ao serviço e que os dias de ausência não vinculados à atividade
 * serão compensados conforme legislação/normas.
 */
export async function aprovarJustificativaAtividadeAction(
  tipo: TipoPedido,
  pedidoId: string,
  formData: FormData,
) {
  const sessao = await exigirAdmin();
  const pedido = await buscarPedido(tipo, pedidoId);

  if (pedido.status !== "AGUARDANDO_JUSTIFICATIVA_ATIVIDADE") {
    throw new Error("Este pedido não está aguardando justificativa de atividade.");
  }

  const justificativaGestorAtividade = String(formData.get("justificativaGestorAtividade") ?? "").trim();
  if (!justificativaGestorAtividade) {
    throw new Error("Informe a justificativa do gestor (sem prejuízo ao serviço e compensação dos dias de ausência).");
  }

  const data = { justificativaGestorAtividade, justificativaGestorAceitaPor: sessao.userId };
  if (tipo === "DIARIA") {
    await prisma.pedidoDiaria.update({ where: { id: pedidoId }, data });
  } else {
    await prisma.pedidoHospedagem.update({ where: { id: pedidoId }, data });
  }

  await reavaliarStatusPosJustificativas(tipo, pedidoId);
  revalidatePath(`/pedidos/${pedido.viagemId}`);
  revalidatePath("/pedidos");
}

/** Só diária tem deliberação de limite (Art. 15/16) — hospedagem não. */
export async function anexarComprovanteLimiteAction(pedidoId: string, formData: FormData) {
  const { pedido } = await verificarAcessoPedido("DIARIA", pedidoId);

  if (pedido.status !== "AGUARDANDO_DELIBERACAO_LIMITE") {
    throw new Error("Este pedido não está aguardando deliberação de limite.");
  }

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    throw new Error("Selecione um arquivo PDF.");
  }
  if (arquivo.type !== "application/pdf") {
    throw new Error("O comprovante deve ser um arquivo PDF.");
  }

  const arquivoLido = await lerArquivoEnviado(arquivo);

  await prisma.anexo.create({
    data: {
      pedidoDiariaId: pedidoId,
      tipo: "AUTORIZACAO_LIMITE",
      nomeArquivo: arquivoLido.nomeArquivo,
      // ArrayBuffer vs. ArrayBufferLike: mesma divergência de versão de tipos
      // do @types/node explicada em lib/storage.ts; em runtime é um Uint8Array normal.
      conteudo: arquivoLido.conteudo as never,
    },
  });

  revalidatePath(`/pedidos/${pedido.viagemId}`);
}

export async function deferirLimiteAction(pedidoId: string) {
  await exigirAdmin();
  const pedido = await prisma.pedidoDiaria.findUniqueOrThrow({
    where: { id: pedidoId },
    include: { anexos: true },
  });

  if (pedido.status !== "AGUARDANDO_DELIBERACAO_LIMITE") {
    throw new Error("Este pedido não está aguardando deliberação de limite.");
  }

  const temComprovante = pedido.anexos.some((a) => a.tipo === "AUTORIZACAO_LIMITE");
  if (!temComprovante) {
    throw new Error("É necessário anexar o comprovante de autorização (Art. 15/16) antes de liberar este pedido.");
  }

  await prisma.pedidoDiaria.update({ where: { id: pedidoId }, data: { status: "AGUARDANDO_DEFERIMENTO" } });

  revalidatePath(`/pedidos/${pedido.viagemId}`);
  revalidatePath("/pedidos");
}

export async function deferirPedidoAction(tipo: TipoPedido, pedidoId: string) {
  const sessao = await exigirAdmin();
  const pedido = await buscarPedido(tipo, pedidoId);

  if (pedido.status !== "AGUARDANDO_DEFERIMENTO") {
    throw new Error("Este pedido não está aguardando deferimento.");
  }

  const aprovacaoData =
    tipo === "DIARIA"
      ? { pedidoDiariaId: pedidoId, aprovadorId: sessao.userId, decisao: "DEFERIDO" }
      : { pedidoHospedagemId: pedidoId, aprovadorId: sessao.userId, decisao: "DEFERIDO" };

  await prisma.$transaction([
    tipo === "DIARIA"
      ? prisma.pedidoDiaria.update({ where: { id: pedidoId }, data: { status: "DEFERIDO" } })
      : prisma.pedidoHospedagem.update({ where: { id: pedidoId }, data: { status: "DEFERIDO" } }),
    prisma.aprovacao.create({ data: aprovacaoData }),
  ]);

  revalidatePath(`/pedidos/${pedido.viagemId}`);
  revalidatePath("/pedidos");
}

export async function indeferirPedidoAction(tipo: TipoPedido, pedidoId: string, formData: FormData) {
  const sessao = await exigirAdmin();
  const pedido = await buscarPedido(tipo, pedidoId);
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!motivo) {
    throw new Error("Informe o motivo do indeferimento.");
  }

  const aprovacaoData =
    tipo === "DIARIA"
      ? { pedidoDiariaId: pedidoId, aprovadorId: sessao.userId, decisao: "INDEFERIDO", motivo }
      : { pedidoHospedagemId: pedidoId, aprovadorId: sessao.userId, decisao: "INDEFERIDO", motivo };

  await prisma.$transaction([
    tipo === "DIARIA"
      ? prisma.pedidoDiaria.update({ where: { id: pedidoId }, data: { status: "INDEFERIDO" } })
      : prisma.pedidoHospedagem.update({ where: { id: pedidoId }, data: { status: "INDEFERIDO" } }),
    prisma.aprovacao.create({ data: aprovacaoData }),
  ]);

  revalidatePath(`/pedidos/${pedido.viagemId}`);
  revalidatePath("/pedidos");
}

export async function enviarRelatorioViagemAction(tipo: TipoPedido, pedidoId: string, formData: FormData) {
  const { pedido } = await verificarAcessoPedido(tipo, pedidoId);

  if (pedido.status !== "DEFERIDO") {
    throw new Error("Só é possível enviar relatório de um pedido já deferido.");
  }

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    throw new Error("Selecione um arquivo PDF.");
  }
  if (arquivo.type !== "application/pdf") {
    throw new Error("O relatório deve ser um arquivo PDF.");
  }

  const arquivoLido = await lerArquivoEnviado(arquivo);
  const anexoData =
    tipo === "DIARIA"
      ? { pedidoDiariaId: pedidoId, tipo: "RELATORIO_VIAGEM" as const, nomeArquivo: arquivoLido.nomeArquivo, conteudo: arquivoLido.conteudo as never }
      : { pedidoHospedagemId: pedidoId, tipo: "RELATORIO_VIAGEM" as const, nomeArquivo: arquivoLido.nomeArquivo, conteudo: arquivoLido.conteudo as never };

  await prisma.$transaction([
    prisma.anexo.create({ data: anexoData }),
    tipo === "DIARIA"
      ? prisma.pedidoDiaria.update({ where: { id: pedidoId }, data: { relatorioEnviadoEm: new Date() } })
      : prisma.pedidoHospedagem.update({ where: { id: pedidoId }, data: { relatorioEnviadoEm: new Date() } }),
  ]);

  revalidatePath(`/pedidos/${pedido.viagemId}`);
  revalidatePath("/pedidos");
}

export async function regularizarPendenciaAction(tipo: TipoPedido, pedidoId: string) {
  const sessao = await exigirAdmin();
  const pedido = await buscarPedido(tipo, pedidoId);
  const data = { pendenciaRegularizadaEm: new Date(), pendenciaRegularizadaPor: sessao.userId };

  if (tipo === "DIARIA") {
    await prisma.pedidoDiaria.update({ where: { id: pedidoId }, data });
  } else {
    await prisma.pedidoHospedagem.update({ where: { id: pedidoId }, data });
  }

  revalidatePath(`/pedidos/${pedido.viagemId}`);
  revalidatePath("/pedidos");
}
