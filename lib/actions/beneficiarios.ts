"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAdmin, exigirSessao } from "@/lib/auth";
import { checarDuplicidadeBeneficiario, cpfValido, normalizarNome } from "@/lib/cpf";
import { comTratamentoDeErro, type ResultadoAction } from "./resultado";
import type { Prisma } from "@prisma/client";

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
  const servidorOutroOrgao = formData.get("servidorOutroOrgao") === "on";
  // Matrícula e cargo/função são obrigatórios para quem tem vínculo funcional
  // com unidade da UERN, e opcionais para colaborador externo (exceto quando
  // servidor de outro órgão informado para fins de eSocial).
  const matricula =
    unidadeVinculoId || servidorOutroOrgao
      ? String(formData.get("matricula") ?? "").trim() || null
      : null;
  const cargo = String(formData.get("cargo") ?? "").trim() || null;

  const dataNascimento = String(formData.get("dataNascimento") ?? "").trim() || null;
  const rg = String(formData.get("rg") ?? "").trim() || null;
  const passaporte = String(formData.get("passaporte") ?? "").trim() || null;
  const telefone = String(formData.get("telefone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const portariaFg = String(formData.get("portariaFg") ?? "").trim() || null;
  const enderecoCompleto = String(formData.get("enderecoCompleto") ?? "").trim() || null;

  // Campos eSocial (Colaborador Externo / Eventual)
  const nisPisPasep = String(formData.get("nisPisPasep") ?? "").trim() || null;
  const estadoCivil = String(formData.get("estadoCivil") ?? "").trim() || null;
  const sexo = String(formData.get("sexo") ?? "").trim() || null;
  const grauInstrucao = String(formData.get("grauInstrucao") ?? "").trim() || null;
  const racaCor = String(formData.get("racaCor") ?? "").trim() || null;
  const paisNascimento = String(formData.get("paisNascimento") ?? "").trim() || "Brasil";
  const paisNacionalidade = String(formData.get("paisNacionalidade") ?? "").trim() || "Brasil";
  const tipoLogradouro = String(formData.get("tipoLogradouro") ?? "").trim() || null;
  const logradouro = String(formData.get("logradouro") ?? "").trim() || null;
  const numeroEndereco = String(formData.get("numeroEndereco") ?? "").trim() || null;
  const complementoEndereco = String(formData.get("complementoEndereco") ?? "").trim() || null;
  const bairroEndereco = String(formData.get("bairroEndereco") ?? "").trim() || null;
  const cepEndereco = String(formData.get("cepEndereco") ?? "").trim() || null;
  const municipioUfEndereco = String(formData.get("municipioUfEndereco") ?? "").trim() || null;
  const ocupacaoCurso = String(formData.get("ocupacaoCurso") ?? "").trim() || null;

  if (!nome || !cpf || !banco || !agencia || !contaCorrente || !categoriaId) {
    return { erro: "Preencha todos os campos obrigatórios." };
  }
  if (unidadeVinculoId && (!matricula || !cargo)) {
    return { erro: "Matrícula e cargo/função são obrigatórios para beneficiário com vínculo funcional." };
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
      matricula,
      cargo,
      dataNascimento,
      rg,
      passaporte,
      telefone,
      email,
      portariaFg,
      enderecoCompleto,
      nisPisPasep,
      servidorOutroOrgao,
      estadoCivil,
      sexo,
      grauInstrucao,
      racaCor,
      paisNascimento,
      paisNacionalidade,
      tipoLogradouro,
      logradouro,
      numeroEndereco,
      complementoEndereco,
      bairroEndereco,
      cepEndereco,
      municipioUfEndereco,
      ocupacaoCurso,
    },
  });

  revalidatePath("/beneficiarios");
  return { sucesso: true };
}

/**
 * Admin edita qualquer beneficiário, incluindo trocar a unidade de vínculo.
 * Um demandante com a permissão podeEditarBeneficiarios só edita
 * beneficiários já vinculados à própria unidade, e não pode mudar essa
 * unidade — o formulário dele nem envia unidadeVinculoId.
 */
export async function atualizarBeneficiarioAction(
  beneficiarioId: string,
  formData: FormData,
): Promise<ResultadoAction> {
  return comTratamentoDeErro(async () => {
    const sessao = await exigirSessao();

    const beneficiario = await prisma.beneficiario.findUnique({ where: { id: beneficiarioId } });
    if (!beneficiario) throw new Error("Beneficiário não encontrado.");

    const autorizado =
      sessao.perfil === "ADMIN" ||
      (sessao.podeEditarBeneficiarios &&
        sessao.unidadeId !== null &&
        beneficiario.unidadeVinculoId === sessao.unidadeId);
    if (!autorizado) {
      throw new Error("Você não tem permissão para editar este beneficiário.");
    }

    const nome = String(formData.get("nome") ?? "").trim();
    const cpf = String(formData.get("cpf") ?? "").trim();
    const banco = String(formData.get("banco") ?? "").trim();
    const agencia = String(formData.get("agencia") ?? "").trim();
    const contaCorrente = String(formData.get("contaCorrente") ?? "").trim();
    const categoriaId = String(formData.get("categoriaId") ?? "");

    // unidadeVinculoId só vem no formulário quando quem edita é admin (só ele
    // pode trocar a unidade de vínculo); um demandante autorizado só edita
    // beneficiários já vinculados à própria unidade, então o vínculo efetivo
    // para decidir se matrícula/cargo são obrigatórios é sempre o existente.
    const unidadeVinculoIdEfetivo =
      sessao.perfil === "ADMIN"
        ? String(formData.get("unidadeVinculoId") ?? "") || null
        : beneficiario.unidadeVinculoId;

    const servidorOutroOrgao = formData.get("servidorOutroOrgao") === "on";
    const matricula =
      unidadeVinculoIdEfetivo || servidorOutroOrgao
        ? String(formData.get("matricula") ?? "").trim() || null
        : null;
    const cargo = String(formData.get("cargo") ?? "").trim() || null;

    const dataNascimento = String(formData.get("dataNascimento") ?? "").trim() || null;
    const rg = String(formData.get("rg") ?? "").trim() || null;
    const passaporte = String(formData.get("passaporte") ?? "").trim() || null;
    const telefone = String(formData.get("telefone") ?? "").trim() || null;
    const email = String(formData.get("email") ?? "").trim() || null;
    const portariaFg = String(formData.get("portariaFg") ?? "").trim() || null;
    const enderecoCompleto = String(formData.get("enderecoCompleto") ?? "").trim() || null;

    const nisPisPasep = String(formData.get("nisPisPasep") ?? "").trim() || null;
    const estadoCivil = String(formData.get("estadoCivil") ?? "").trim() || null;
    const sexo = String(formData.get("sexo") ?? "").trim() || null;
    const grauInstrucao = String(formData.get("grauInstrucao") ?? "").trim() || null;
    const racaCor = String(formData.get("racaCor") ?? "").trim() || null;
    const paisNascimento = String(formData.get("paisNascimento") ?? "").trim() || "Brasil";
    const paisNacionalidade = String(formData.get("paisNacionalidade") ?? "").trim() || "Brasil";
    const tipoLogradouro = String(formData.get("tipoLogradouro") ?? "").trim() || null;
    const logradouro = String(formData.get("logradouro") ?? "").trim() || null;
    const numeroEndereco = String(formData.get("numeroEndereco") ?? "").trim() || null;
    const complementoEndereco = String(formData.get("complementoEndereco") ?? "").trim() || null;
    const bairroEndereco = String(formData.get("bairroEndereco") ?? "").trim() || null;
    const cepEndereco = String(formData.get("cepEndereco") ?? "").trim() || null;
    const municipioUfEndereco = String(formData.get("municipioUfEndereco") ?? "").trim() || null;
    const ocupacaoCurso = String(formData.get("ocupacaoCurso") ?? "").trim() || null;

    if (!nome || !cpf || !banco || !agencia || !contaCorrente || !categoriaId) {
      throw new Error("Preencha todos os campos obrigatórios.");
    }
    if (unidadeVinculoIdEfetivo && (!matricula || !cargo)) {
      throw new Error("Matrícula e cargo/função são obrigatórios para beneficiário com vínculo funcional.");
    }
    if (!cpfValido(cpf)) {
      throw new Error("CPF inválido (dígito verificador não confere).");
    }

    const existentes = await prisma.beneficiario.findMany({
      where: { id: { not: beneficiarioId } },
      select: { nome: true, cpf: true },
    });
    for (const existente of existentes) {
      const resultado = checarDuplicidadeBeneficiario({ nome, cpf }, existente);
      if (resultado.tipo === "CPF_IDENTICO") {
        throw new Error("Já existe outro beneficiário cadastrado com este CPF.");
      }
      if (resultado.tipo === "PROVAVEL_ERRO_DIGITACAO") {
        throw new Error(
          `O nome informado já existe no cadastro com um CPF muito parecido (${existente.cpf}). Verifique se não é a mesma pessoa antes de salvar.`,
        );
      }
    }

    const data: Prisma.BeneficiarioUpdateInput = {
      nome,
      nomeNormalizado: normalizarNome(nome),
      cpf: cpf.replace(/\D/g, ""),
      banco,
      agencia,
      contaCorrente,
      categoria: { connect: { id: categoriaId } },
      matricula,
      cargo,
      dataNascimento,
      rg,
      passaporte,
      telefone,
      email,
      portariaFg,
      enderecoCompleto,
      nisPisPasep,
      servidorOutroOrgao,
      estadoCivil,
      sexo,
      grauInstrucao,
      racaCor,
      paisNascimento,
      paisNacionalidade,
      tipoLogradouro,
      logradouro,
      numeroEndereco,
      complementoEndereco,
      bairroEndereco,
      cepEndereco,
      municipioUfEndereco,
      ocupacaoCurso,
    };

    if (sessao.perfil === "ADMIN") {
      const unidadeVinculoId = String(formData.get("unidadeVinculoId") ?? "") || null;
      data.unidadeVinculo = unidadeVinculoId
        ? { connect: { id: unidadeVinculoId } }
        : { disconnect: true };
    }

    await prisma.beneficiario.update({ where: { id: beneficiarioId }, data });
    revalidatePath("/beneficiarios");
  });
}

export async function excluirBeneficiarioAction(beneficiarioId: string): Promise<ResultadoAction> {
  return comTratamentoDeErro(async () => {
    await exigirAdmin();

    const viagensVinculadas = await prisma.viagem.count({
      where: { beneficiarioId },
    });

    if (viagensVinculadas > 0) {
      await prisma.beneficiario.update({
        where: { id: beneficiarioId },
        data: { ativo: false },
      });
    } else {
      await prisma.beneficiario.delete({ where: { id: beneficiarioId } });
    }

    revalidatePath("/beneficiarios");
  });
}

export async function reativarBeneficiarioAction(beneficiarioId: string): Promise<ResultadoAction> {
  return comTratamentoDeErro(async () => {
    await exigirAdmin();
    await prisma.beneficiario.update({
      where: { id: beneficiarioId },
      data: { ativo: true },
    });
    revalidatePath("/beneficiarios");
  });
}
