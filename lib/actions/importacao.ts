"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAdmin, exigirSessao, gerarHashSenha } from "@/lib/auth";
import { cpfValido } from "@/lib/cpf";
import { lerPlanilha, type ResultadoImportacao } from "@/lib/importacao";

const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB

async function obterLinhas(formData: FormData) {
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    throw new Error("Selecione um arquivo de planilha (.xlsx).");
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    throw new Error("O arquivo excede o limite de 5 MB.");
  }
  const buffer = await arquivo.arrayBuffer();
  const linhas = await lerPlanilha(arquivo.name, buffer);
  if (linhas.length === 0) throw new Error("A planilha está vazia.");
  return linhas;
}

function mensagemDeErro(e: unknown, duplicidade: string): string {
  const mensagem = e instanceof Error ? e.message : "erro desconhecido.";
  return mensagem.includes("Unique constraint") ? duplicidade : mensagem;
}

// ---------------------------------------------------------------------------
// Unidades (admin)
// ---------------------------------------------------------------------------

export async function importarUnidadesAction(formData: FormData): Promise<ResultadoImportacao> {
  await exigirAdmin();
  const linhas = await obterLinhas(formData);
  const erros: ResultadoImportacao["erros"] = [];
  let sucesso = 0;

  // Unidade.email não tem constraint de unicidade no schema — a duplicidade
  // é checada aqui, contra o que já existe no banco + o que já foi
  // importado nesta mesma rodada (senão duas linhas iguais na planilha
  // passariam as duas).
  const existentes = new Set(
    (await prisma.unidade.findMany({ select: { email: true } })).map((u) =>
      u.email.toLowerCase(),
    ),
  );

  for (const { linha, dados } of linhas) {
    try {
      const nome = (dados.nome ?? "").trim();
      const email = (dados.email ?? "").trim().toLowerCase();
      if (!nome || !email) {
        throw new Error("preencha nome e email.");
      }
      if (existentes.has(email)) {
        throw new Error("já existe uma unidade com este email.");
      }
      await prisma.unidade.create({ data: { nome, email } });
      existentes.add(email);
      sucesso++;
    } catch (e) {
      erros.push({ linha, mensagem: e instanceof Error ? e.message : "erro desconhecido." });
    }
  }

  revalidatePath("/admin/unidades");
  return { sucesso, erros };
}

// ---------------------------------------------------------------------------
// Usuários (admin, ou demandante autorizado pela própria unidade)
// ---------------------------------------------------------------------------

export async function importarUsuariosAction(formData: FormData): Promise<ResultadoImportacao> {
  const sessao = await exigirSessao();
  const autorizado = sessao.perfil === "ADMIN" || sessao.podeImportarUsuarios;
  if (!autorizado) {
    throw new Error("Você não tem permissão para importar usuários.");
  }

  const linhas = await obterLinhas(formData);
  const erros: ResultadoImportacao["erros"] = [];
  let sucesso = 0;

  // Um demandante autorizado só importa demandantes pra própria unidade —
  // nunca escolhe perfil nem unidade pela planilha, mesmo que essas colunas
  // estejam preenchidas.
  const unidadesPorNome =
    sessao.perfil === "ADMIN"
      ? new Map(
          (await prisma.unidade.findMany({ select: { id: true, nome: true } })).map((u) => [
            u.nome.trim().toLowerCase(),
            u.id,
          ]),
        )
      : null;

  for (const { linha, dados } of linhas) {
    try {
      const nome = (dados.nome ?? "").trim();
      const email = (dados.email ?? "").trim().toLowerCase();
      const cpf = (dados.cpf ?? "").trim();
      const senhaInicial = (dados.senhaInicial ?? "").trim();

      if (!nome || !email || !cpf || !senhaInicial) {
        throw new Error("preencha nome, email, cpf e senhaInicial.");
      }
      if (!email.endsWith("@uern.br")) {
        throw new Error("o email precisa ser do domínio @uern.br.");
      }
      if (!cpfValido(cpf)) {
        throw new Error("CPF inválido.");
      }

      let perfil: "ADMIN" | "DEMANDANTE";
      let unidadeId: string | null;

      if (sessao.perfil === "ADMIN") {
        const perfilInformado = (dados.perfil ?? "DEMANDANTE").trim().toUpperCase();
        if (perfilInformado !== "ADMIN" && perfilInformado !== "DEMANDANTE") {
          throw new Error('perfil precisa ser "ADMIN" ou "DEMANDANTE".');
        }
        perfil = perfilInformado;
        if (perfil === "DEMANDANTE") {
          const unidadeNome = (dados.unidadeNome ?? "").trim();
          if (!unidadeNome) throw new Error("informe unidadeNome para um usuário demandante.");
          const idEncontrado = unidadesPorNome!.get(unidadeNome.toLowerCase());
          if (!idEncontrado) throw new Error(`unidade "${unidadeNome}" não encontrada.`);
          unidadeId = idEncontrado;
        } else {
          unidadeId = null;
        }
      } else {
        perfil = "DEMANDANTE";
        unidadeId = sessao.unidadeId;
      }

      const senhaHash = await gerarHashSenha(senhaInicial);

      await prisma.usuario.create({
        data: {
          nome,
          email,
          cpf: cpf.replace(/\D/g, ""),
          senhaHash,
          perfil,
          unidadeId,
        },
      });
      sucesso++;
    } catch (e) {
      erros.push({
        linha,
        mensagem: mensagemDeErro(e, "já existe um usuário com este email ou CPF."),
      });
    }
  }

  revalidatePath("/admin/usuarios");
  return { sucesso, erros };
}
