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
  const config = await obterConfiguracao();

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
      const statusDiaria: StatusPedido =
        statusComum ?? (situacaoLimite!.situacao !== "DENTRO_DO_LIMITE" ? "AGUARDANDO_DELIBERACAO_LIMITE" : "AGUARDANDO_DEFERIMENTO");

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
        },
      });
    }

    if (querHospedagem) {
      const statusHospedagem: StatusPedido = statusComum ?? "AGUARDANDO_DEFERIMENTO";

      await tx.pedidoHospedagem.create({
        data: {
          viagemId: viagemCriada.id,
          status: statusHospedagem,
          justificativaPrazoCurto,
          cienciaPrazoAtividade,
        },
      });
    }

    if (querPassagemAerea) {
      const statusPassagem: StatusPedido = statusComum ?? "AGUARDANDO_DEFERIMENTO";

      await tx.pedidoPassagemAerea.create({
        data: {
          viagemId: viagemCriada.id,
          status: statusPassagem,
          justificativaPrazoCurto,
          cienciaPrazoAtividade,
        },
      });
    }

    return viagemCriada;
  });

  revalidatePath("/pedidos");
  redirect(`/pedidos/${viagem.id}`);
}
