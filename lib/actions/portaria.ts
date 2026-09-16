"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth";

/**
 * Valida os pré-requisitos e persiste os dados de emissão da portaria de
 * concessão de diária (processo SEI, ID da proposta, número/data da
 * portaria) no pedido, com trilha de auditoria (portariaEmitidaEm/Por). A
 * geração e o download do .docx em si acontecem em /api/pedidos/[id]/portaria,
 * a partir destes mesmos dados já persistidos — nunca de valores inventados
 * ou inferidos aqui.
 */
export async function emitirPortariaAction(pedidoId: string, formData: FormData) {
  const sessao = await exigirAdmin();

  const pedido = await prisma.pedidoDiaria.findUnique({
    where: { id: pedidoId },
    include: { viagem: { include: { beneficiario: true } } },
  });
  if (!pedido) throw new Error("Pedido não encontrado.");
  if (pedido.status !== "DEFERIDO") {
    throw new Error("A portaria só pode ser emitida para pedidos deferidos.");
  }
  if (pedido.valorUnitarioCentavos == null || pedido.valorTotalCentavos == null || pedido.diarias == null) {
    throw new Error("Pedido sem valores calculados — não é possível emitir a portaria.");
  }

  const config = await prisma.configuracaoSistema.findUniqueOrThrow({ where: { id: 1 } });
  const faltandoConfig: string[] = [];
  if (!config.numeroPortariaDelegacao || !config.dataPortariaDelegacao) {
    faltandoConfig.push("número/data da portaria de delegação de poderes");
  }
  if (!config.assinante1Nome || !config.assinante1Cargo) faltandoConfig.push("dados do 1º assinante");
  if (!config.assinante2Nome || !config.assinante2Cargo) faltandoConfig.push("dados do 2º assinante");
  if (faltandoConfig.length > 0) {
    throw new Error(
      `Configure em Configurações antes de emitir a portaria: ${faltandoConfig.join("; ")}.`,
    );
  }

  const beneficiario = pedido.viagem.beneficiario;
  if (beneficiario.unidadeVinculoId && (!beneficiario.matricula || !beneficiario.cargo)) {
    throw new Error(
      "Cadastre matrícula e cargo/função do beneficiário antes de emitir a portaria.",
    );
  }

  const numeroProcessoSei = String(formData.get("numeroProcessoSei") ?? "").trim();
  const idPropostaConcessao = String(formData.get("idPropostaConcessao") ?? "").trim();
  const portariaNumero = String(formData.get("portariaNumero") ?? "").trim();
  const portariaDataBruta = String(formData.get("portariaData") ?? "").trim();

  if (!numeroProcessoSei || !idPropostaConcessao || !portariaNumero || !portariaDataBruta) {
    throw new Error("Preencha processo SEI, ID da proposta, número e data da portaria.");
  }

  const portariaData = new Date(portariaDataBruta);
  if (Number.isNaN(portariaData.getTime())) {
    throw new Error("Data da portaria inválida.");
  }

  await prisma.pedidoDiaria.update({
    where: { id: pedidoId },
    data: {
      numeroProcessoSei,
      idPropostaConcessao,
      portariaNumero,
      portariaData,
      portariaEmitidaEm: new Date(),
      portariaEmitidaPor: sessao.nome,
    },
  });

  revalidatePath(`/pedidos/${pedido.viagemId}`);
}
