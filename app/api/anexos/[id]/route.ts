import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await obterSessao();
  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const anexo = await prisma.anexo.findUnique({
    where: { id },
    include: { pedido: true },
  });

  if (!anexo) {
    return NextResponse.json({ erro: "Anexo não encontrado." }, { status: 404 });
  }

  if (sessao.perfil !== "ADMIN" && anexo.pedido.unidadeSolicitanteId !== sessao.unidadeId) {
    return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  }

  if (!anexo.conteudo) {
    return NextResponse.json(
      { erro: "Este arquivo foi enviado antes da migração do armazenamento e não está mais disponível." },
      { status: 404 },
    );
  }

  return new NextResponse(new Uint8Array(anexo.conteudo), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(anexo.nomeArquivo)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
