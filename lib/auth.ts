import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { PerfilUsuario } from "@prisma/client";

const COOKIE_NAME = "diarias_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8; // 8 horas

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET não configurado.");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  nome: string;
  perfil: PerfilUsuario;
  unidadeId: string | null;
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
}

export async function obterSessao(): Promise<SessionPayload | null> {
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
    };
  } catch {
    return null;
  }
}

export async function exigirSessao(): Promise<SessionPayload> {
  const sessao = await obterSessao();
  if (!sessao) {
    throw new Error("Não autenticado.");
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

// Hash de um valor que nunca vai bater, só para gastar o mesmo tempo de um
// bcrypt.compare real quando o email não existe — evita que o tempo de
// resposta do login denuncie quais emails estão cadastrados.
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
  };
}

export async function gerarHashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, 12);
}
