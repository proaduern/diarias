import { prisma } from "@/lib/prisma";
import { garantirSequenciaisViagem } from "@/lib/sequencial-sdhp";
import type { DadosCompletosViagemSdhp } from "./documentos-sdhp";

export async function carregarDadosCompletosViagemSdhp(
  viagemId: string,
): Promise<DadosCompletosViagemSdhp | null> {
  await garantirSequenciaisViagem(viagemId);

  const viagem = await prisma.viagem.findUnique({
    where: { id: viagemId },
    include: {
      beneficiario: { include: { categoria: true } },
      unidadeSolicitante: true,
      criadoPor: true,
      atividades: {
        include: { enquadramento: true, anexos: true },
        orderBy: { dataHoraInicio: "asc" },
      },
      pedidosDiaria: {
        include: { tipoDestino: true },
      },
      pedidosHospedagem: {
        include: { contrato: true },
      },
      pedidosPassagemAerea: {
        include: { contrato: true },
      },
      alteracoes: {
        include: { solicitadoPor: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!viagem) return null;

  const pd = viagem.pedidosDiaria[0] ?? null;
  const pp = viagem.pedidosPassagemAerea[0] ?? null;
  const ph = viagem.pedidosHospedagem[0] ?? null;
  const alt = viagem.alteracoes[0] ?? null;

  const b = viagem.beneficiario;
  const anoRef = viagem.createdAt.getFullYear();

  return {
    viagemId: viagem.id,
    numeroProcessoSei: viagem.numeroProcessoSei ?? pd?.numeroProcessoSei ?? null,
    idDocumentoSei: viagem.idDocumentoSei ?? pd?.idPropostaConcessao ?? null,
    criadoEm: viagem.createdAt,
    retificadaEm: viagem.retificadaEm,

    fontePagadora: viagem.fontePagadora || "FONTE_0500",
    detalhamentoFonte: viagem.detalhamentoFonte,
    tipoTransporte: viagem.tipoTransporte || (viagem.vaiBuscarAeroporto || pp ? "AEREO" : "TERRESTRE_OFICIAL"),
    tipoTransporteOutro: viagem.tipoTransporteOutro,
    chefiaNome: viagem.chefiaNome || `Chefia Imediata — ${viagem.unidadeSolicitante.nome}`,
    chefiaCargo: viagem.chefiaCargo || `Chefia Imediata / Responsável (${viagem.unidadeSolicitante.nome})`,
    justificativaFimDeSemanaFeriado: viagem.justificativaFimDeSemanaFeriado,
    observacoesSolicitacao: viagem.observacoesSolicitacao,
    acompanhaReitorVice: viagem.acompanhaReitorVice,
    viagemVinculadaFg: viagem.viagemVinculadaFg,

    unidadeSolicitante: {
      nome: viagem.unidadeSolicitante.nome,
      email: viagem.unidadeSolicitante.email,
    },

    beneficiario: {
      nome: b.nome,
      cpf: b.cpf,
      matricula: b.matricula,
      cargo: b.cargo,
      categoriaNome: b.categoria.nome,
      banco: b.banco,
      agencia: b.agencia,
      contaCorrente: b.contaCorrente,
      dataNascimento: b.dataNascimento,
      rg: b.rg,
      passaporte: b.passaporte,
      telefone: b.telefone,
      email: b.email,
      portariaFg: b.portariaFg,
      enderecoCompleto: b.enderecoCompleto,
      nisPisPasep: b.nisPisPasep,
      servidorOutroOrgao: b.servidorOutroOrgao,
      estadoCivil: b.estadoCivil,
      sexo: b.sexo,
      grauInstrucao: b.grauInstrucao,
      racaCor: b.racaCor,
      paisNascimento: b.paisNascimento,
      paisNacionalidade: b.paisNacionalidade,
      tipoLogradouro: b.tipoLogradouro,
      logradouro: b.logradouro,
      numeroEndereco: b.numeroEndereco,
      complementoEndereco: b.complementoEndereco,
      bairroEndereco: b.bairroEndereco,
      cepEndereco: b.cepEndereco,
      municipioUfEndereco: b.municipioUfEndereco,
      ocupacaoCurso: b.ocupacaoCurso,
    },

    roteiro: {
      sedeCidade: viagem.sedeCidade,
      sedeEstado: viagem.sedeEstado,
      municipioDestino: viagem.municipioDestino,
      destinoEstado: viagem.destinoEstado,
      kmDeclarado: viagem.kmDeclarado,
      vaiBuscarAeroporto: viagem.vaiBuscarAeroporto,
      kmSedeAeroporto: viagem.kmSedeAeroporto,
      kmVoo: viagem.kmVoo,
      kmAeroportoDestino: viagem.kmAeroportoDestino,
      saidaSede: viagem.saidaSede,
      chegadaDestino: viagem.chegadaDestino,
      saidaDestino: viagem.saidaDestino,
      chegadaSede: viagem.chegadaSede,
      finalidade: viagem.finalidade,
    },

    atividades: viagem.atividades.map((a) => ({
      categoria: a.enquadramento.categoria,
      enquadramentoNome: a.enquadramento.nome,
      descricao: a.descricao,
      detalhamento: a.detalhamento,
      dataHoraInicio: a.dataHoraInicio,
      dataHoraFim: a.dataHoraFim,
      anexosNomes: a.anexos.map((ax) => ax.nomeArquivo),
    })),

    pedidoDiaria: pd
      ? {
          id: pd.id,
          sequencialFormatado:
            pd.sequencialFormatado ||
            `Solicitação de Diárias nº 001/${anoRef} - SDHP/PROAD/UERN`,
          sequencialNumero: pd.sequencialNumero ?? 1,
          sequencialAno: pd.sequencialAno ?? anoRef,
          tipoDestinoNome: pd.tipoDestino.nome,
          noites: pd.noites,
          diarias: pd.diarias != null ? Number(pd.diarias) : null,
          valorUnitarioCentavos: pd.valorUnitarioCentavos,
          valorTotalCentavos: pd.valorTotalCentavos,
          valorComplementarCentavos: pd.valorComplementarCentavos,
          valorDevolucaoCentavos: pd.valorDevolucaoCentavos,
          justificativaPrazoCurto: pd.justificativaPrazoCurto,
          justificativaGestorAtividade: pd.justificativaGestorAtividade,
          portariaNumero: pd.portariaNumero,
          portariaData: pd.portariaData,
          idPropostaConcessao: pd.idPropostaConcessao,
          relatorioBaseLegal: pd.relatorioBaseLegal,
          relatorioDescricaoAtividades: pd.relatorioDescricaoAtividades,
          relatorioResultado: pd.relatorioResultado,
          relatorioJustificativaResultado: pd.relatorioJustificativaResultado,
          relatorioJustificativaRetornoAntecipado: pd.relatorioJustificativaRetornoAntecipado,
          relatorioAnexosDescricao: pd.relatorioAnexosDescricao,
        }
      : null,

    pedidoPassagemAerea: pp
      ? {
          id: pp.id,
          sequencialFormatado:
            pp.sequencialFormatado ||
            `Solicitação de Passagens Aéreas nº 001/${anoRef} - SDHP/PROAD/UERN`,
          sequencialNumero: pp.sequencialNumero ?? 1,
          sequencialAno: pp.sequencialAno ?? anoRef,
          empresaNome: pp.contrato.empresaNome,
          numeroContrato: pp.contrato.numeroContrato,
          valorTotalCentavos: pp.valorTotalCentavos,
          justificativaPrazoCurto: pp.justificativaPrazoCurto,
          periodoSaida: pp.periodoSaida || "MANHA",
          periodoRetorno: pp.periodoRetorno || "NOITE",
          ordemServicoNumero: pp.ordemServicoNumero,
          bilheteLocalizador: pp.bilheteLocalizador,
          relatorioDescricaoAtividades: pp.relatorioDescricaoAtividades,
          relatorioResultado: pp.relatorioResultado,
        }
      : null,

    pedidoHospedagem: ph
      ? {
          id: ph.id,
          sequencialFormatado:
            ph.sequencialFormatado ||
            `Solicitação de Hospedagem nº 001/${anoRef} - SDHP/PROAD/UERN`,
          sequencialNumero: ph.sequencialNumero ?? 1,
          sequencialAno: ph.sequencialAno ?? anoRef,
          empresaNome: ph.contrato.empresaNome,
          numeroContrato: ph.contrato.numeroContrato,
          valorTotalCentavos: ph.valorTotalCentavos,
          justificativaPrazoCurto: ph.justificativaPrazoCurto,
          almocoIncluido: ph.almocoIncluido,
          almocoQtdDias: ph.almocoQtdDias,
          jantarIncluido: ph.jantarIncluido,
          jantarQtdDias: ph.jantarQtdDias,
          tipoApartamento: ph.tipoApartamento || "SIMPLES",
          enderecoBeneficiario: ph.enderecoBeneficiario,
          ordemServicoNumero: ph.ordemServicoNumero,
          relatorioDescricaoAtividades: ph.relatorioDescricaoAtividades,
          relatorioResultado: ph.relatorioResultado,
        }
      : null,

    ultimaAlteracao: alt
      ? {
          id: alt.id,
          motivo: alt.motivo,
          createdAt: alt.createdAt,
          solicitadoPorNome: alt.solicitadoPor.nome,
          saidaSedeAnterior: alt.saidaSedeAnterior,
          chegadaDestinoAnterior: alt.chegadaDestinoAnterior,
          saidaDestinoAnterior: alt.saidaDestinoAnterior,
          chegadaSedeAnterior: alt.chegadaSedeAnterior,
          saidaSedeNova: alt.saidaSedeNova,
          chegadaDestinoNova: alt.chegadaDestinoNova,
          saidaDestinoNova: alt.saidaDestinoNova,
          chegadaSedeNova: alt.chegadaSedeNova,
          diariasAnteriores: alt.diariasAnteriores != null ? Number(alt.diariasAnteriores) : null,
          diariasNovas: alt.diariasNovas != null ? Number(alt.diariasNovas) : null,
          valorAnteriorCentavos: alt.valorAnteriorCentavos,
          valorNovoCentavos: alt.valorNovoCentavos,
          diferencaCentavos: alt.diferencaCentavos,
        }
      : null,
  };
}
