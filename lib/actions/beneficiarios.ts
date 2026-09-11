"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAdmin, exigirSessao } from "@/lib/auth";
import { checarDuplicidadeBeneficiario, cpfValido, normalizarNome } from "@/lib/cpf";

export interface CriarBeneficiarioState {
  erro?: string;
  sucesso?: boolean;
}

export async function criarBeneficiarioAction(
  _prevState: CriarBeneficiarioState,
  formData: FormData,
): Promise<CriarBeneficiarioState> {
  await exigirSessao();

  const nome = String(formData.get("nome") ?? "").trim();
  const cpf = String(formData.get("cpf") ?? "").trim();
  const banco = String(formData.get("banco") ?? "").trim();
  const agencia = String(formData.get("agencia") ?? "").trim();
  const contaCorrente = String(formData.get("contaCorrente") ?? "").trim();
  const categoriaId = String(formData.get("categoriaId") ?? "");
  const unidadeVinculoId = String(formData.get("unidadeVinculoId") ?? "") || null;

  if (!nome || !cpf || !banco || !agencia || !contaCorrente || !categoriaId) {
    return { erro: "Preencha todos os campos obrigatórios." };
  }

  if (!cpfValido(cpf)) {
    return { erro: "CPF inválido (dígito verificador não confere)." };
  }

  const existentes = await prisma.beneficiario.findMany({
    select: { nome: true, cpf: true },
  });

  for (const existente of existentes) {
    const resultado = checarDuplicidadeBeneficiario({ nome, cpf }, existente);
    if (resultado.tipo === "CPF_IDENTICO") {
      return { erro: "Já existe um beneficiário cadastrado com este CPF." };
    }
    if (resultado.tipo === "PROVAVEL_ERRO_DIGITACAO") {
      return {
        erro: `O nome informado já existe no cadastro com um CPF muito parecido (${existente.cpf}). Verifique se não é a mesma pessoa com CPF digitado errado antes de cadastrar como novo beneficiário.`,
      };
    }
  }

  await prisma.beneficiario.create({
    data: {
      nome,
      nomeNormalizado: normalizarNome(nome),
      cpf: cpf.replace(/\D/g, ""),
      banco,
      agencia,
      contaCorrente,
      categoriaId,
      unidadeVinculoId,
    },
  });

  revalidatePath("/beneficiarios");
  return { sucesso: true };
}

export async function excluirBeneficiarioAction(beneficiarioId: string) {
  await exigirAdmin();

  const pedidosVinculados = await prisma.pedidoDiaria.count({
    where: { beneficiarioId },
  });

  if (pedidosVinculados > 0) {
    await prisma.beneficiario.update({
      where: { id: beneficiarioId },
      data: { ativo: false },
    });
  } else {
    await prisma.beneficiario.delete({ where: { id: beneficiarioId } });
  }

  revalidatePath("/beneficiarios");
}

export async function reativarBeneficiarioAction(beneficiarioId: string) {
  await exigirAdmin();
  await prisma.beneficiario.update({
    where: { id: beneficiarioId },
    data: { ativo: true },
  });
  revalidatePath("/beneficiarios");
}
