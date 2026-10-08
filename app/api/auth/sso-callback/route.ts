import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { criarSessao } from "@/lib/auth";
import type { PerfilUsuario } from "@prisma/client";

export const dynamic = "force-dynamic";

const PROAD_SSO_SECRET = new TextEncoder().encode(
  process.env.PROAD_SSO_SECRET || "uern_portal_proad_sso_master_key_2026_super_seguro"
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/login?error=token_ausente", request.url));
    }

    // 1. Valida assinatura do token gerado pelo Portal Central PROAD
    const { payload } = await jwtVerify(token, PROAD_SSO_SECRET);
    const { email, nome, cpf, matricula, role, targetSystem, unidadeSigla, unidadeNome } = payload as {
      userId?: string;
      email: string;
      nome: string;
      cpf?: string;
      matricula?: string;
      role?: string;
      targetSystem: string;
      unidadeSigla?: string;
      unidadeNome?: string;
    };

    if (targetSystem !== "DIARIAS" || !email) {
      return NextResponse.redirect(new URL("/login?error=token_invalido_destino", request.url));
    }

    // 2. Mapeamento de perfil (ADMIN ou DEMANDANTE)
    const roleUpper = (role || "").toUpperCase();
    const perfil: PerfilUsuario =
      roleUpper === "ADMIN" || roleUpper === "ADMIN_PROAD" ? "ADMIN" : "DEMANDANTE";

    // 3. Localização ou vinculação da Unidade de Lotação
    let unidadeId: string | null = null;
    const nomeUnidadeAlvo = unidadeNome || unidadeSigla;

    if (nomeUnidadeAlvo) {
      let unidadeDb = await prisma.unidade.findFirst({
        where: {
          OR: [
            { nome: { equals: nomeUnidadeAlvo, mode: "insensitive" } },
            { nome: { contains: unidadeSigla || "", mode: "insensitive" } },
          ],
        },
      });

      if (!unidadeDb) {
        unidadeDb = await prisma.unidade.create({
          data: {
            nome: nomeUnidadeAlvo,
            email: `${(unidadeSigla || "unidade").toLowerCase()}@uern.br`,
          },
        });
      }

      unidadeId = unidadeDb.id;
    }

    // Fallback: se não tiver unidade, vincula à primeira unidade existente
    if (!unidadeId) {
      const primeiraUnidade = await prisma.unidade.findFirst();
      unidadeId = primeiraUnidade?.id || null;
    }

    // 4. Localização ou sincronização do Usuário no banco do sistema de Diárias
    const cpfFormatado = cpf ? cpf.replace(/\D/g, "") : `000${Math.floor(10000000 + Math.random() * 90000000)}`;
    let usuarioDb = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!usuarioDb) {
      // Se não achar por email, tenta por CPF
      if (cpf) {
        usuarioDb = await prisma.usuario.findUnique({
          where: { cpf: cpfFormatado },
        });
      }
    }

    if (!usuarioDb) {
      usuarioDb = await prisma.usuario.create({
        data: {
          email: email.toLowerCase(),
          nome: nome || email.split("@")[0],
          cpf: cpfFormatado,
          senhaHash: "$2a$10$SSO_AUTHENTICATION_MANAGED_BY_PORTAL_PROAD",
          perfil,
          unidadeId,
          podeImportarUsuarios: perfil === "ADMIN",
          podeEditarBeneficiarios: true,
        },
      });
    } else {
      usuarioDb = await prisma.usuario.update({
        where: { id: usuarioDb.id },
        data: {
          nome: nome || usuarioDb.nome,
          perfil,
          ...(unidadeId && !usuarioDb.unidadeId ? { unidadeId } : {}),
        },
      });
    }

    // 5. Criação da sessão JWT nativa do sistema de Diárias
    await criarSessao({
      userId: usuarioDb.id,
      nome: usuarioDb.nome,
      perfil: usuarioDb.perfil,
      unidadeId: usuarioDb.unidadeId,
      podeImportarUsuarios: usuarioDb.podeImportarUsuarios,
      podeEditarBeneficiarios: usuarioDb.podeEditarBeneficiarios,
    });

    // 6. Redirecionamento autenticado para o dashboard
    return NextResponse.redirect(new URL("/", request.url));
  } catch (error: any) {
    console.error("Erro no callback de SSO do Diárias:", error);
    return NextResponse.redirect(new URL("/login?error=falha_autenticacao_sso", request.url));
  }
}
