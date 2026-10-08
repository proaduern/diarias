import { NextRequest, NextResponse } from "next/server";
import { consultarContratosViagensSgc, sincronizarContratosSgcComDiarias } from "@/lib/services/sgcIntegration";
import { obterSessao } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessao = await obterSessao();
    if (!sessao) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const contratos = await consultarContratosViagensSgc();
    return NextResponse.json({ success: true, contratos });
  } catch (error: any) {
    console.error("Erro ao consultar contratos SGC:", error);
    return NextResponse.json({ error: error.message || "Erro interno." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessao = await obterSessao();
    if (!sessao || sessao.perfil !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem sincronizar contratos do SGC." }, { status: 403 });
    }

    const resultado = await sincronizarContratosSgcComDiarias();
    return NextResponse.json({
      success: true,
      mensagem: `${resultado.importados} contrato(s) importado(s) e ${resultado.atualizados} atualizado(s) com sucesso a partir do SGC!`,
      resultado,
    });
  } catch (error: any) {
    console.error("Erro ao sincronizar contratos com SGC:", error);
    return NextResponse.json({ error: error.message || "Erro ao sincronizar contratos." }, { status: 500 });
  }
}
