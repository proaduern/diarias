"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth";
import { cnpjValido } from "@/lib/cnpj";
import type { TipoBeneficioContrato } from "@prisma/client";

function parseTipoBeneficio(valor: FormDataEntryValue | null): TipoBeneficioContrato {
  const tipo = String(valor ?? "");
  if (tipo !== "HOSPEDAGEM" && tipo !== "PASSAGEM_AEREA" && tipo !== "PASSAGEM_TERRESTRE") {
    throw new Error("Selecione o tipo de benefício do contrato.");
  }
  return tipo;
}

function parseDataObrigatoria(valor: FormDataEntryValue | null, campo: string): Date {
  const data = new Date(String(valor ?? ""));
  if (Number.isNaN(data.getTime())) {
    throw new Error(`Informe uma data válida para ${campo}.`);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export async function criarContratoAction(formData: FormData) {
  await exigirAdmin();

  const tipoBeneficio = parseTipoBeneficio(formData.get("tipoBeneficio"));
  const empresaNome = String(formData.get("empresaNome") ?? "").trim();
  const empresaCnpj = String(formData.get("empresaCnpj") ?? "").trim();
  const numeroContrato = String(formData.get("numeroContrato") ?? "").trim();
  const numeroProcessoSei = String(formData.get("numeroProcessoSei") ?? "").trim();
  const vigenciaInicio = parseDataObrigatoria(formData.get("vigenciaInicio"), "vigência início");
  const vigenciaFim = parseDataObrigatoria(formData.get("vigenciaFim"), "vigência fim");
  const valorReais = Number(formData.get("valorTotal") ?? "");

  if (!empresaNome || !numeroContrato || !numeroProcessoSei) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }
  if (!cnpjValido(empresaCnpj)) {
    throw new Error("CNPJ inválido (dígito verificador não confere).");
  }
  if (vigenciaFim < vigenciaInicio) {
    throw new Error("A vigência final não pode ser antes da vigência inicial.");
  }
  if (!Number.isFinite(valorReais) || valorReais <= 0) {
    throw new Error("Informe um valor total válido, maior que zero.");
  }

  await prisma.contrato.create({
    data: {
      tipoBeneficio,
      empresaNome,
      empresaCnpj: empresaCnpj.replace(/\D/g, ""),
      numeroContrato,
      numeroProcessoSei,
      vigenciaInicio,
      vigenciaFim,
      valorTotalCentavos: Math.round(valorReais * 100),
    },
  });

  revalidatePath("/admin/contratos");
}

export async function atualizarContratoAction(contratoId: string, formData: FormData) {
  await exigirAdmin();

  const tipoBeneficio = parseTipoBeneficio(formData.get("tipoBeneficio"));
  const empresaNome = String(formData.get("empresaNome") ?? "").trim();
  const empresaCnpj = String(formData.get("empresaCnpj") ?? "").trim();
  const numeroContrato = String(formData.get("numeroContrato") ?? "").trim();
  const numeroProcessoSei = String(formData.get("numeroProcessoSei") ?? "").trim();
  const vigenciaInicio = parseDataObrigatoria(formData.get("vigenciaInicio"), "vigência início");
  const vigenciaFim = parseDataObrigatoria(formData.get("vigenciaFim"), "vigência fim");
  const valorReais = Number(formData.get("valorTotal") ?? "");
  const ativo = formData.get("ativo") === "on";

  if (!empresaNome || !numeroContrato || !numeroProcessoSei) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }
  if (!cnpjValido(empresaCnpj)) {
    throw new Error("CNPJ inválido (dígito verificador não confere).");
  }
  if (vigenciaFim < vigenciaInicio) {
    throw new Error("A vigência final não pode ser antes da vigência inicial.");
  }
  if (!Number.isFinite(valorReais) || valorReais <= 0) {
    throw new Error("Informe um valor total válido, maior que zero.");
  }

  await prisma.contrato.update({
    where: { id: contratoId },
    data: {
      tipoBeneficio,
      empresaNome,
      empresaCnpj: empresaCnpj.replace(/\D/g, ""),
      numeroContrato,
      numeroProcessoSei,
      vigenciaInicio,
      vigenciaFim,
      valorTotalCentavos: Math.round(valorReais * 100),
      ativo,
    },
  });

  revalidatePath("/admin/contratos");
  revalidatePath(`/admin/contratos/${contratoId}`);
}

export async function excluirContratoAction(contratoId: string) {
  await exigirAdmin();

  const [emUsoHospedagem, emUsoPassagem] = await Promise.all([
    prisma.pedidoHospedagem.count({ where: { contratoId } }),
    prisma.pedidoPassagemAerea.count({ where: { contratoId } }),
  ]);

  if (emUsoHospedagem + emUsoPassagem > 0) {
    await prisma.contrato.update({ where: { id: contratoId }, data: { ativo: false } });
  } else {
    await prisma.contrato.delete({ where: { id: contratoId } });
  }

  revalidatePath("/admin/contratos");
}

// ---------------------------------------------------------------------------
// Cota por unidade dentro de um contrato
// ---------------------------------------------------------------------------

export async function definirCotaContratoUnidadeAction(contratoId: string, formData: FormData) {
  await exigirAdmin();

  const unidadeId = String(formData.get("unidadeId") ?? "");
  const cotaReais = Number(formData.get("cota") ?? "0");

  if (!unidadeId) {
    throw new Error("Selecione a unidade.");
  }
  if (!Number.isFinite(cotaReais) || cotaReais < 0) {
    throw new Error("Informe uma cota válida (0 = sem teto próprio, usa o saldo global do contrato).");
  }

  await prisma.cotaContratoUnidade.upsert({
    where: { contratoId_unidadeId: { contratoId, unidadeId } },
    update: { cotaCentavos: Math.round(cotaReais * 100) },
    create: { contratoId, unidadeId, cotaCentavos: Math.round(cotaReais * 100) },
  });

  revalidatePath(`/admin/contratos/${contratoId}`);
  revalidatePath("/admin/contratos");
}

export async function excluirCotaContratoUnidadeAction(cotaId: string) {
  await exigirAdmin();
  const cota = await prisma.cotaContratoUnidade.findUniqueOrThrow({ where: { id: cotaId } });
  await prisma.cotaContratoUnidade.delete({ where: { id: cotaId } });
  revalidatePath(`/admin/contratos/${cota.contratoId}`);
  revalidatePath("/admin/contratos");
}
