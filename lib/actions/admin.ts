"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth";
import { gerarHashSenha } from "@/lib/auth";
import { cpfValido } from "@/lib/cpf";

// ---------------------------------------------------------------------------
// Unidades
// ---------------------------------------------------------------------------

export async function criarUnidadeAction(formData: FormData) {
  await exigirAdmin();
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!nome || !email) throw new Error("Preencha nome e email.");

  await prisma.unidade.create({ data: { nome, email } });
  revalidatePath("/admin/unidades");
}

export async function excluirUnidadeAction(unidadeId: string) {
  await exigirAdmin();
  const emUso = await prisma.usuario.count({ where: { unidadeId } });
  const emUso2 = await prisma.beneficiario.count({ where: { unidadeVinculoId: unidadeId } });
  const emUso3 = await prisma.viagem.count({ where: { unidadeSolicitanteId: unidadeId } });
  if (emUso + emUso2 + emUso3 > 0) {
    throw new Error("Esta unidade está em uso e não pode ser excluída.");
  }
  await prisma.unidade.delete({ where: { id: unidadeId } });
  revalidatePath("/admin/unidades");
}

// ---------------------------------------------------------------------------
// Usuários (demandantes / admins)
// ---------------------------------------------------------------------------

export async function criarUsuarioAction(formData: FormData) {
  await exigirAdmin();
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const cpf = String(formData.get("cpf") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const perfil = String(formData.get("perfil") ?? "DEMANDANTE") as "ADMIN" | "DEMANDANTE";
  const unidadeId = String(formData.get("unidadeId") ?? "") || null;

  if (!nome || !email || !cpf || !senha) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }
  if (!email.toLowerCase().endsWith("@uern.br")) {
    throw new Error("O email de acesso ao sistema precisa ser do domínio @uern.br.");
  }
  if (!cpfValido(cpf)) {
    throw new Error("CPF inválido.");
  }
  if (perfil === "DEMANDANTE" && !unidadeId) {
    throw new Error("Usuário demandante precisa estar vinculado a uma unidade.");
  }

  const senhaHash = await gerarHashSenha(senha);

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
  revalidatePath("/admin/usuarios");
}

export async function excluirUsuarioAction(usuarioId: string) {
  await exigirAdmin();
  await prisma.usuario.delete({ where: { id: usuarioId } });
  revalidatePath("/admin/usuarios");
}

/**
 * Permissões que o admin delega a um demandante especifico, sempre restritas
 * à própria unidade de vínculo dele (a action de importação/edição em si é
 * quem garante esse escopo — aqui só liga/desliga a permissão).
 */
export async function alterarPermissaoImportarUsuariosAction(usuarioId: string, ligado: boolean) {
  await exigirAdmin();
  await prisma.usuario.update({ where: { id: usuarioId }, data: { podeImportarUsuarios: ligado } });
  revalidatePath("/admin/usuarios");
}

export async function alterarPermissaoEditarBeneficiariosAction(usuarioId: string, ligado: boolean) {
  await exigirAdmin();
  await prisma.usuario.update({ where: { id: usuarioId }, data: { podeEditarBeneficiarios: ligado } });
  revalidatePath("/admin/usuarios");
}

// ---------------------------------------------------------------------------
// Categorias de beneficiário
// ---------------------------------------------------------------------------

export async function criarCategoriaAction(formData: FormData) {
  await exigirAdmin();
  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const limiteAnualDias = Number(formData.get("limiteAnualDias") ?? 60);
  const elegivelHospedagem = formData.get("elegivelHospedagem") === "on";
  const ordem = Number(formData.get("ordem") ?? 0);

  if (!nome) throw new Error("Informe o nome da categoria.");
  if (!Number.isFinite(limiteAnualDias) || limiteAnualDias <= 0) {
    throw new Error("Limite anual de dias inválido.");
  }

  await prisma.categoriaBeneficiario.create({
    data: { nome, descricao, limiteAnualDias, elegivelHospedagem, ordem },
  });
  revalidatePath("/admin/categorias");
}

export async function atualizarCategoriaAction(categoriaId: string, formData: FormData) {
  await exigirAdmin();
  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const limiteAnualDias = Number(formData.get("limiteAnualDias") ?? 60);
  const elegivelHospedagem = formData.get("elegivelHospedagem") === "on";
  const ordem = Number(formData.get("ordem") ?? 0);

  if (!nome) throw new Error("Informe o nome da categoria.");
  if (!Number.isFinite(limiteAnualDias) || limiteAnualDias <= 0) {
    throw new Error("Limite anual de dias inválido.");
  }
  if (!Number.isFinite(ordem)) throw new Error("Ordem de exibição inválida.");

  try {
    await prisma.categoriaBeneficiario.update({
      where: { id: categoriaId },
      data: { nome, descricao, limiteAnualDias, elegivelHospedagem, ordem },
    });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "";
    throw new Error(
      mensagem.includes("Unique constraint") ? "Já existe uma categoria com este nome." : mensagem,
    );
  }
  revalidatePath("/admin/categorias");
}

export async function excluirCategoriaAction(categoriaId: string) {
  await exigirAdmin();
  const emUso = await prisma.beneficiario.count({ where: { categoriaId } });
  if (emUso > 0) {
    throw new Error("Esta categoria está em uso por beneficiários e não pode ser excluída.");
  }
  await prisma.categoriaBeneficiario.delete({ where: { id: categoriaId } });
  revalidatePath("/admin/categorias");
}

// ---------------------------------------------------------------------------
// Tipos de destino
// ---------------------------------------------------------------------------

export async function criarTipoDestinoAction(formData: FormData) {
  await exigirAdmin();
  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const ordem = Number(formData.get("ordem") ?? 0);
  if (!nome) throw new Error("Informe o nome do tipo de destino.");

  await prisma.tipoDestino.create({ data: { nome, descricao, ordem } });
  revalidatePath("/admin/tipos-destino");
}

export async function atualizarTipoDestinoAction(tipoDestinoId: string, formData: FormData) {
  await exigirAdmin();
  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const ordem = Number(formData.get("ordem") ?? 0);

  if (!nome) throw new Error("Informe o nome do tipo de destino.");
  if (!Number.isFinite(ordem)) throw new Error("Ordem de exibição inválida.");

  try {
    await prisma.tipoDestino.update({
      where: { id: tipoDestinoId },
      data: { nome, descricao, ordem },
    });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "";
    throw new Error(
      mensagem.includes("Unique constraint") ? "Já existe um tipo de destino com este nome." : mensagem,
    );
  }
  revalidatePath("/admin/tipos-destino");
}

export async function excluirTipoDestinoAction(tipoDestinoId: string) {
  await exigirAdmin();
  const emUso = await prisma.pedidoDiaria.count({ where: { tipoDestinoId } });
  if (emUso > 0) {
    throw new Error("Este tipo de destino está em uso por pedidos e não pode ser excluído.");
  }
  await prisma.tipoDestino.delete({ where: { id: tipoDestinoId } });
  revalidatePath("/admin/tipos-destino");
}

// ---------------------------------------------------------------------------
// Enquadramento de atividade (taxonomia acadêmica/administrativa)
// ---------------------------------------------------------------------------

export async function criarEnquadramentoAction(formData: FormData) {
  await exigirAdmin();
  const categoria = String(formData.get("categoria") ?? "") as "ACADEMICA" | "ADMINISTRATIVA";
  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const exigeDetalhamento = formData.get("exigeDetalhamento") === "on";
  const exigeAnexo = formData.get("exigeAnexo") === "on";
  const ordem = Number(formData.get("ordem") ?? 0);

  if (categoria !== "ACADEMICA" && categoria !== "ADMINISTRATIVA") {
    throw new Error("Selecione a categoria (acadêmica ou administrativa).");
  }
  if (!nome) throw new Error("Informe o nome do enquadramento.");
  if (!Number.isFinite(ordem)) throw new Error("Ordem de exibição inválida.");

  try {
    await prisma.enquadramentoAtividade.create({
      data: { categoria, nome, descricao, exigeDetalhamento, exigeAnexo, ordem },
    });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "";
    throw new Error(
      mensagem.includes("Unique constraint")
        ? "Já existe um enquadramento com este nome nesta categoria."
        : mensagem,
    );
  }
  revalidatePath("/admin/enquadramentos");
}

export async function atualizarEnquadramentoAction(enquadramentoId: string, formData: FormData) {
  await exigirAdmin();
  const categoria = String(formData.get("categoria") ?? "") as "ACADEMICA" | "ADMINISTRATIVA";
  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const exigeDetalhamento = formData.get("exigeDetalhamento") === "on";
  const exigeAnexo = formData.get("exigeAnexo") === "on";
  const ativo = formData.get("ativo") === "on";
  const ordem = Number(formData.get("ordem") ?? 0);

  if (categoria !== "ACADEMICA" && categoria !== "ADMINISTRATIVA") {
    throw new Error("Selecione a categoria (acadêmica ou administrativa).");
  }
  if (!nome) throw new Error("Informe o nome do enquadramento.");
  if (!Number.isFinite(ordem)) throw new Error("Ordem de exibição inválida.");

  try {
    await prisma.enquadramentoAtividade.update({
      where: { id: enquadramentoId },
      data: { categoria, nome, descricao, exigeDetalhamento, exigeAnexo, ativo, ordem },
    });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "";
    throw new Error(
      mensagem.includes("Unique constraint")
        ? "Já existe um enquadramento com este nome nesta categoria."
        : mensagem,
    );
  }
  revalidatePath("/admin/enquadramentos");
}

export async function excluirEnquadramentoAction(enquadramentoId: string) {
  await exigirAdmin();
  const emUso = await prisma.atividade.count({ where: { enquadramentoId } });
  if (emUso > 0) {
    // Regulamentação muda; nunca remova um enquadramento já usado por
    // atividades existentes, só desative para não reaparecer em novos pedidos.
    await prisma.enquadramentoAtividade.update({
      where: { id: enquadramentoId },
      data: { ativo: false },
    });
  } else {
    await prisma.enquadramentoAtividade.delete({ where: { id: enquadramentoId } });
  }
  revalidatePath("/admin/enquadramentos");
}

// ---------------------------------------------------------------------------
// Valores de diária (matriz categoria x destino)
// ---------------------------------------------------------------------------

export async function definirValorDiariaAction(formData: FormData) {
  await exigirAdmin();
  const categoriaId = String(formData.get("categoriaId") ?? "");
  const tipoDestinoId = String(formData.get("tipoDestinoId") ?? "");
  const moeda = String(formData.get("moeda") ?? "BRL");
  const valorReais = Number(formData.get("valor") ?? "");

  if (!categoriaId || !tipoDestinoId || !Number.isFinite(valorReais) || valorReais < 0) {
    throw new Error("Preencha categoria, destino e um valor válido.");
  }

  const valorCentavos = Math.round(valorReais * 100);

  await prisma.valorDiaria.upsert({
    where: { categoriaId_tipoDestinoId: { categoriaId, tipoDestinoId } },
    update: { valorCentavos, moeda, vigenteDesde: new Date() },
    create: { categoriaId, tipoDestinoId, valorCentavos, moeda },
  });

  revalidatePath("/admin/valores");
}

// ---------------------------------------------------------------------------
// Configuração do sistema
// ---------------------------------------------------------------------------

export async function atualizarConfiguracaoAction(formData: FormData) {
  await exigirAdmin();

  const limiteMensalDiarias = Number(formData.get("limiteMensalDiarias"));
  const prazoMinimoDiasAntecedencia = Number(formData.get("prazoMinimoDiasAntecedencia"));
  const prazoRelatorioDiasUteis = Number(formData.get("prazoRelatorioDiasUteis"));
  const prazoDevolucaoDiasCorridos = Number(formData.get("prazoDevolucaoDiasCorridos"));
  const kmMinimoSemPernoite = Number(formData.get("kmMinimoSemPernoite"));
  const duracaoMinimaHoras = Number(formData.get("duracaoMinimaHoras"));

  const valores = [
    limiteMensalDiarias,
    prazoMinimoDiasAntecedencia,
    prazoRelatorioDiasUteis,
    prazoDevolucaoDiasCorridos,
    kmMinimoSemPernoite,
    duracaoMinimaHoras,
  ];
  if (valores.some((v) => !Number.isFinite(v) || v < 0)) {
    throw new Error("Todos os campos precisam ser números válidos e não negativos.");
  }

  await prisma.configuracaoSistema.update({
    where: { id: 1 },
    data: {
      limiteMensalDiarias,
      prazoMinimoDiasAntecedencia,
      prazoRelatorioDiasUteis,
      prazoDevolucaoDiasCorridos,
      kmMinimoSemPernoite,
      duracaoMinimaHoras,
    },
  });

  revalidatePath("/admin/configuracoes");
}

// ---------------------------------------------------------------------------
// Configuração da portaria de concessão de diária (delegação + assinantes)
// ---------------------------------------------------------------------------

export async function atualizarConfiguracaoPortariaAction(formData: FormData) {
  await exigirAdmin();

  const numeroPortariaDelegacao = String(formData.get("numeroPortariaDelegacao") ?? "").trim();
  const dataPortariaDelegacaoBruta = String(formData.get("dataPortariaDelegacao") ?? "").trim();
  const assinante1Nome = String(formData.get("assinante1Nome") ?? "").trim();
  const assinante1Cargo = String(formData.get("assinante1Cargo") ?? "").trim();
  const assinante2Nome = String(formData.get("assinante2Nome") ?? "").trim();
  const assinante2Cargo = String(formData.get("assinante2Cargo") ?? "").trim();

  if (
    !numeroPortariaDelegacao ||
    !dataPortariaDelegacaoBruta ||
    !assinante1Nome ||
    !assinante1Cargo ||
    !assinante2Nome ||
    !assinante2Cargo
  ) {
    throw new Error("Preencha todos os campos de delegação e assinantes.");
  }

  const dataPortariaDelegacao = new Date(dataPortariaDelegacaoBruta);
  if (Number.isNaN(dataPortariaDelegacao.getTime())) {
    throw new Error("Data da portaria de delegação inválida.");
  }

  await prisma.configuracaoSistema.update({
    where: { id: 1 },
    data: {
      numeroPortariaDelegacao,
      dataPortariaDelegacao,
      assinante1Nome,
      assinante1Cargo,
      assinante2Nome,
      assinante2Cargo,
    },
  });

  revalidatePath("/admin/configuracoes");
}

// ---------------------------------------------------------------------------
// Orçamento (opcional, apenas informativo)
// ---------------------------------------------------------------------------

export async function definirOrcamentoAction(formData: FormData) {
  await exigirAdmin();
  const unidadeId = String(formData.get("unidadeId") ?? "");
  const ano = Number(formData.get("ano") ?? "");
  const valorTotalReais = Number(formData.get("valorTotal") ?? "");

  if (!unidadeId || !Number.isFinite(ano) || !Number.isFinite(valorTotalReais)) {
    throw new Error("Preencha unidade, ano e valor válidos.");
  }

  await prisma.orcamentoUnidade.upsert({
    where: { unidadeId_ano: { unidadeId, ano } },
    update: { valorTotalCentavos: Math.round(valorTotalReais * 100) },
    create: {
      unidadeId,
      ano,
      valorTotalCentavos: Math.round(valorTotalReais * 100),
    },
  });

  revalidatePath("/admin/configuracoes");
}
