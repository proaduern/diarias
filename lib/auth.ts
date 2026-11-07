import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { PerfilUsuario } from "@prisma/client";

export const COOKIE_NAME = "diarias_session";
export const ADMIN_IMPERSONACAO_COOKIE_NAME = "diarias_admin_impersonacao";
const SESSION_DURATION_SECONDS = 60 * 60 * 8; // 8 horas

function getSecretKey() {
  const secret = process.env.AUTH_SECRET || "uern_portal_proad_sso_master_key_2026_super_seguro";
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  nome: string;
  perfil: PerfilUsuario;
  unidadeId: string | null;
  podeImportarUsuarios: boolean;
  podeEditarBeneficiarios: boolean;
}

export async function criarSessao(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function destruirSessao() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  cookieStore.delete(ADMIN_IMPERSONACAO_COOKIE_NAME);
}

/**
 * Retorna sempre a sesso real autenticada no cookie primrio.
 */
export async function obterSessaoReal(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return {
      userId: payload.userId as string,
      nome: payload.nome as string,
      perfil: payload.perfil as PerfilUsuario,
      unidadeId: (payload.unidadeId as string | null) ?? null,
      podeImportarUsuarios: (payload.podeImportarUsuarios as boolean | undefined) ?? false,
      podeEditarBeneficiarios: (payload.podeEditarBeneficiarios as boolean | undefined) ?? false,
    };
  } catch {
    return null;
  }
}

/**
 * Retorna a sesso ativa. Se for Administrador e houver cookie de simulao, retorna a sesso simulada.
 */
export async function obterSessao(): Promise<SessionPayload | null> {
  const real = await obterSessaoReal();
  if (!real) return null;

  if (real.perfil === "ADMIN") {
    const cookieStore = await cookies();
    const impToken = cookieStore.get(ADMIN_IMPERSONACAO_COOKIE_NAME)?.value;
    if (impToken) {
      try {
        const { payload } = await jwtVerify(impToken, getSecretKey());
        if (payload) {
          return {
            userId: payload.userId as string,
            nome: payload.nome as string,
            perfil: payload.perfil as PerfilUsuario,
            unidadeId: (payload.unidadeId as string | null) ?? null,
            podeImportarUsuarios: (payload.podeImportarUsuarios as boolean | undefined) ?? false,
            podeEditarBeneficiarios: (payload.podeEditarBeneficiarios as boolean | undefined) ?? false,
          };
        }
      } catch {
        // Ignora token invlido
      }
    }
  }

  return real;
}

export async function iniciarAtuarComo(payload: SessionPayload): Promise<void> {
  const real = await obterSessaoReal();
  if (!real || real.perfil !== "ADMIN") {
    throw new Error("Apenas o Administrador PROAD pode utilizar a funcionalidade Atuar Como.");
  }

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_IMPERSONACAO_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 horas
  });
}

export async function encerrarAtuarComo(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_IMPERSONACAO_COOKIE_NAME);
}

export async function exigirSessao(): Promise<SessionPayload> {
  const sessao = await obterSessao();
  if (!sessao) {
    throw new Error("No autenticado.");
  }
  return sessao;
}

export async function exigirAdmin(): Promise<SessionPayload> {
  const sessao = await exigirSessao();
  if (sessao.perfil !== "ADMIN") {
    throw new Error("Acesso restrito ao administrador.");
  }
  return sessao;
}

const HASH_FANTASMA = "$2b$12$no0hl/UbgPkre0D4vkOQV.8uf.GL/owAET4pOTPTV10okJC43r23C";

export async function autenticar(
  email: string,
  senha: string,
): Promise<SessionPayload | null> {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) {
    await bcrypt.compare(senha, HASH_FANTASMA);
    return null;
  }

  const senhaOk = await bcrypt.compare(senha, usuario.senhaHash);
  if (!senhaOk) return null;

  return {
    userId: usuario.id,
    nome: usuario.nome,
    perfil: usuario.perfil,
    unidadeId: usuario.unidadeId,
    podeImportarUsuarios: usuario.podeImportarUsuarios,
    podeEditarBeneficiarios: usuario.podeEditarBeneficiarios,
  };
}

export async function gerarHashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, 12);
}
