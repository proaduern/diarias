"use server";

import { redirect } from "next/navigation";
import { autenticar, criarSessao, destruirSessao } from "@/lib/auth";

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
