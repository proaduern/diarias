"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAdmin, exigirSessao } from "@/lib/auth";
import { avaliarLimites } from "@/lib/limites";
import { avaliarHorarioAtividade } from "@/lib/atividades";
import { avaliarSaldoContrato } from "@/lib/saldo-contrato";
import { lerArquivoEnviado } from "@/lib/storage";
import { formatarMoeda } from "@/lib/formato";
import { comTratamentoDeErro, type ResultadoAction } from "./resultado";
import type { StatusPedido } from "@prisma/client";

export type TipoPedido = "DIARIA" | "HOSPEDAGEM" | "PASSAGEM_AEREA";

async function obterConfiguracao() {
  const config = await prisma.configuracaoSistema.findUnique({ where: { id: 1 } });
  if (!config) {
    throw new Error("Configuração do sistema não encontrada. Rode o seed.");
  }
  return config;
}

const includeViagem = {
  viagem: { include: { beneficiario: { include: { categoria: true } }, atividades: true } },
} as const;

async function buscarPedido(tipo: TipoPedido, pedidoId: string) {
  if (tipo === "DIARIA") {
    return prisma.pedidoDiaria.findUniqueOrThrow({ where: { id: pedidoId }, include: includeViagem });
  }
  if (tipo === "HOSPEDAGEM") {
    return prisma.pedidoHospedagem.findUniqueOrThrow({ where: { id: pedidoId }, include: includeViagem });
  }
  return prisma.pedidoPassagemAerea.findUniqueOrThrow({ where: { id: pedidoId }, include: includeViagem });
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
  if (tipo === "DIARIA") return prisma.pedidoDiaria.update({ where: { id: pedidoId }, data: { status } });
  if (tipo === "HOSPEDAGEM") return prisma.pedidoHospedagem.update({ where: { id: pedidoId }, data: { status } });
  return prisma.pedidoPassagemAerea.update({ where: { id: pedidoId }, data: { status } });
}

function atualizarCampos(tipo: TipoPedido, pedidoId: string, data: Record<string, unknown>, client: any = prisma) {
  if (tipo === "DIARIA") return client.pedidoDiaria.update({ where: { id: pedidoId }, data });
  if (tipo === "HOSPEDAGEM") return client.pedidoHospedagem.update({ where: { id: pedidoId }, data });
  return client.pedidoPassagemAerea.update({ where: { id: pedidoId }, data });
}

function criarAprovacao(tipo: TipoPedido, pedidoId: string, aprovadorId: string, decisao: string, motivo?: string) {
  const campoId =
    tipo === "DIARIA" ? "pedidoDiariaId" : tipo === "HOSPEDAGEM" ? "pedidoHospedagemId" : "pedidoPassagemAereaId";
  return prisma.aprovacao.create({ data: { [campoId]: pedidoId, aprovadorId, decisao, motivo } });
}

function criarAnexo(
  tipo: TipoPedido,
  pedidoId: string,
  data: { tipo: "AUTORIZACAO_LIMITE" | "RELATORIO_VIAGEM"; nomeArquivo: string; conteudo: Uint8Array },
) {
  const campoId =
    tipo === "DIARIA" ? "pedidoDiariaId" : tipo === "HOSPEDAGEM" ? "pedidoHospedagemId" : "pedidoPassagemAereaId";
  return prisma.anexo.create({ data: { [campoId]: pedidoId, ...data } as never });
}

/** Só hospedagem e passagem aérea exigem valor cotado manualmente antes do deferimento. */
function exigeValorCotado(tipo: TipoPedido): boolean {
  return tipo === "HOSPEDAGEM" || tipo === "PASSAGEM_AEREA";
}

/**
 * Preenchimento manual do valor cotado fora do sistema (hospedagem ou
 * passagem aérea) — nunca calculado automaticamente, pois não há tabela
 * oficial de valores para nenhum dos dois. Só admin (ou quem ele designar
 * no futuro) preenche.
 */
export async function definirValorCotadoAction(
  tipo: TipoPedido,
  pedidoId: string,
  formData: FormData,
): Promise<ResultadoAction> {
  return comTratamentoDeErro(async () => {
    if (!exigeValorCotado(tipo)) {
      throw new Error("Este tipo de pedido não usa valor cotado manualmente.");
    }
    const sessao = await exigirAdmin();
    const valorReais = Number(formData.get("valor") ?? "");
    if (!Number.isFinite(valorReais) || valorReais <= 0) {
      throw new Error("Informe um valor válido, maior que zero.");
    }
    const novoValorCentavos = Math.round(valorReais * 100);

    const pedido = await buscarPedido(tipo, pedidoId);
    const contratoId = (pedido as { contratoId: string }).contratoId;
    const unidadeId = pedido.viagem.unidadeSolicitanteId;

    await prisma.$transaction(async (tx) => {
      const contrato = await tx.contrato.findUniqueOrThrow({ where: { id: contratoId } });

      const whereConsumidoContrato = { contratoId, status: { not: "INDEFERIDO" as const }, id: { not: pedidoId } };
      const whereConsumidoUnidade = { ...whereConsumidoContrato, viagem: { unidadeSolicitanteId: unidadeId } };

      const [consumidoContrato, consumidoUnidade, cota] = await Promise.all([
        Promise.all([
          tx.pedidoHospedagem.aggregate({ where: whereConsumidoContrato, _sum: { valorTotalCentavos: true } }),
          tx.pedidoPassagemAerea.aggregate({ where: whereConsumidoContrato, _sum: { valorTotalCentavos: true } }),
        ]),
        Promise.all([
          tx.pedidoHospedagem.aggregate({ where: whereConsumidoUnidade, _sum: { valorTotalCentavos: true } }),
          tx.pedidoPassagemAerea.aggregate({ where: whereConsumidoUnidade, _sum: { valorTotalCentavos: true } }),
        ]),
        tx.cotaContratoUnidade.findUnique({ where: { contratoId_unidadeId: { contratoId, unidadeId } } }),
      ]);

      const consumidoContratoCentavos =
        (consumidoContrato[0]._sum.valorTotalCentavos ?? 0) + (consumidoContrato[1]._sum.valorTotalCentavos ?? 0);
      const consumidoUnidadeCentavos =
        (consumidoUnidade[0]._sum.valorTotalCentavos ?? 0) + (consumidoUnidade[1]._sum.valorTotalCentavos ?? 0);

      const situacaoSaldo = avaliarSaldoContrato({
        novoValorCentavos,
        valorTotalContratoCentavos: contrato.valorTotalCentavos,
        consumidoContratoCentavos,
        cotaUnidadeCentavos: cota?.cotaCentavos ?? 0,
        consumidoUnidadeCentavos,
      });

      if (situacaoSaldo.situacao === "EXCEDE_COTA_UNIDADE") {
        throw new Error(
          `Este valor excede a cota da unidade neste contrato (disponível: ${formatarMoeda(situacaoSaldo.cotaUnidadeDisponivel, "BRL")}).`,
        );
      }
      if (situacaoSaldo.situacao === "EXCEDE_SALDO_CONTRATO") {
        throw new Error(
          `Este valor excede o saldo disponível do contrato (disponível: ${formatarMoeda(situacaoSaldo.saldoContratoDisponivel, "BRL")}).`,
        );
      }

      await atualizarCampos(tipo, pedidoId, {
        valorTotalCentavos: novoValorCentavos,
        valorCotadoPor: sessao.userId,
        valorCotadoEm: new Date(),
      }, tx);
    });

    revalidatePath(`/pedidos/${pedido.viagemId}`);
  });
}

/**
 * Re-avalia, em ordem, os "gates" que podem ainda estar pendentes depois que
 * uma justificativa (prazo ou atividade) acaba de ser aceita: folga de
 * atividade ainda sem justificativa do gestor -> limite mensal/anual (só
 * diária, os demais tipos não têm esse conceito) -> deferimento.
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

  if (tipo !== "DIARIA") {
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

export async function aprovarJustificativaPrazoAction(
  tipo: TipoPedido,
  pedidoId: string,
): Promise<ResultadoAction> {
  return comTratamentoDeErro(async () => {
    const sessao = await exigirAdmin();
    const pedido = await buscarPedido(tipo, pedidoId);

    if (pedido.status !== "AGUARDANDO_JUSTIFICATIVA_PRAZO") {
      throw new Error("Este pedido não está aguardando justificativa de prazo.");
    }

    await atualizarCampos(tipo, pedidoId, { justificativaPrazoAceitaPor: sessao.userId });

    await reavaliarStatusPosJustificativas(tipo, pedidoId);
    revalidatePath(`/pedidos/${pedido.viagemId}`);
    revalidatePath("/pedidos");
  });
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
): Promise<ResultadoAction> {
  return comTratamentoDeErro(async () => {
    const sessao = await exigirAdmin();
    const pedido = await buscarPedido(tipo, pedidoId);

    if (pedido.status !== "AGUARDANDO_JUSTIFICATIVA_ATIVIDADE") {
      throw new Error("Este pedido não está aguardando justificativa de atividade.");
    }

    const justificativaGestorAtividade = String(formData.get("justificativaGestorAtividade") ?? "").trim();
    if (!justificativaGestorAtividade) {
      throw new Error("Informe a justificativa do gestor (sem prejuízo ao serviço e compensação dos dias de ausência).");
    }

    await atualizarCampos(tipo, pedidoId, {
      justificativaGestorAtividade,
      justificativaGestorAceitaPor: sessao.userId,
    });

    await reavaliarStatusPosJustificativas(tipo, pedidoId);
    revalidatePath(`/pedidos/${pedido.viagemId}`);
    revalidatePath("/pedidos");
  });
}

/** Só diária tem deliberação de limite (Art. 15/16) — hospedagem e passagem aérea não. */
export async function anexarComprovanteLimiteAction(
  pedidoId: string,
  formData: FormData,
): Promise<ResultadoAction> {
  return comTratamentoDeErro(async () => {
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

    await criarAnexo("DIARIA", pedidoId, {
      tipo: "AUTORIZACAO_LIMITE",
      nomeArquivo: arquivoLido.nomeArquivo,
      // ArrayBuffer vs. ArrayBufferLike: mesma divergência de versão de tipos
      // do @types/node explicada em lib/storage.ts; em runtime é um Uint8Array normal.
      conteudo: arquivoLido.conteudo as never,
    });

    revalidatePath(`/pedidos/${pedido.viagemId}`);
  });
}

export async function deferirLimiteAction(pedidoId: string): Promise<ResultadoAction> {
  return comTratamentoDeErro(async () => {
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
  });
}

export async function deferirPedidoAction(tipo: TipoPedido, pedidoId: string): Promise<ResultadoAction> {
  return comTratamentoDeErro(async () => {
    const sessao = await exigirAdmin();
    const pedido = await buscarPedido(tipo, pedidoId);

    if (pedido.status === "AGUARDANDO_PROCESSO_SEI" || !pedido.viagem.numeroProcessoSei) {
      throw new Error(
        "A unidade demandante ainda não vinculou o Número do Processo SEI aberto e encaminhado ao Setor de Diárias, Passagens e Hospedagens.",
      );
    }

    if (pedido.status !== "AGUARDANDO_DEFERIMENTO") {
      throw new Error("Este pedido não está aguardando deferimento.");
    }

    if (exigeValorCotado(tipo) && "valorTotalCentavos" in pedido && pedido.valorTotalCentavos == null) {
      throw new Error("Informe o valor cotado (fora do sistema) antes de deferir este pedido.");
    }

    await prisma.$transaction([
      atualizarStatus(tipo, pedidoId, "DEFERIDO"),
      criarAprovacao(tipo, pedidoId, sessao.userId, "DEFERIDO"),
    ]);

    revalidatePath(`/pedidos/${pedido.viagemId}`);
    revalidatePath("/pedidos");
  });
}

export async function indeferirPedidoAction(
  tipo: TipoPedido,
  pedidoId: string,
  formData: FormData,
): Promise<ResultadoAction> {
  return comTratamentoDeErro(async () => {
    const sessao = await exigirAdmin();
    const pedido = await buscarPedido(tipo, pedidoId);
    const motivo = String(formData.get("motivo") ?? "").trim();

    if (!motivo) {
      throw new Error("Informe o motivo do indeferimento.");
    }

    await prisma.$transaction([
      atualizarStatus(tipo, pedidoId, "INDEFERIDO"),
      criarAprovacao(tipo, pedidoId, sessao.userId, "INDEFERIDO", motivo),
    ]);

    revalidatePath(`/pedidos/${pedido.viagemId}`);
    revalidatePath("/pedidos");
  });
}

export async function enviarRelatorioViagemAction(
  tipo: TipoPedido,
  pedidoId: string,
  formData: FormData,
): Promise<ResultadoAction> {
  return comTratamentoDeErro(async () => {
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

    await prisma.$transaction([
      criarAnexo(tipo, pedidoId, {
        tipo: "RELATORIO_VIAGEM",
        nomeArquivo: arquivoLido.nomeArquivo,
        conteudo: arquivoLido.conteudo as never,
      }),
      atualizarCampos(tipo, pedidoId, { relatorioEnviadoEm: new Date() }),
    ]);

    revalidatePath(`/pedidos/${pedido.viagemId}`);
    revalidatePath("/pedidos");
  });
}

export async function regularizarPendenciaAction(
  tipo: TipoPedido,
  pedidoId: string,
): Promise<ResultadoAction> {
  return comTratamentoDeErro(async () => {
    const sessao = await exigirAdmin();
    const pedido = await buscarPedido(tipo, pedidoId);

    await atualizarCampos(tipo, pedidoId, {
      pendenciaRegularizadaEm: new Date(),
      pendenciaRegularizadaPor: sessao.userId,
    });

    revalidatePath(`/pedidos/${pedido.viagemId}`);
    revalidatePath("/pedidos");
  });
}

export async function confirmarDevolucaoDiariaAction(
  pedidoId: string,
  formData: FormData,
): Promise<ResultadoAction> {
  return comTratamentoDeErro(async () => {
    const { pedido, sessao } = await verificarAcessoPedido("DIARIA", pedidoId);

    const arquivo = formData.get("arquivo");
    if (!(arquivo instanceof File) || arquivo.size === 0) {
      throw new Error("Selecione o comprovante de recolhimento/devolução (PDF).");
    }
    if (arquivo.type !== "application/pdf") {
      throw new Error("O comprovante de devolução deve ser um arquivo PDF.");
    }

    const arquivoLido = await lerArquivoEnviado(arquivo);

    await prisma.$transaction([
      prisma.anexo.create({
        data: {
          pedidoDiariaId: pedidoId,
          tipo: "COMPROVANTE_DEVOLUCAO_DIARIA",
          nomeArquivo: arquivoLido.nomeArquivo,
          conteudo: arquivoLido.conteudo as never,
        },
      }),
      prisma.pedidoDiaria.update({
        where: { id: pedidoId },
        data: {
          devolucaoConfirmadaEm: new Date(),
          devolucaoConfirmadaPor: sessao.userId,
        },
      }),
      prisma.aprovacao.create({
        data: {
          pedidoDiariaId: pedidoId,
          aprovadorId: sessao.userId,
          decisao: "COMPROVANTE DE DEVOLUÇÃO AO ERÁRIO ENVIADO",
          motivo: `Comprovante de devolução (${arquivoLido.nomeArquivo}) anexado com sucesso.`,
        },
      }),
    ]);

    revalidatePath(`/pedidos/${pedido.viagemId}`);
    revalidatePath("/pedidos");
  });
}


export async function salvarRelatorioViagemEstruturadoAction(
  viagemId: string,
  formData: FormData,
): Promise<ResultadoAction> {
  return comTratamentoDeErro(async () => {
    const sessao = await exigirSessao();

    const viagem = await prisma.viagem.findUnique({
      where: { id: viagemId },
      include: {
        pedidosDiaria: true,
        pedidosPassagemAerea: true,
        pedidosHospedagem: true,
      },
    });

    if (!viagem) throw new Error("Solicitação de viagem não encontrada.");
    if (sessao.perfil !== "ADMIN" && viagem.unidadeSolicitanteId !== sessao.unidadeId) {
      throw new Error("Acesso negado.");
    }

    const relatorioBaseLegal =
      String(formData.get("relatorioBaseLegal") ?? "DECRETO_29444_2020").trim() ||
      "DECRETO_29444_2020";
    const relatorioDescricaoAtividades =
      String(formData.get("relatorioDescricaoAtividades") ?? "").trim() || null;
    const relatorioResultado =
      String(formData.get("relatorioResultado") ?? "TOTALMENTE_ATINGIDO").trim() ||
      "TOTALMENTE_ATINGIDO";
    const relatorioJustificativaResultado =
      String(formData.get("relatorioJustificativaResultado") ?? "").trim() || null;
    const relatorioJustificativaRetornoAntecipado =
      String(formData.get("relatorioJustificativaRetornoAntecipado") ?? "").trim() || null;
    const relatorioAnexosDescricao =
      String(formData.get("relatorioAnexosDescricao") ?? "").trim() || null;
    const concluirPrestacaoContas = formData.get("concluirPrestacaoContas") === "on";

    const agora = new Date();

    for (const pd of viagem.pedidosDiaria) {
      await prisma.pedidoDiaria.update({
        where: { id: pd.id },
        data: {
          relatorioBaseLegal,
          relatorioDescricaoAtividades,
          relatorioResultado,
          relatorioJustificativaResultado,
          relatorioJustificativaRetornoAntecipado,
          relatorioAnexosDescricao,
          ...(concluirPrestacaoContas && pd.status === "DEFERIDO" && !pd.relatorioEnviadoEm
            ? { relatorioEnviadoEm: agora }
            : {}),
        },
      });
    }

    for (const pp of viagem.pedidosPassagemAerea) {
      await prisma.pedidoPassagemAerea.update({
        where: { id: pp.id },
        data: {
          relatorioDescricaoAtividades,
          relatorioResultado,
          ...(concluirPrestacaoContas && pp.status === "DEFERIDO" && !pp.relatorioEnviadoEm
            ? { relatorioEnviadoEm: agora }
            : {}),
        },
      });
    }

    for (const ph of viagem.pedidosHospedagem) {
      await prisma.pedidoHospedagem.update({
        where: { id: ph.id },
        data: {
          relatorioDescricaoAtividades,
          relatorioResultado,
          ...(concluirPrestacaoContas && ph.status === "DEFERIDO" && !ph.relatorioEnviadoEm
            ? { relatorioEnviadoEm: agora }
            : {}),
        },
      });
    }

    if (concluirPrestacaoContas) {
      const { carregarDadosCompletosViagemSdhp } = await import(
        "@/lib/templates/carregar-dados-viagem"
      );
      const { gerarRelatorioViagemPdf } = await import("@/lib/templates/documentos-sdhp");
      const dadosCompletos = await carregarDadosCompletosViagemSdhp(viagemId);
      if (dadosCompletos) {
        const pdfBuf = gerarRelatorioViagemPdf(dadosCompletos);
        const nomeRel = `Relatorio_Viagem_Oficial_SDHP_${viagemId.slice(-6)}.pdf`;
        for (const pd of viagem.pedidosDiaria) {
          if (pd.status === "DEFERIDO") {
            await prisma.anexo.create({
              data: {
                pedidoDiariaId: pd.id,
                tipo: "RELATORIO_VIAGEM",
                nomeArquivo: nomeRel,
                conteudo: new Uint8Array(pdfBuf) as never,
              },
            });
          }
        }
        for (const pp of viagem.pedidosPassagemAerea) {
          if (pp.status === "DEFERIDO") {
            await prisma.anexo.create({
              data: {
                pedidoPassagemAereaId: pp.id,
                tipo: "RELATORIO_VIAGEM",
                nomeArquivo: nomeRel,
                conteudo: new Uint8Array(pdfBuf) as never,
              },
            });
          }
        }
        for (const ph of viagem.pedidosHospedagem) {
          if (ph.status === "DEFERIDO") {
            await prisma.anexo.create({
              data: {
                pedidoHospedagemId: ph.id,
                tipo: "RELATORIO_VIAGEM",
                nomeArquivo: nomeRel,
                conteudo: new Uint8Array(pdfBuf) as never,
              },
            });
          }
        }
      }
    }

    revalidatePath(`/pedidos/${viagemId}`);
    revalidatePath("/pedidos");
  });
}

export async function atualizarChecklistPopSdhpAction(
  viagemId: string,
  formData: FormData,
): Promise<ResultadoAction> {
  return comTratamentoDeErro(async () => {
    await exigirAdmin();

    const viagem = await prisma.viagem.findUnique({
      where: { id: viagemId },
      include: {
        pedidosDiaria: true,
        pedidosPassagemAerea: true,
        pedidosHospedagem: true,
      },
    });
    if (!viagem) throw new Error("Solicitação de viagem não encontrada.");

    const jouernPublicado = formData.get("jouernPublicado") === "on";
    const jouernEdicao = String(formData.get("jouernEdicao") ?? "").trim() || null;
    const esocialCadastrado = formData.get("esocialCadastrado") === "on";
    const sigefPrestacaoContas = formData.get("sigefPrestacaoContas") === "on";
    const obtvTransferegovNumero =
      String(formData.get("obtvTransferegovNumero") ?? "").trim() || null;
    const ordemServicoPassagem =
      String(formData.get("ordemServicoPassagem") ?? "").trim() || null;
    const bilheteLocalizador = String(formData.get("bilheteLocalizador") ?? "").trim() || null;
    const ordemServicoHospedagem =
      String(formData.get("ordemServicoHospedagem") ?? "").trim() || null;

    for (const pd of viagem.pedidosDiaria) {
      await prisma.pedidoDiaria.update({
        where: { id: pd.id },
        data: {
          jouernPublicadoEm: jouernPublicado ? pd.jouernPublicadoEm ?? new Date() : null,
          jouernEdicao,
          esocialCadastradoEm: esocialCadastrado ? pd.esocialCadastradoEm ?? new Date() : null,
          sigefPrestacaoContasEm: sigefPrestacaoContas
            ? pd.sigefPrestacaoContasEm ?? new Date()
            : null,
          obtvTransferegovNumero,
        },
      });
    }

    for (const pp of viagem.pedidosPassagemAerea) {
      await prisma.pedidoPassagemAerea.update({
        where: { id: pp.id },
        data: {
          ordemServicoNumero: ordemServicoPassagem,
          bilheteLocalizador,
        },
      });
    }

    for (const ph of viagem.pedidosHospedagem) {
      await prisma.pedidoHospedagem.update({
        where: { id: ph.id },
        data: {
          ordemServicoNumero: ordemServicoHospedagem,
        },
      });
    }

    revalidatePath(`/pedidos/${viagemId}`);
  });
}
