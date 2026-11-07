"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  autenticar,
  criarSessao,
  destruirSessao,
  iniciarAtuarComo,
  encerrarAtuarComo,
  obterSessaoReal,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface LoginState {
  erro?: string;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) {
    return { erro: "Informe email e senha." };
  }

  const sessao = await autenticar(email, senha);
  if (!sessao) {
    return { erro: "Email ou senha inválidos." };
  }

  await criarSessao(sessao);
  redirect("/");
}

export async function logoutAction() {
  await destruirSessao();
  redirect("/login");
}

export async function iniciarAtuarComoAction(tipo: "DEMANDANTE" | "ADMIN") {
  if (tipo === "DEMANDANTE") {
    const primeiraUnidade = await prisma.unidade.findFirst({ orderBy: { nome: "asc" } });
    await iniciarAtuarComo({
      userId: "sim_demandante_diarias",
      nome: "Servidor Demandante (Solicitante de Diárias)",
      perfil: "DEMANDANTE",
      unidadeId: primeiraUnidade?.id || null,
      podeImportarUsuarios: false,
      podeEditarBeneficiarios: false,
    });
  } else {
    await encerrarAtuarComo();
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function encerrarAtuarComoAction() {
  await encerrarAtuarComo();
  revalidatePath("/", "layout");
  redirect("/");
}
