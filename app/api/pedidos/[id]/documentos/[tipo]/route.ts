import { NextRequest, NextResponse } from "next/server";
import { obterSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { carregarDadosCompletosViagemSdhp } from "@/lib/templates/carregar-dados-viagem";
import {
  gerarFormularioSolicitacaoDiariaDocx,
  gerarFormularioSolicitacaoDiariaPdf,
  gerarFormularioSolicitacaoPassagemDocx,
  gerarFormularioSolicitacaoPassagemPdf,
  gerarFormularioSolicitacaoHospedagemDocx,
  gerarFormularioSolicitacaoHospedagemPdf,
  gerarRelatorioViagemDocx,
  gerarRelatorioViagemPdf,
  gerarFormularioEsocialDocx,
  gerarFormularioEsocialPdf,
  gerarTermoRetificacaoDocx,
  gerarTermoRetificacaoPdf,
} from "@/lib/templates/documentos-sdhp";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tipo: string }> },
) {
  const sessao = await obterSessao();
  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { id, tipo } = await params;
  const formato = (request.nextUrl.searchParams.get("formato") || "pdf").toLowerCase();
  const ehDocx = formato === "docx";

  const viagemPerm = await prisma.viagem.findUnique({
    where: { id },
    select: { unidadeSolicitanteId: true, beneficiario: { select: { nomeNormalizado: true } } },
  });

  if (!viagemPerm) {
    return NextResponse.json({ erro: "Solicitação de viagem não encontrada." }, { status: 404 });
  }

  if (sessao.perfil !== "ADMIN" && viagemPerm.unidadeSolicitanteId !== sessao.unidadeId) {
    return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  }

  const dados = await carregarDadosCompletosViagemSdhp(id);
  if (!dados) {
    return NextResponse.json({ erro: "Dados da viagem não encontrados." }, { status: 404 });
  }

  const slugNome = viagemPerm.beneficiario.nomeNormalizado
    ? viagemPerm.beneficiario.nomeNormalizado.replace(/\s+/g, "_").slice(0, 28)
    : "Beneficiario";

  let buffer: Buffer;
  let prefixoArquivo = "Documento_SDHP";

  switch (tipo) {
    case "diaria":
      buffer = ehDocx
        ? await gerarFormularioSolicitacaoDiariaDocx(dados)
        : gerarFormularioSolicitacaoDiariaPdf(dados);
      prefixoArquivo = `1_Formulario_Solicitacao_Diaria_${String(dados.pedidoDiaria?.sequencialNumero ?? 1).padStart(3, "0")}_${dados.pedidoDiaria?.sequencialAno ?? dados.criadoEm.getFullYear()}`;
      break;

    case "passagem":
      buffer = ehDocx
        ? await gerarFormularioSolicitacaoPassagemDocx(dados)
        : gerarFormularioSolicitacaoPassagemPdf(dados);
      prefixoArquivo = `2_Formulario_Solicitacao_Passagens_Aereas_${String(dados.pedidoPassagemAerea?.sequencialNumero ?? 1).padStart(3, "0")}_${dados.pedidoPassagemAerea?.sequencialAno ?? dados.criadoEm.getFullYear()}`;
      break;

    case "hospedagem":
      buffer = ehDocx
        ? await gerarFormularioSolicitacaoHospedagemDocx(dados)
        : gerarFormularioSolicitacaoHospedagemPdf(dados);
      prefixoArquivo = `3_Formulario_Solicitacao_Hospedagem_${String(dados.pedidoHospedagem?.sequencialNumero ?? 1).padStart(3, "0")}_${dados.pedidoHospedagem?.sequencialAno ?? dados.criadoEm.getFullYear()}`;
      break;

    case "relatorio-viagem":
      buffer = ehDocx
        ? await gerarRelatorioViagemDocx(dados)
        : gerarRelatorioViagemPdf(dados);
      prefixoArquivo = `4_Relatorio_de_Viagem_Prestacao_Contas_Ref_${String(dados.pedidoDiaria?.sequencialNumero ?? dados.pedidoPassagemAerea?.sequencialNumero ?? dados.pedidoHospedagem?.sequencialNumero ?? 1).padStart(3, "0")}_${dados.criadoEm.getFullYear()}`;
      break;

    case "esocial":
      buffer = ehDocx
        ? await gerarFormularioEsocialDocx(dados)
        : gerarFormularioEsocialPdf(dados);
      prefixoArquivo = `5_Formulario_Cadastro_eSocial_${slugNome}`;
      break;

    case "termo-retificacao":
      buffer = ehDocx
        ? await gerarTermoRetificacaoDocx(dados)
        : gerarTermoRetificacaoPdf(dados);
      prefixoArquivo = `6_Termo_de_Retificacao_Ref_${String(dados.pedidoDiaria?.sequencialNumero ?? 1).padStart(3, "0")}_${dados.criadoEm.getFullYear()}`;
      break;

    default:
      return NextResponse.json({ erro: "Tipo de documento inválido." }, { status: 400 });
  }

  const ext = ehDocx ? "docx" : "pdf";
  const contentType = ehDocx
    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    : "application/pdf";

  const nomeFinal = `${prefixoArquivo}_${slugNome}.${ext}`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(nomeFinal)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
