import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { carregarDadosCompletosViagemSdhp } from "@/lib/templates/carregar-dados-viagem";
import {
  gerarFormularioSolicitacaoDiariaPdf,
  gerarFormularioSolicitacaoPassagemPdf,
  gerarFormularioSolicitacaoHospedagemPdf,
} from "@/lib/templates/documentos-sdhp";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await obterSessao();
  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const viagem = await prisma.viagem.findUnique({
    where: { id },
    select: {
      id: true,
      unidadeSolicitanteId: true,
      beneficiario: { select: { nomeNormalizado: true } },
    },
  });

  if (!viagem) {
    return NextResponse.json({ erro: "Solicitação de viagem não encontrada." }, { status: 404 });
  }

  if (sessao.perfil !== "ADMIN" && viagem.unidadeSolicitanteId !== sessao.unidadeId) {
    return NextResponse.json({ erro: "Sem permissão para acessar esta solicitação." }, { status: 403 });
  }

  const dados = await carregarDadosCompletosViagemSdhp(id);
  if (!dados) {
    return NextResponse.json({ erro: "Dados da viagem não encontrados." }, { status: 404 });
  }

  const buffer = dados.pedidoDiaria
    ? gerarFormularioSolicitacaoDiariaPdf(dados)
    : dados.pedidoPassagemAerea
      ? gerarFormularioSolicitacaoPassagemPdf(dados)
      : gerarFormularioSolicitacaoHospedagemPdf(dados);

  const slugNome = viagem.beneficiario.nomeNormalizado
    ? viagem.beneficiario.nomeNormalizado.replace(/\s+/g, "_").slice(0, 30)
    : "beneficiario";
  const nomeArquivo = `Formulario_Solicitacao_SDHP_UERN_${slugNome}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(nomeArquivo)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
