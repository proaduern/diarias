"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAdmin, exigirSessao } from "@/lib/auth";
import { calcularDiarias } from "@/lib/diaria-calculo";
import { avaliarPrazo } from "@/lib/prazo";
import { avaliarLimites } from "@/lib/limites";
import { avaliarHorarioAtividade } from "@/lib/atividades";
import { avaliarPrestacaoContas, temPendenciaBloqueante } from "@/lib/prestacao-contas";
import { lerArquivoEnviado } from "@/lib/storage";
import type { StatusPedido } from "@prisma/client";

export interface CriarPedidoState {
  erro?: string;
}

interface AtividadeEntrada {
  enquadramentoId: string;
  descricao: string;
  detalhamento: string | null;
  dataHoraInicio: Date;
  dataHoraFim: Date;
  anexo: File | null;
}

/** Lê as N linhas de atividade enviadas como `atividades[i][campo]` no FormData. */
function parseAtividades(formData: FormData): AtividadeEntrada[] | { erro: string } {
  const quantidade = Number(formData.get("quantidadeAtividades") ?? 0);
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    return { erro: "Informe ao menos uma atividade vinculada à viagem." };
  }

  const atividades: AtividadeEntrada[] = [];
  for (let i = 0; i < quantidade; i++) {
    const enquadramentoId = String(formData.get(`atividades[${i}][enquadramentoId]`) ?? "");
    const descricao = String(formData.get(`atividades[${i}][descricao]`) ?? "").trim();
    const detalhamento =
      String(formData.get(`atividades[${i}][detalhamento]`) ?? "").trim() || null;
    const dataHoraInicio = parseDataHora(formData.get(`atividades[${i}][dataHoraInicio]`));
    const dataHoraFim = parseDataHora(formData.get(`atividades[${i}][dataHoraFim]`));
    const anexoBruto = formData.get(`atividades[${i}][anexo]`);
    const anexo = anexoBruto instanceof File && anexoBruto.size > 0 ? anexoBruto : null;

    if (!enquadramentoId || !descricao || !dataHoraInicio || !dataHoraFim) {
      return { erro: `Preencha todos os campos obrigatórios da atividade ${i + 1}.` };
    }
    if (dataHoraInicio > dataHoraFim) {
      return {
        erro: `Na atividade ${i + 1}, o início não pode ser depois do fim.`,
      };
    }

    atividades.push({ enquadramentoId, descricao, detalhamento, dataHoraInicio, dataHoraFim, anexo });
  }

  return atividades;
}

async function obterConfiguracao() {
  const config = await prisma.configuracaoSistema.findUnique({ where: { id: 1 } });
  if (!config) {
    throw new Error("Configuração do sistema não encontrada. Rode o seed.");
  }
  return config;
}

function parseDataHora(valor: FormDataEntryValue | null): Date | null {
  if (!valor || typeof valor !== "string") return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

export async function criarPedidoAction(
  _prevState: CriarPedidoState,
  formData: FormData,
): Promise<CriarPedidoState> {
  const sessao = await exigirSessao();
  const config = await obterConfiguracao();

  const beneficiarioId = String(formData.get("beneficiarioId") ?? "");
  const tipoDestinoId = String(formData.get("tipoDestinoId") ?? "");
  const municipioDestino = String(formData.get("municipioDestino") ?? "").trim();
  const finalidade = String(formData.get("finalidade") ?? "").trim();
  const kmDeclarado = Number(formData.get("kmDeclarado") ?? "");
  const justificativaPrazoCurto =
    String(formData.get("justificativaPrazoCurto") ?? "").trim() || null;
  const cienciaPrazoAtividade = formData.get("cienciaPrazoAtividade") === "on";

  const unidadeSolicitanteId =
    sessao.perfil === "ADMIN"
      ? String(formData.get("unidadeSolicitanteId") ?? "")
      : sessao.unidadeId;

  const saidaSede = parseDataHora(formData.get("saidaSede"));
  const chegadaDestino = parseDataHora(formData.get("chegadaDestino"));
  const saidaDestino = parseDataHora(formData.get("saidaDestino"));
  const chegadaSede = parseDataHora(formData.get("chegadaSede"));

  if (
    !beneficiarioId ||
    !tipoDestinoId ||
    !municipioDestino ||
    !finalidade ||
    !unidadeSolicitanteId ||
    !Number.isFinite(kmDeclarado) ||
    kmDeclarado < 0 ||
    !saidaSede ||
    !chegadaDestino ||
    !saidaDestino ||
    !chegadaSede
  ) {
    return { erro: "Preencha todos os campos obrigatórios corretamente." };
  }

  if (
    !(saidaSede <= chegadaDestino) ||
    !(chegadaDestino <= saidaDestino) ||
    !(saidaDestino <= chegadaSede)
  ) {
    return {
      erro:
        "As datas/horas precisam seguir a ordem: saída da sede ≤ chegada ao destino ≤ saída do destino ≤ chegada à sede.",
    };
  }

  // --- Programação de atividades e horário crítica ---
  const atividadesOuErro = parseAtividades(formData);
  if ("erro" in atividadesOuErro) {
    return atividadesOuErro;
  }
  const atividadesEntrada = atividadesOuErro;

  const enquadramentos = await prisma.enquadramentoAtividade.findMany({
    where: { id: { in: atividadesEntrada.map((a) => a.enquadramentoId) } },
  });
  const enquadramentoPorId = new Map(enquadramentos.map((e) => [e.id, e]));

  for (let i = 0; i < atividadesEntrada.length; i++) {
    const a = atividadesEntrada[i];
    const enquadramento = enquadramentoPorId.get(a.enquadramentoId);
    if (!enquadramento || !enquadramento.ativo) {
      return { erro: `O enquadramento selecionado na atividade ${i + 1} não é válido.` };
    }
    if (enquadramento.exigeDetalhamento && !a.detalhamento) {
      return {
        erro: `A atividade ${i + 1} (${enquadramento.nome}) exige detalhamento.`,
      };
    }
    if (enquadramento.exigeAnexo && !a.anexo) {
      return {
        erro: `A atividade ${i + 1} (${enquadramento.nome}) exige um anexo.`,
      };
    }
  }

  const situacaoAtividade = avaliarHorarioAtividade(
    { chegadaDestino, saidaDestino },
    atividadesEntrada,
  );

  if (situacaoAtividade.situacao === "BLOQUEADO_CHEGADA_APOS_INICIO") {
    return {
      erro:
        "A chegada ao destino não pode ser depois do início da atividade mais cedo. Ajuste a chegada ou a data/hora de início da atividade.",
    };
  }
  if (situacaoAtividade.situacao === "BLOQUEADO_SAIDA_ANTES_FIM") {
    return {
      erro:
        "A saída do destino não pode ser antes do fim da atividade mais tarde. Ajuste a saída ou a data/hora de fim da atividade.",
    };
  }
  if (situacaoAtividade.situacao === "REQUER_JUSTIFICATIVA_FOLGA" && !cienciaPrazoAtividade) {
    return {
      erro:
        "A viagem inclui tempo além do estritamente necessário para as atividades (chegada adiantada e/ou saída atrasada). Marque a ciência de que a diária/hospedagem só cobre o período estrito da atividade para prosseguir; o gestor da unidade precisará justificar/autorizar em seguida.",
    };
  }

  const beneficiario = await prisma.beneficiario.findUnique({
    where: { id: beneficiarioId },
    include: { categoria: true },
  });

  if (!beneficiario || !beneficiario.ativo) {
    return { erro: "Beneficiário não encontrado ou inativo." };
  }

  // --- Prestação de contas: pendências bloqueantes de pedidos anteriores ---
  const pedidosDeferidosSemRelatorio = await prisma.pedidoDiaria.findMany({
    where: {
      beneficiarioId: beneficiario.id,
      status: "DEFERIDO",
      relatorioEnviadoEm: null,
      pendenciaRegularizadaEm: null,
    },
  });

  for (const pedido of pedidosDeferidosSemRelatorio) {
    const situacao = avaliarPrestacaoContas(
      { chegadaSede: pedido.chegadaSede, relatorioEnviadoEm: null },
      new Date(),
      config.prazoRelatorioDiasUteis,
      config.prazoDevolucaoDiasCorridos,
    );
    if (temPendenciaBloqueante(situacao)) {
      return {
        erro:
          "Este beneficiário tem pendência de prestação de contas (relatório de viagem em atraso ou devolução de valores pendente) em um pedido anterior. Não é possível lançar novo pedido até a pendência ser regularizada.",
      };
    }
  }

  // --- Prazo ---
  const situacaoPrazo = avaliarPrazo(
    new Date(),
    saidaSede,
    config.prazoMinimoDiasAntecedencia,
  );

  if (situacaoPrazo.situacao === "BLOQUEADO_RETROATIVO") {
    return {
      erro:
        "Não é possível lançar um pedido de diária para uma viagem que já começou ou já ocorreu.",
    };
  }

  if (situacaoPrazo.situacao === "REQUER_JUSTIFICATIVA" && !justificativaPrazoCurto) {
    return {
      erro: `O prazo mínimo de antecedência configurado é de ${config.prazoMinimoDiasAntecedencia} dia(s). Como este pedido está sendo lançado com menos antecedência, é obrigatório informar uma justificativa.`,
    };
  }

  // --- Cálculo de diárias ---
  const resultado = calcularDiarias(
    { saidaSede, chegadaDestino, saidaDestino, chegadaSede, kmDeclarado },
    {
      kmMinimoSemPernoite: config.kmMinimoSemPernoite,
      duracaoMinimaHoras: config.duracaoMinimaHoras,
    },
  );

  if (resultado.diarias === 0) {
    const motivo =
      resultado.motivoZero === "DURACAO_MINIMA"
        ? `a duração total do afastamento é inferior a ${config.duracaoMinimaHoras} horas (Art. 17, III do Decreto 29.444/2020)`
        : `o deslocamento é inferior a ${config.kmMinimoSemPernoite} km da sede e não há pernoite (Art. 17, I do Decreto 29.444/2020)`;
    return {
      erro: `Esta viagem não faz jus a diária: ${motivo}.`,
    };
  }

  const valorDiaria = await prisma.valorDiaria.findUnique({
    where: {
      categoriaId_tipoDestinoId: {
        categoriaId: beneficiario.categoriaId,
        tipoDestinoId,
      },
    },
  });

  if (!valorDiaria) {
    return {
      erro:
        "Não há valor de diária cadastrado para a categoria deste beneficiário e o tipo de destino selecionado. Peça ao administrador para cadastrar esse valor.",
    };
  }

  const valorTotalCentavos = Math.round(resultado.diarias * valorDiaria.valorCentavos);

  // --- Limites mensal/anual (Art. 15 e 16), contados por CPF, todas as unidades ---
  const pedidosExistentes = await prisma.pedidoDiaria.findMany({
    where: {
      beneficiarioId: beneficiario.id,
      status: { not: "INDEFERIDO" },
      diarias: { not: null },
    },
    select: { diarias: true, saidaSede: true },
  });

  const situacaoLimite = avaliarLimites(
    { diarias: resultado.diarias, saidaSede },
    pedidosExistentes.map((p) => ({
      diarias: Number(p.diarias),
      saidaSede: p.saidaSede,
    })),
    config.limiteMensalDiarias,
    beneficiario.categoria.limiteAnualDias,
  );

  let status: StatusPedido;
  if (situacaoPrazo.situacao === "REQUER_JUSTIFICATIVA") {
    status = "AGUARDANDO_JUSTIFICATIVA_PRAZO";
  } else if (situacaoAtividade.situacao === "REQUER_JUSTIFICATIVA_FOLGA") {
    status = "AGUARDANDO_JUSTIFICATIVA_ATIVIDADE";
  } else if (situacaoLimite.situacao !== "DENTRO_DO_LIMITE") {
    status = "AGUARDANDO_DELIBERACAO_LIMITE";
  } else {
    status = "AGUARDANDO_DEFERIMENTO";
  }

  // Lê os anexos de atividade (I/O) antes de abrir a transação com o banco.
  const anexosLidos = await Promise.all(
    atividadesEntrada.map((a) => (a.anexo ? lerArquivoEnviado(a.anexo) : null)),
  );

  const pedido = await prisma.$transaction(async (tx) => {
    const pedidoCriado = await tx.pedidoDiaria.create({
      data: {
        beneficiarioId: beneficiario.id,
        unidadeSolicitanteId,
        tipoDestinoId,
        municipioDestino,
        finalidade,
        kmDeclarado,
        saidaSede,
        chegadaDestino,
        saidaDestino,
        chegadaSede,
        noites: resultado.noites,
        ultimaNoiteQualifica: resultado.ultimaNoiteQualifica,
        diarias: resultado.diarias,
        valorUnitarioCentavos: valorDiaria.valorCentavos,
        valorTotalCentavos,
        status,
        justificativaPrazoCurto,
        cienciaPrazoAtividade,
        criadoPorId: sessao.userId,
      },
    });

    for (let i = 0; i < atividadesEntrada.length; i++) {
      const a = atividadesEntrada[i];
      const atividadeCriada = await tx.atividade.create({
        data: {
          pedidoId: pedidoCriado.id,
          enquadramentoId: a.enquadramentoId,
          descricao: a.descricao,
          detalhamento: a.detalhamento,
          dataHoraInicio: a.dataHoraInicio,
          dataHoraFim: a.dataHoraFim,
        },
      });

      const arquivoLido = anexosLidos[i];
      if (arquivoLido) {
        await tx.anexo.create({
          data: {
            pedidoId: pedidoCriado.id,
            atividadeId: atividadeCriada.id,
            tipo: "COMPROVANTE_ATIVIDADE",
            nomeArquivo: arquivoLido.nomeArquivo,
            conteudo: arquivoLido.conteudo as never,
          },
        });
      }
    }

    return pedidoCriado;
  });

  revalidatePath("/pedidos");
  redirect(`/pedidos/${pedido.id}`);
}

async function verificarAcessoPedido(pedidoId: string) {
  const sessao = await exigirSessao();
  const pedido = await prisma.pedidoDiaria.findUnique({ where: { id: pedidoId } });
  if (!pedido) throw new Error("Pedido não encontrado.");

  if (sessao.perfil !== "ADMIN" && pedido.unidadeSolicitanteId !== sessao.unidadeId) {
    throw new Error("Você não tem acesso a este pedido.");
  }

  return { sessao, pedido };
}

/**
 * Re-avalia, em ordem, os "gates" que podem ainda estar pendentes depois que
 * uma justificativa (prazo ou atividade) acaba de ser aceita: folga de
 * atividade ainda sem justificativa do gestor -> limite mensal/anual -> OK.
 */
async function reavaliarStatusPosJustificativas(pedidoId: string) {
  const pedido = await prisma.pedidoDiaria.findUniqueOrThrow({
    where: { id: pedidoId },
    include: { beneficiario: { include: { categoria: true } }, atividades: true },
  });
  const config = await obterConfiguracao();

  if (!pedido.justificativaGestorAceitaPor) {
    const situacaoAtividade = avaliarHorarioAtividade(
      { chegadaDestino: pedido.chegadaDestino, saidaDestino: pedido.saidaDestino },
      pedido.atividades,
    );
    if (situacaoAtividade.situacao === "REQUER_JUSTIFICATIVA_FOLGA") {
      await prisma.pedidoDiaria.update({
        where: { id: pedidoId },
        data: { status: "AGUARDANDO_JUSTIFICATIVA_ATIVIDADE" },
      });
      return;
    }
  }

  const pedidosExistentes = await prisma.pedidoDiaria.findMany({
    where: {
      beneficiarioId: pedido.beneficiarioId,
      status: { not: "INDEFERIDO" },
      diarias: { not: null },
      id: { not: pedido.id },
    },
    select: { diarias: true, saidaSede: true },
  });

  const situacaoLimite = avaliarLimites(
    { diarias: Number(pedido.diarias), saidaSede: pedido.saidaSede },
    pedidosExistentes.map((p) => ({
      diarias: Number(p.diarias),
      saidaSede: p.saidaSede,
    })),
    config.limiteMensalDiarias,
    pedido.beneficiario.categoria.limiteAnualDias,
  );

  const novoStatus: StatusPedido =
    situacaoLimite.situacao === "DENTRO_DO_LIMITE"
      ? "AGUARDANDO_DEFERIMENTO"
      : "AGUARDANDO_DELIBERACAO_LIMITE";

  await prisma.pedidoDiaria.update({
    where: { id: pedidoId },
    data: { status: novoStatus },
  });
}

export async function aprovarJustificativaPrazoAction(pedidoId: string) {
  const sessao = await exigirAdmin();
  const pedido = await prisma.pedidoDiaria.findUniqueOrThrow({ where: { id: pedidoId } });

  if (pedido.status !== "AGUARDANDO_JUSTIFICATIVA_PRAZO") {
    throw new Error("Este pedido não está aguardando justificativa de prazo.");
  }

  await prisma.pedidoDiaria.update({
    where: { id: pedidoId },
    data: { justificativaPrazoAceitaPor: sessao.userId },
  });

  await reavaliarStatusPosJustificativas(pedidoId);
  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/pedidos");
}

/**
 * Aprovação, pelo admin (gestor da unidade), da folga entre a janela de
 * viagem e as atividades vinculadas — exige texto justificando que não há
 * prejuízo ao serviço e que os dias de ausência não vinculados à atividade
 * serão compensados conforme legislação/normas (não é um clique único como
 * a justificativa de prazo, pois quem escreve a justificativa aqui é o
 * gestor, não o demandante).
 */
export async function aprovarJustificativaAtividadeAction(pedidoId: string, formData: FormData) {
  const sessao = await exigirAdmin();
  const pedido = await prisma.pedidoDiaria.findUniqueOrThrow({ where: { id: pedidoId } });

  if (pedido.status !== "AGUARDANDO_JUSTIFICATIVA_ATIVIDADE") {
    throw new Error("Este pedido não está aguardando justificativa de atividade.");
  }

  const justificativaGestorAtividade = String(formData.get("justificativaGestorAtividade") ?? "").trim();
  if (!justificativaGestorAtividade) {
    throw new Error(
      "Informe a justificativa do gestor (sem prejuízo ao serviço e compensação dos dias de ausência).",
    );
  }

  await prisma.pedidoDiaria.update({
    where: { id: pedidoId },
    data: {
      justificativaGestorAtividade,
      justificativaGestorAceitaPor: sessao.userId,
    },
  });

  await reavaliarStatusPosJustificativas(pedidoId);
  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/pedidos");
}

export async function anexarComprovanteLimiteAction(
  pedidoId: string,
  formData: FormData,
) {
  const { pedido } = await verificarAcessoPedido(pedidoId);

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
      pedidoId,
      tipo: "AUTORIZACAO_LIMITE",
      nomeArquivo: arquivoLido.nomeArquivo,
      // ArrayBuffer vs. ArrayBufferLike: mesma divergência de versão de tipos
      // do @types/node explicada em lib/storage.ts; em runtime é um Uint8Array normal.
      conteudo: arquivoLido.conteudo as never,
    },
  });

  revalidatePath(`/pedidos/${pedidoId}`);
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
    throw new Error(
      "É necessário anexar o comprovante de autorização (Art. 15/16) antes de liberar este pedido.",
    );
  }

  await prisma.pedidoDiaria.update({
    where: { id: pedidoId },
    data: { status: "AGUARDANDO_DEFERIMENTO" },
  });

  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/pedidos");
}

export async function deferirPedidoAction(pedidoId: string) {
  const sessao = await exigirAdmin();
  const pedido = await prisma.pedidoDiaria.findUniqueOrThrow({ where: { id: pedidoId } });

  if (pedido.status !== "AGUARDANDO_DEFERIMENTO") {
    throw new Error("Este pedido não está aguardando deferimento.");
  }

  await prisma.$transaction([
    prisma.pedidoDiaria.update({
      where: { id: pedidoId },
      data: { status: "DEFERIDO" },
    }),
    prisma.aprovacao.create({
      data: { pedidoId, aprovadorId: sessao.userId, decisao: "DEFERIDO" },
    }),
  ]);

  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/pedidos");
}

export async function indeferirPedidoAction(pedidoId: string, formData: FormData) {
  const sessao = await exigirAdmin();
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!motivo) {
    throw new Error("Informe o motivo do indeferimento.");
  }

  await prisma.$transaction([
    prisma.pedidoDiaria.update({
      where: { id: pedidoId },
      data: { status: "INDEFERIDO" },
    }),
    prisma.aprovacao.create({
      data: { pedidoId, aprovadorId: sessao.userId, decisao: "INDEFERIDO", motivo },
    }),
  ]);

  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/pedidos");
}

export async function enviarRelatorioViagemAction(
  pedidoId: string,
  formData: FormData,
) {
  const { pedido } = await verificarAcessoPedido(pedidoId);

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
    prisma.anexo.create({
      data: {
        pedidoId,
        tipo: "RELATORIO_VIAGEM",
        nomeArquivo: arquivoLido.nomeArquivo,
        conteudo: arquivoLido.conteudo as never,
      },
    }),
    prisma.pedidoDiaria.update({
      where: { id: pedidoId },
      data: { relatorioEnviadoEm: new Date() },
    }),
  ]);

  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/pedidos");
}

export async function regularizarPendenciaAction(pedidoId: string) {
  const sessao = await exigirAdmin();
  await prisma.pedidoDiaria.update({
    where: { id: pedidoId },
    data: {
      pendenciaRegularizadaEm: new Date(),
      pendenciaRegularizadaPor: sessao.userId,
    },
  });
  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/pedidos");
}
