"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/auth";
import { calcularDiarias } from "@/lib/diaria-calculo";
import { avaliarPrazo } from "@/lib/prazo";
import { avaliarLimites } from "@/lib/limites";
import { avaliarHorarioAtividade } from "@/lib/atividades";
import { calcularTempoViagemAeroporto } from "@/lib/tempo-viagem";
import { avaliarPrestacaoContas, temPendenciaBloqueante } from "@/lib/prestacao-contas";
import { lerArquivoEnviado } from "@/lib/storage";
import type { StatusPedido } from "@prisma/client";

export interface CriarViagemState {
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

function parseDataHora(valor: FormDataEntryValue | null): Date | null {
  if (!valor || typeof valor !== "string") return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
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
      return { erro: `Na atividade ${i + 1}, o início não pode ser depois do fim.` };
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

/**
 * Status inicial comum a qualquer tipo de pedido gerado por uma viagem:
 * prazo curto -> folga de atividade -> (limite, só para diária) -> deferimento.
 * Compartilhado porque a situação de prazo/atividade é a mesma para todos os
 * tipos gerados a partir da mesma viagem.
 */
function statusInicialComum(
  situacaoPrazo: ReturnType<typeof avaliarPrazo>,
  situacaoAtividade: ReturnType<typeof avaliarHorarioAtividade>,
): StatusPedido | null {
  if (situacaoPrazo.situacao === "REQUER_JUSTIFICATIVA") return "AGUARDANDO_JUSTIFICATIVA_PRAZO";
  if (situacaoAtividade.situacao === "REQUER_JUSTIFICATIVA_FOLGA") {
    return "AGUARDANDO_JUSTIFICATIVA_ATIVIDADE";
  }
  return null;
}

export async function criarViagemComPedidosAction(
  _prevState: CriarViagemState,
  formData: FormData,
): Promise<CriarViagemState> {
  const sessao = await exigirSessao();
  let config: Awaited<ReturnType<typeof obterConfiguracao>>;
  try {
    config = await obterConfiguracao();
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro inesperado." };
  }

  // --- Tipos de pedido selecionados ---
  const querDiaria = formData.get("tipoDiaria") === "on";
  const querHospedagem = formData.get("tipoHospedagem") === "on";
  const querPassagemAerea = formData.get("tipoPassagemAerea") === "on";

  if (!querDiaria && !querHospedagem && !querPassagemAerea) {
    return { erro: "Selecione ao menos um tipo de pedido (diária, hospedagem ou passagem aérea)." };
  }
  if (querDiaria && querHospedagem) {
    return {
      erro:
        "Diária e hospedagem são mutuamente exclusivas na mesma viagem — a diária já cobre alimentação e hospedagem.",
    };
  }

  // --- Dados compartilhados da viagem ---
  const beneficiarioId = String(formData.get("beneficiarioId") ?? "");
  const tipoDestinoId = String(formData.get("tipoDestinoId") ?? "");
  const municipioDestino = String(formData.get("municipioDestino") ?? "").trim();
  const finalidade = String(formData.get("finalidade") ?? "").trim();
  const kmDeclarado = Number(formData.get("kmDeclarado") ?? "");
  const justificativaPrazoCurto =
    String(formData.get("justificativaPrazoCurto") ?? "").trim() || null;
  const cienciaPrazoAtividade = formData.get("cienciaPrazoAtividade") === "on";

  const sedeCidade = String(formData.get("sedeCidade") ?? "").trim();
  const sedeEstado = String(formData.get("sedeEstado") ?? "").trim().toUpperCase();
  const destinoEstado = String(formData.get("destinoEstado") ?? "").trim().toUpperCase();
  const vaiBuscarAeroporto = formData.get("vaiBuscarAeroporto") === "on";
  const kmSedeAeroporto = vaiBuscarAeroporto ? Number(formData.get("kmSedeAeroporto") ?? "") : null;
  const kmVoo = vaiBuscarAeroporto ? Number(formData.get("kmVoo") ?? "") : null;
  const kmAeroportoDestino = vaiBuscarAeroporto
    ? Number(formData.get("kmAeroportoDestino") ?? "")
    : null;

  const unidadeSolicitanteId =
    sessao.perfil === "ADMIN" ? String(formData.get("unidadeSolicitanteId") ?? "") : sessao.unidadeId;

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
    !chegadaSede ||
    !sedeCidade ||
    !sedeEstado ||
    !destinoEstado
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

  // --- Sede/destino/aeroporto ---
  let tempoViagemEstimadoMinutos: number | null = null;
  if (vaiBuscarAeroporto) {
    if (
      kmSedeAeroporto === null ||
      kmVoo === null ||
      kmAeroportoDestino === null ||
      !Number.isFinite(kmSedeAeroporto) ||
      !Number.isFinite(kmVoo) ||
      !Number.isFinite(kmAeroportoDestino) ||
      kmSedeAeroporto < 0 ||
      kmVoo < 0 ||
      kmAeroportoDestino < 0
    ) {
      return {
        erro:
          "Informe as três distâncias (sede–aeroporto, voo e aeroporto–destino) para calcular o tempo de viagem.",
      };
    }

    const situacaoViagem = calcularTempoViagemAeroporto({ kmSedeAeroporto, kmVoo, kmAeroportoDestino });
    if (situacaoViagem.situacao === "BLOQUEADO_VOO_DISTANCIA_MINIMA") {
      return {
        erro:
          "Voos com menos de 500 km não são permitidos — esse trecho deve ser feito por deslocamento terrestre.",
      };
    }
    tempoViagemEstimadoMinutos = situacaoViagem.minutosTotais;
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
      return { erro: `A atividade ${i + 1} (${enquadramento.nome}) exige detalhamento.` };
    }
    if (enquadramento.exigeAnexo && !a.anexo) {
      return { erro: `A atividade ${i + 1} (${enquadramento.nome}) exige um anexo.` };
    }
  }

  const situacaoAtividade = avaliarHorarioAtividade({ chegadaDestino, saidaDestino }, atividadesEntrada);

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

  if (querHospedagem && !beneficiario.categoria.elegivelHospedagem) {
    return {
      erro: `A categoria do beneficiário (${beneficiario.categoria.nome}) não é elegível para hospedagem.`,
    };
  }

  // --- Contrato (obrigatório para hospedagem e passagem aérea) ---
  const contratoHospedagemId = querHospedagem ? String(formData.get("contratoHospedagemId") ?? "") : null;
  const contratoPassagemAereaId = querPassagemAerea
    ? String(formData.get("contratoPassagemAereaId") ?? "")
    : null;

  async function validarContrato(contratoId: string, tipo: "HOSPEDAGEM" | "PASSAGEM_AEREA", rotulo: string) {
    if (!contratoId) {
      return `Selecione o contrato que vai custear a ${rotulo}.`;
    }
    const contrato = await prisma.contrato.findUnique({ where: { id: contratoId } });
    if (!contrato || contrato.tipoBeneficio !== tipo) {
      return `Contrato de ${rotulo} inválido.`;
    }
    if (!contrato.ativo) {
      return `O contrato selecionado para ${rotulo} não está mais ativo.`;
    }
    if (saidaSede! < contrato.vigenciaInicio || saidaSede! > contrato.vigenciaFim) {
      return `O contrato selecionado para ${rotulo} não está vigente na data da viagem.`;
    }
    return null;
  }

  if (querHospedagem) {
    const erroContrato = await validarContrato(contratoHospedagemId!, "HOSPEDAGEM", "hospedagem");
    if (erroContrato) return { erro: erroContrato };
  }
  if (querPassagemAerea) {
    const erroContrato = await validarContrato(contratoPassagemAereaId!, "PASSAGEM_AEREA", "passagem aérea");
    if (erroContrato) return { erro: erroContrato };
  }

  // --- Prestação de contas: pendências bloqueantes de pedidos anteriores (qualquer tipo) ---
  const pendenciaWhere = {
    viagem: { beneficiarioId: beneficiario.id },
    status: "DEFERIDO" as const,
    relatorioEnviadoEm: null,
    pendenciaRegularizadaEm: null,
  };
  const [diariasDeferidasSemRelatorio, hospedagensDeferidasSemRelatorio, passagensDeferidasSemRelatorio] =
    await Promise.all([
      prisma.pedidoDiaria.findMany({ where: pendenciaWhere, include: { viagem: true } }),
      prisma.pedidoHospedagem.findMany({ where: pendenciaWhere, include: { viagem: true } }),
      prisma.pedidoPassagemAerea.findMany({ where: pendenciaWhere, include: { viagem: true } }),
    ]);

  for (const pedido of [
    ...diariasDeferidasSemRelatorio,
    ...hospedagensDeferidasSemRelatorio,
    ...passagensDeferidasSemRelatorio,
  ]) {
    const situacao = avaliarPrestacaoContas(
      { chegadaSede: pedido.viagem.chegadaSede, relatorioEnviadoEm: null },
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
  const situacaoPrazo = avaliarPrazo(new Date(), saidaSede, config.prazoMinimoDiasAntecedencia);

  if (situacaoPrazo.situacao === "BLOQUEADO_RETROATIVO") {
    return { erro: "Não é possível lançar um pedido para uma viagem que já começou ou já ocorreu." };
  }
  if (situacaoPrazo.situacao === "REQUER_JUSTIFICATIVA" && !justificativaPrazoCurto) {
    return {
      erro: `O prazo mínimo de antecedência configurado é de ${config.prazoMinimoDiasAntecedencia} dia(s). Como este pedido está sendo lançado com menos antecedência, é obrigatório informar uma justificativa.`,
    };
  }

  // --- Cálculo de diárias (só se o tipo Diária foi marcado) ---
  let resultadoDiaria: ReturnType<typeof calcularDiarias> | null = null;
  let valorDiariaUnitario: number | null = null;
  let valorDiariaTotal: number | null = null;
  let situacaoLimite: ReturnType<typeof avaliarLimites> | null = null;

  if (querDiaria) {
    resultadoDiaria = calcularDiarias(
      { saidaSede, chegadaDestino, saidaDestino, chegadaSede, kmDeclarado },
      { kmMinimoSemPernoite: config.kmMinimoSemPernoite, duracaoMinimaHoras: config.duracaoMinimaHoras },
    );

    if (resultadoDiaria.diarias === 0) {
      const motivo =
        resultadoDiaria.motivoZero === "DURACAO_MINIMA"
          ? `a duração total do afastamento é inferior a ${config.duracaoMinimaHoras} horas (Art. 17, III do Decreto 29.444/2020)`
          : `o deslocamento é inferior a ${config.kmMinimoSemPernoite} km da sede e não há pernoite (Art. 17, I do Decreto 29.444/2020)`;
      return { erro: `Esta viagem não faz jus a diária: ${motivo}.` };
    }

    const valorDiaria = await prisma.valorDiaria.findUnique({
      where: { categoriaId_tipoDestinoId: { categoriaId: beneficiario.categoriaId, tipoDestinoId } },
    });
    if (!valorDiaria) {
      return {
        erro:
          "Não há valor de diária cadastrado para a categoria deste beneficiário e o tipo de destino selecionado. Peça ao administrador para cadastrar esse valor.",
      };
    }
    valorDiariaUnitario = valorDiaria.valorCentavos;
    valorDiariaTotal = Math.round(resultadoDiaria.diarias * valorDiaria.valorCentavos);

    const pedidosExistentes = await prisma.pedidoDiaria.findMany({
      where: { viagem: { beneficiarioId: beneficiario.id }, status: { not: "INDEFERIDO" }, diarias: { not: null } },
      select: { diarias: true, viagem: { select: { saidaSede: true } } },
    });

    situacaoLimite = avaliarLimites(
      { diarias: resultadoDiaria.diarias, saidaSede },
      pedidosExistentes.map((p) => ({ diarias: Number(p.diarias), saidaSede: p.viagem.saidaSede })),
      config.limiteMensalDiarias,
      beneficiario.categoria.limiteAnualDias,
    );
  }

  // --- Lê os anexos de atividade (I/O) antes de abrir a transação com o banco ---
  const anexosLidos = await Promise.all(
    atividadesEntrada.map((a) => (a.anexo ? lerArquivoEnviado(a.anexo) : null)),
  );

  // --- Dados opcionais de Processo SEI (caso o demandante já tenha aberto o processo antes) ---
  const numeroProcessoSeiInput = String(formData.get("numeroProcessoSei") ?? "").trim() || null;
  const idDocumentoSeiInput = String(formData.get("idDocumentoSei") ?? "").trim() || null;
  const confirmouEnvioSei = formData.get("confirmouEnvioSei") === "on";

  if (numeroProcessoSeiInput) {
    const apenasDigitos = numeroProcessoSeiInput.replace(/\D/g, "");
    if (apenasDigitos.length < 8) {
      return {
        erro: "Informe um número de Processo SEI válido (ex.: 04410001.001234/2026-55).",
      };
    }
    if (!confirmouEnvioSei) {
      return {
        erro: "Para concluir a demanda já informando o Processo SEI, marque a confirmação de que o processo foi aberto e encaminhado ao Setor de Diárias, Passagens e Hospedagens.",
      };
    }
  }

  const temProcessoSeiVinculado = Boolean(numeroProcessoSeiInput && confirmouEnvioSei);
  const statusComum = statusInicialComum(situacaoPrazo, situacaoAtividade);

  const viagem = await prisma.$transaction(async (tx) => {
    const viagemCriada = await tx.viagem.create({
      data: {
        beneficiarioId: beneficiario.id,
        unidadeSolicitanteId,
        finalidade,
        municipioDestino,
        kmDeclarado,
        sedeCidade,
        sedeEstado,
        destinoEstado,
        vaiBuscarAeroporto,
        kmSedeAeroporto,
        kmVoo,
        kmAeroportoDestino,
        tempoViagemEstimadoMinutos,
        saidaSede,
        chegadaDestino,
        saidaDestino,
        chegadaSede,
        numeroProcessoSei: temProcessoSeiVinculado ? numeroProcessoSeiInput : null,
        idDocumentoSei: temProcessoSeiVinculado ? idDocumentoSeiInput : null,
        processoSeiVinculadoEm: temProcessoSeiVinculado ? new Date() : null,
        criadoPorId: sessao.userId,
      },
    });

    for (let i = 0; i < atividadesEntrada.length; i++) {
      const a = atividadesEntrada[i];
      const atividadeCriada = await tx.atividade.create({
        data: {
          viagemId: viagemCriada.id,
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
            atividadeId: atividadeCriada.id,
            tipo: "COMPROVANTE_ATIVIDADE",
            nomeArquivo: arquivoLido.nomeArquivo,
            conteudo: arquivoLido.conteudo as never,
          },
        });
      }
    }

    if (querDiaria) {
      // SRE Concorrência: Re-avalia os limites dentro da transação atômica para blindagem contra TOCTOU
      const pedidosExistentesTx = await tx.pedidoDiaria.findMany({
        where: { viagem: { beneficiarioId: beneficiario.id }, status: { not: "INDEFERIDO" }, diarias: { not: null } },
        select: { diarias: true, viagem: { select: { saidaSede: true } } },
      });

      const situacaoLimiteTx = avaliarLimites(
        { diarias: resultadoDiaria!.diarias, saidaSede },
        pedidosExistentesTx.map((p) => ({ diarias: Number(p.diarias), saidaSede: p.viagem.saidaSede })),
        config.limiteMensalDiarias,
        beneficiario.categoria.limiteAnualDias,
      );

      const statusDiariaAtivo: StatusPedido =
        statusComum ?? (situacaoLimiteTx.situacao !== "DENTRO_DO_LIMITE" ? "AGUARDANDO_DELIBERACAO_LIMITE" : "AGUARDANDO_DEFERIMENTO");

      const statusDiaria: StatusPedido = temProcessoSeiVinculado ? statusDiariaAtivo : "AGUARDANDO_PROCESSO_SEI";

      await tx.pedidoDiaria.create({
        data: {
          viagemId: viagemCriada.id,
          tipoDestinoId,
          noites: resultadoDiaria!.noites,
          ultimaNoiteQualifica: resultadoDiaria!.ultimaNoiteQualifica,
          diarias: resultadoDiaria!.diarias,
          valorUnitarioCentavos: valorDiariaUnitario,
          valorTotalCentavos: valorDiariaTotal,
          status: statusDiaria,
          justificativaPrazoCurto,
          cienciaPrazoAtividade,
          numeroProcessoSei: temProcessoSeiVinculado ? numeroProcessoSeiInput : null,
          idPropostaConcessao: temProcessoSeiVinculado ? idDocumentoSeiInput : null,
        },
      });
    }

    if (querHospedagem) {
      const statusHospedagemAtivo: StatusPedido = statusComum ?? "AGUARDANDO_DEFERIMENTO";
      const statusHospedagem: StatusPedido = temProcessoSeiVinculado ? statusHospedagemAtivo : "AGUARDANDO_PROCESSO_SEI";

      await tx.pedidoHospedagem.create({
        data: {
          viagemId: viagemCriada.id,
          contratoId: contratoHospedagemId!,
          status: statusHospedagem,
          justificativaPrazoCurto,
          cienciaPrazoAtividade,
        },
      });
    }

    if (querPassagemAerea) {
      const statusPassagemAtivo: StatusPedido = statusComum ?? "AGUARDANDO_DEFERIMENTO";
      const statusPassagem: StatusPedido = temProcessoSeiVinculado ? statusPassagemAtivo : "AGUARDANDO_PROCESSO_SEI";

      await tx.pedidoPassagemAerea.create({
        data: {
          viagemId: viagemCriada.id,
          contratoId: contratoPassagemAereaId!,
          status: statusPassagem,
          justificativaPrazoCurto,
          cienciaPrazoAtividade,
        },
      });
    }

    return viagemCriada;
  });

  revalidatePath("/pedidos");
  revalidatePath("/");
  redirect(`/pedidos/${viagem.id}${temProcessoSeiVinculado ? "" : "?kitSei=1"}`);
}

export async function vincularProcessoSeiConcluirDemandaAction(
  viagemId: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  try {
    const sessao = await exigirSessao();
    const config = await obterConfiguracao();

    const numeroProcessoSei = String(formData.get("numeroProcessoSei") ?? "").trim();
    const idDocumentoSei = String(formData.get("idDocumentoSei") ?? "").trim() || null;
    const confirmouEnvioSei = formData.get("confirmouEnvioSei") === "on";

    if (!numeroProcessoSei || numeroProcessoSei.replace(/\D/g, "").length < 8) {
      return {
        ok: false,
        erro: "Informe o número completo do Processo SEI aberto na sua unidade (ex.: 04410001.001234/2026-55).",
      };
    }

    if (!confirmouEnvioSei) {
      return {
        ok: false,
        erro: "Confirme que os documentos da demanda foram inseridos no Processo SEI e encaminhados ao Setor de Diárias, Passagens e Hospedagens.",
      };
    }

    const viagem = await prisma.viagem.findUnique({
      where: { id: viagemId },
      include: {
        beneficiario: { include: { categoria: true } },
        atividades: true,
        pedidosDiaria: true,
        pedidosHospedagem: true,
        pedidosPassagemAerea: true,
      },
    });

    if (!viagem) {
      return { ok: false, erro: "Solicitação de viagem não encontrada." };
    }

    if (sessao.perfil !== "ADMIN" && viagem.unidadeSolicitanteId !== sessao.unidadeId) {
      return { ok: false, erro: "Você não tem permissão para alterar esta solicitação." };
    }

    const situacaoPrazo = avaliarPrazo(viagem.createdAt, viagem.saidaSede, config.prazoMinimoDiasAntecedencia);
    const situacaoAtividade = avaliarHorarioAtividade(
      { chegadaDestino: viagem.chegadaDestino, saidaDestino: viagem.saidaDestino },
      viagem.atividades,
    );
    const statusComum = statusInicialComum(situacaoPrazo, situacaoAtividade);

    await prisma.$transaction(async (tx) => {
      await tx.viagem.update({
        where: { id: viagemId },
        data: {
          numeroProcessoSei,
          idDocumentoSei,
          processoSeiVinculadoEm: new Date(),
        },
      });

      for (const pd of viagem.pedidosDiaria) {
        let novoStatus = pd.status;
        if (pd.status === "AGUARDANDO_PROCESSO_SEI") {
          const pedidosExistentesTx = await tx.pedidoDiaria.findMany({
            where: {
              viagem: { beneficiarioId: viagem.beneficiarioId },
              status: { not: "INDEFERIDO" },
              diarias: { not: null },
              id: { not: pd.id },
            },
            select: { diarias: true, viagem: { select: { saidaSede: true } } },
          });

          const situacaoLimiteTx = avaliarLimites(
            { diarias: Number(pd.diarias ?? 0), saidaSede: viagem.saidaSede },
            pedidosExistentesTx.map((p) => ({ diarias: Number(p.diarias), saidaSede: p.viagem.saidaSede })),
            config.limiteMensalDiarias,
            viagem.beneficiario.categoria.limiteAnualDias,
          );

          novoStatus =
            statusComum ??
            (situacaoLimiteTx.situacao !== "DENTRO_DO_LIMITE"
              ? "AGUARDANDO_DELIBERACAO_LIMITE"
              : "AGUARDANDO_DEFERIMENTO");
        }

        await tx.pedidoDiaria.update({
          where: { id: pd.id },
          data: {
            status: novoStatus,
            numeroProcessoSei,
            idPropostaConcessao: idDocumentoSei ?? pd.idPropostaConcessao,
          },
        });
      }

      for (const ph of viagem.pedidosHospedagem) {
        const novoStatus = ph.status === "AGUARDANDO_PROCESSO_SEI" ? (statusComum ?? "AGUARDANDO_DEFERIMENTO") : ph.status;
        await tx.pedidoHospedagem.update({
          where: { id: ph.id },
          data: { status: novoStatus },
        });
      }

      for (const pp of viagem.pedidosPassagemAerea) {
        const novoStatus = pp.status === "AGUARDANDO_PROCESSO_SEI" ? (statusComum ?? "AGUARDANDO_DEFERIMENTO") : pp.status;
        await tx.pedidoPassagemAerea.update({
          where: { id: pp.id },
          data: { status: novoStatus },
        });
      }
    });

    revalidatePath(`/pedidos/${viagemId}`);
    revalidatePath("/pedidos");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro ao vincular Processo SEI." };
  }
}

export async function alterarProgramacaoViagemAction(
  viagemId: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  try {
    const sessao = await exigirSessao();
    const config = await obterConfiguracao();

    const motivoAlteracao = String(formData.get("motivoAlteracao") ?? "").trim();
    if (!motivoAlteracao) {
      return { ok: false, erro: "Informe a justificativa/motivo da alteração de programação da viagem." };
    }

    const saidaSede = parseDataHora(formData.get("saidaSede"));
    const chegadaDestino = parseDataHora(formData.get("chegadaDestino"));
    const saidaDestino = parseDataHora(formData.get("saidaDestino"));
    const chegadaSede = parseDataHora(formData.get("chegadaSede"));

    if (!saidaSede || !chegadaDestino || !saidaDestino || !chegadaSede) {
      return { ok: false, erro: "Preencha todas as datas e horários da nova programação." };
    }

    if (
      !(saidaSede <= chegadaDestino) ||
      !(chegadaDestino <= saidaDestino) ||
      !(saidaDestino <= chegadaSede)
    ) {
      return {
        ok: false,
        erro: "As datas/horas precisam seguir a ordem: saída da sede ≤ chegada ao destino ≤ saída do destino ≤ chegada à sede.",
      };
    }

    const viagem = await prisma.viagem.findUnique({
      where: { id: viagemId },
      include: {
        beneficiario: { include: { categoria: true } },
        atividades: true,
        pedidosDiaria: true,
        pedidosHospedagem: true,
        pedidosPassagemAerea: true,
      },
    });

    if (!viagem) {
      return { ok: false, erro: "Solicitação de viagem não encontrada." };
    }

    if (sessao.perfil !== "ADMIN" && viagem.unidadeSolicitanteId !== sessao.unidadeId) {
      return { ok: false, erro: "Você não tem permissão para alterar esta solicitação." };
    }

    // Comprovante opcional/recomendado em anexo
    const anexoBruto = formData.get("comprovanteAlteracao");
    let comprovanteLido: { nomeArquivo: string; conteudo: Uint8Array } | null = null;
    if (anexoBruto instanceof File && anexoBruto.size > 0) {
      comprovanteLido = await lerArquivoEnviado(anexoBruto);
    }

    // Verifica se novas atividades foram enviadas
    const qtdAtividades = Number(formData.get("quantidadeAtividades") ?? 0);
    let novasAtividades: AtividadeEntrada[] | null = null;
    let anexosNovosLidos: ({ nomeArquivo: string; conteudo: Uint8Array } | null)[] = [];

    if (qtdAtividades > 0) {
      const atividadesOuErro = parseAtividades(formData);
      if ("erro" in atividadesOuErro) {
        return { ok: false, erro: atividadesOuErro.erro };
      }
      novasAtividades = atividadesOuErro;

      const enquadramentos = await prisma.enquadramentoAtividade.findMany({
        where: { id: { in: novasAtividades.map((a) => a.enquadramentoId) } },
      });
      const enquadramentoPorId = new Map(enquadramentos.map((e) => [e.id, e]));

      for (let i = 0; i < novasAtividades.length; i++) {
        const a = novasAtividades[i];
        const enq = enquadramentoPorId.get(a.enquadramentoId);
        if (!enq || !enq.ativo) {
          return { ok: false, erro: `O enquadramento selecionado na atividade ${i + 1} não é válido.` };
        }
        if (enq.exigeDetalhamento && !a.detalhamento) {
          return { ok: false, erro: `A atividade ${i + 1} (${enq.nome}) exige detalhamento.` };
        }
      }

      const situacaoAtiv = avaliarHorarioAtividade({ chegadaDestino, saidaDestino }, novasAtividades);
      if (situacaoAtiv.situacao === "BLOQUEADO_CHEGADA_APOS_INICIO") {
        return {
          ok: false,
          erro: "A chegada ao destino não pode ser depois do início da atividade mais cedo.",
        };
      }
      if (situacaoAtiv.situacao === "BLOQUEADO_SAIDA_ANTES_FIM") {
        return {
          ok: false,
          erro: "A saída do destino não pode ser antes do fim da atividade mais tarde.",
        };
      }

      anexosNovosLidos = await Promise.all(
        novasAtividades.map((a) => (a.anexo ? lerArquivoEnviado(a.anexo) : null)),
      );
    }

    const jaDeferido =
      viagem.pedidosDiaria.some((p) => p.status === "DEFERIDO") ||
      viagem.pedidosHospedagem.some((p) => p.status === "DEFERIDO") ||
      viagem.pedidosPassagemAerea.some((p) => p.status === "DEFERIDO");

    // Recalcula diárias
    const pd = viagem.pedidosDiaria[0] ?? null;
    let resultadoDiaria: ReturnType<typeof calcularDiarias> | null = null;
    let novoValorDiariaTotal: number | null = null;
    let valorAnteriorCentavos = pd?.valorTotalCentavos ?? 0;
    let diferencaCentavos = 0;

    if (pd) {
      resultadoDiaria = calcularDiarias(
        { saidaSede, chegadaDestino, saidaDestino, chegadaSede, kmDeclarado: viagem.kmDeclarado },
        { kmMinimoSemPernoite: config.kmMinimoSemPernoite, duracaoMinimaHoras: config.duracaoMinimaHoras },
      );

      if (resultadoDiaria.diarias === 0) {
        return {
          ok: false,
          erro: "A nova programação não atinge a duração ou distância mínima exigida para concessão de diárias.",
        };
      }

      const valorUnitario = pd.valorUnitarioCentavos ?? 0;
      novoValorDiariaTotal = Math.round(resultadoDiaria.diarias * valorUnitario);
      diferencaCentavos = novoValorDiariaTotal - valorAnteriorCentavos;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Atualiza dados da Viagem
      await tx.viagem.update({
        where: { id: viagemId },
        data: {
          saidaSede,
          chegadaDestino,
          saidaDestino,
          chegadaSede,
          retificadaEm: new Date(),
        },
      });

      // 2. Se novas atividades foram informadas, recria as atividades
      if (novasAtividades && novasAtividades.length > 0) {
        // Exclui atividades antigas (anexos das atividades são deletados por cascata ou órfãos)
        await tx.anexo.deleteMany({
          where: { atividadeId: { in: viagem.atividades.map((a) => a.id) } },
        });
        await tx.atividade.deleteMany({ where: { viagemId } });

        for (let i = 0; i < novasAtividades.length; i++) {
          const a = novasAtividades[i];
          const ativCriada = await tx.atividade.create({
            data: {
              viagemId,
              enquadramentoId: a.enquadramentoId,
              descricao: a.descricao,
              detalhamento: a.detalhamento,
              dataHoraInicio: a.dataHoraInicio,
              dataHoraFim: a.dataHoraFim,
            },
          });
          const arq = anexosNovosLidos[i];
          if (arq) {
            await tx.anexo.create({
              data: {
                atividadeId: ativCriada.id,
                tipo: "COMPROVANTE_ATIVIDADE",
                nomeArquivo: arq.nomeArquivo,
                conteudo: arq.conteudo as never,
              },
            });
          }
        }
      }

      // 3. Atualiza PedidoDiaria
      if (pd && resultadoDiaria && novoValorDiariaTotal != null) {
        if (jaDeferido) {
          await tx.pedidoDiaria.update({
            where: { id: pd.id },
            data: {
              noites: resultadoDiaria.noites,
              ultimaNoiteQualifica: resultadoDiaria.ultimaNoiteQualifica,
              diarias: resultadoDiaria.diarias,
              valorTotalCentavos: novoValorDiariaTotal,
              valorComplementarCentavos: diferencaCentavos > 0 ? diferencaCentavos : null,
              valorDevolucaoCentavos: diferencaCentavos < 0 ? Math.abs(diferencaCentavos) : null,
              devolucaoConfirmadaEm: diferencaCentavos >= 0 ? null : pd.devolucaoConfirmadaEm,
            },
          });
        } else {
          await tx.pedidoDiaria.update({
            where: { id: pd.id },
            data: {
              noites: resultadoDiaria.noites,
              ultimaNoiteQualifica: resultadoDiaria.ultimaNoiteQualifica,
              diarias: resultadoDiaria.diarias,
              valorTotalCentavos: novoValorDiariaTotal,
              valorComplementarCentavos: null,
              valorDevolucaoCentavos: null,
            },
          });
        }
      }

      // 4. Registra histórico da Alteração de Viagem
      const alteracao = await tx.alteracaoViagem.create({
        data: {
          viagemId,
          solicitadoPorId: sessao.userId,
          motivo: motivoAlteracao,
          status: "APROVADA",
          saidaSedeAnterior: viagem.saidaSede,
          chegadaDestinoAnterior: viagem.chegadaDestino,
          saidaDestinoAnterior: viagem.saidaDestino,
          chegadaSedeAnterior: viagem.chegadaSede,
          saidaSedeNova: saidaSede,
          chegadaDestinoNova: chegadaDestino,
          saidaDestinoNova: saidaDestino,
          chegadaSedeNova: chegadaSede,
          diariasAnteriores: pd?.diarias ?? null,
          diariasNovas: resultadoDiaria?.diarias ?? null,
          valorAnteriorCentavos,
          valorNovoCentavos: novoValorDiariaTotal,
          diferencaCentavos,
          analisadoPorId: sessao.perfil === "ADMIN" ? sessao.userId : null,
          analisadoEm: sessao.perfil === "ADMIN" ? new Date() : null,
        },
      });

      // 5. Salva comprovante de alteração se anexado
      if (comprovanteLido) {
        await tx.anexo.create({
          data: {
            alteracaoViagemId: alteracao.id,
            tipo: "COMPROVANTE_ALTERACAO_PROGRAMACAO",
            nomeArquivo: comprovanteLido.nomeArquivo,
            conteudo: comprovanteLido.conteudo as never,
          },
        });
      }

      // 6. Registra no histórico de auditoria de aprovações
      if (pd) {
        const decisao = jaDeferido
          ? diferencaCentavos > 0
            ? "ALTERAÇÃO COM DIÁRIA COMPLEMENTAR"
            : diferencaCentavos < 0
            ? "ALTERAÇÃO COM DEVOLUÇÃO AO ERÁRIO"
            : "ALTERAÇÃO DE DATAS (MESMO VALOR)"
          : "PROGRAMAÇÃO RETIFICADA ANTES DO DEFERIMENTO";

        await tx.aprovacao.create({
          data: {
            pedidoDiariaId: pd.id,
            aprovadorId: sessao.userId,
            decisao,
            motivo: motivoAlteracao,
          },
        });
      }
    });

    revalidatePath(`/pedidos/${viagemId}`);
    revalidatePath("/pedidos");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro ao alterar programação da viagem." };
  }
}

