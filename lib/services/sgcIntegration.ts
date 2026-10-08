import { prisma } from "@/lib/prisma";
import type { TipoBeneficioContrato } from "@prisma/client";

const SGC_BASE_URL = process.env.SGC_URL || "http://localhost:3000";
const SERVICE_KEY = process.env.PROAD_SERVICE_KEY || "proad_interop_internal_service_key_2026_uern";

export interface ContratoSgcViagem {
  id: string;
  numeroContrato: string;
  processoSei: string;
  objeto: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  valorAtualizado: number;
  valorTotalCentavos: number;
  saldoDisponivel: number;
  saldoDisponivelCentavos: number;
  tipoBeneficio: "HOSPEDAGEM" | "PASSAGEM_AEREA" | "PASSAGEM_TERRESTRE";
  fornecedor: {
    razaoSocial: string;
    cnpj: string;
    email: string;
    telefone?: string;
  };
}

/**
 * Consulta contratos ativos de passagens aéreas e hospedagem no SGC.
 */
export async function consultarContratosViagensSgc(): Promise<ContratoSgcViagem[]> {
  try {
    const res = await fetch(`${SGC_BASE_URL}/api/integracao/diarias/contratos`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.warn(`[SGC Diárias Interop] Status ${res.status} ao consultar contratos.`);
      return [];
    }

    const data = await res.json();
    return data.contratos || [];
  } catch (error) {
    console.error("[SGC Diárias Interop] Erro de rede ao conectar com SGC:", error);
    return [];
  }
}

/**
 * Importa ou atualiza os contratos do SGC para o banco do sistema de Diárias.
 */
export async function sincronizarContratosSgcComDiarias(): Promise<{
  importados: number;
  atualizados: number;
  detalhes: any[];
}> {
  const contratosSgc = await consultarContratosViagensSgc();
  let importados = 0;
  let atualizados = 0;
  const detalhes: any[] = [];

  for (const c of contratosSgc) {
    let tipo: TipoBeneficioContrato = "PASSAGEM_AEREA";
    if (c.tipoBeneficio === "HOSPEDAGEM") tipo = "HOSPEDAGEM";
    if (c.tipoBeneficio === "PASSAGEM_TERRESTRE") tipo = "PASSAGEM_TERRESTRE";

    const existente = await prisma.contrato.findFirst({
      where: {
        OR: [
          { numeroContrato: c.numeroContrato },
          { numeroProcessoSei: c.processoSei },
        ],
      },
    });

    if (existente) {
      await prisma.contrato.update({
        where: { id: existente.id },
        data: {
          empresaNome: c.fornecedor.razaoSocial,
          empresaCnpj: c.fornecedor.cnpj,
          valorTotalCentavos: c.valorTotalCentavos,
          vigenciaInicio: new Date(c.vigenciaInicio),
          vigenciaFim: new Date(c.vigenciaFim),
          ativo: true,
        },
      });
      atualizados++;
      detalhes.push({ numero: c.numeroContrato, acao: "ATUALIZADO" });
    } else {
      await prisma.contrato.create({
        data: {
          tipoBeneficio: tipo,
          empresaNome: c.fornecedor.razaoSocial,
          empresaCnpj: c.fornecedor.cnpj,
          numeroContrato: c.numeroContrato,
          numeroProcessoSei: c.processoSei,
          vigenciaInicio: new Date(c.vigenciaInicio),
          vigenciaFim: new Date(c.vigenciaFim),
          valorTotalCentavos: c.valorTotalCentavos,
          ativo: true,
        },
      });
      importados++;
      detalhes.push({ numero: c.numeroContrato, acao: "IMPORTADO" });
    }
  }

  return { importados, atualizados, detalhes };
}
