import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { gerarRequerimentoViagemSeiPdf, type DadosRequerimentoViagemSei } from "@/lib/requerimento-sei-pdf";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await obterSessao();
  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const viagem = await prisma.viagem.findUnique({
    where: { id },
    include: {
      beneficiario: { include: { categoria: true } },
      unidadeSolicitante: true,
      atividades: {
        include: { enquadramento: true, anexos: true },
        orderBy: { dataHoraInicio: "asc" },
      },
      pedidosDiaria: { include: { tipoDestino: true } },
      pedidosHospedagem: { include: { contrato: true } },
      pedidosPassagemAerea: { include: { contrato: true } },
    },
  });

  if (!viagem) {
    return NextResponse.json({ erro: "Solicitação de viagem não encontrada." }, { status: 404 });
  }

  if (sessao.perfil !== "ADMIN" && viagem.unidadeSolicitanteId !== sessao.unidadeId) {
    return NextResponse.json({ erro: "Sem permissão para acessar esta solicitação." }, { status: 403 });
  }

  const pDiaria = viagem.pedidosDiaria[0] ?? null;
  const pHosp = viagem.pedidosHospedagem[0] ?? null;
  const pPass = viagem.pedidosPassagemAerea[0] ?? null;

  const dados: DadosRequerimentoViagemSei = {
    viagemId: viagem.id,
    numeroProcessoSei: viagem.numeroProcessoSei ?? pDiaria?.numeroProcessoSei ?? null,
    idDocumentoSei: viagem.idDocumentoSei ?? pDiaria?.idPropostaConcessao ?? null,
    criadoEm: viagem.createdAt,
    retificadaEm: viagem.retificadaEm,
    unidadeSolicitante: {
      nome: viagem.unidadeSolicitante.nome,
      email: viagem.unidadeSolicitante.email,
    },
    beneficiario: {
      nome: viagem.beneficiario.nome,
      cpf: viagem.beneficiario.cpf,
      matricula: viagem.beneficiario.matricula,
      cargo: viagem.beneficiario.cargo,
      categoriaNome: viagem.beneficiario.categoria.nome,
      banco: viagem.beneficiario.banco,
      agencia: viagem.beneficiario.agencia,
      contaCorrente: viagem.beneficiario.contaCorrente,
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
      tempoViagemEstimadoMinutos: viagem.tempoViagemEstimadoMinutos,
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
    pedidoDiaria: pDiaria
      ? {
          id: pDiaria.id,
          tipoDestinoNome: pDiaria.tipoDestino.nome,
          noites: pDiaria.noites,
          ultimaNoiteQualifica: pDiaria.ultimaNoiteQualifica,
          diarias: pDiaria.diarias ? Number(pDiaria.diarias) : null,
          valorUnitarioCentavos: pDiaria.valorUnitarioCentavos,
          valorTotalCentavos: pDiaria.valorTotalCentavos,
          justificativaPrazoCurto: pDiaria.justificativaPrazoCurto,
          justificativaGestorAtividade: pDiaria.justificativaGestorAtividade,
        }
      : null,
    pedidoHospedagem: pHosp
      ? {
          id: pHosp.id,
          empresaNome: pHosp.contrato.empresaNome,
          numeroContrato: pHosp.contrato.numeroContrato,
          valorTotalCentavos: pHosp.valorTotalCentavos,
          justificativaPrazoCurto: pHosp.justificativaPrazoCurto,
        }
      : null,
    pedidoPassagemAerea: pPass
      ? {
          id: pPass.id,
          empresaNome: pPass.contrato.empresaNome,
          numeroContrato: pPass.contrato.numeroContrato,
          valorTotalCentavos: pPass.valorTotalCentavos,
          justificativaPrazoCurto: pPass.justificativaPrazoCurto,
        }
      : null,
  };

  const buffer = gerarRequerimentoViagemSeiPdf(dados);
  const slugNome = viagem.beneficiario.nomeNormalizado
    ? viagem.beneficiario.nomeNormalizado.replace(/\s+/g, "_").slice(0, 30)
    : "beneficiario";
  const nomeArquivo = `Requerimento_Proposta_SEI_${slugNome}_${viagem.id.slice(-6)}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(nomeArquivo)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
