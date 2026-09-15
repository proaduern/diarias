import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/formato";
import EditarContratoForm from "./EditarContratoForm";
import CotasContratoSection from "./CotasContratoSection";

export default async function ContratoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [contrato, unidades] = await Promise.all([
    prisma.contrato.findUnique({
      where: { id },
      include: {
        cotasPorUnidade: { include: { unidade: true }, orderBy: { unidade: { nome: "asc" } } },
        pedidosHospedagem: { select: { valorTotalCentavos: true, status: true } },
        pedidosPassagemAerea: { select: { valorTotalCentavos: true, status: true } },
      },
    }),
    prisma.unidade.findMany({ orderBy: { nome: "asc" } }),
  ]);

  if (!contrato) notFound();

  const consumidoCentavos = [...contrato.pedidosHospedagem, ...contrato.pedidosPassagemAerea]
    .filter((p) => p.status !== "INDEFERIDO" && p.valorTotalCentavos != null)
    .reduce((soma, p) => soma + (p.valorTotalCentavos ?? 0), 0);

  const saldoDisponivel = contrato.valorTotalCentavos - consumidoCentavos;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">
        Contrato — {contrato.empresaNome}
      </h1>

      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-white shadow-sm p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-slate-500">Valor total do contrato</p>
          <p className="text-sm text-slate-900">{formatarMoeda(contrato.valorTotalCentavos, "BRL")}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Consumido (pedidos não indeferidos)</p>
          <p className="text-sm text-slate-900">{formatarMoeda(consumidoCentavos, "BRL")}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Saldo disponível</p>
          <p className="text-sm text-slate-900">{formatarMoeda(saldoDisponivel, "BRL")}</p>
        </div>
      </section>

      <EditarContratoForm
        contrato={{
          id: contrato.id,
          tipoBeneficio: contrato.tipoBeneficio,
          empresaNome: contrato.empresaNome,
          empresaCnpj: contrato.empresaCnpj,
          numeroContrato: contrato.numeroContrato,
          numeroProcessoSei: contrato.numeroProcessoSei,
          vigenciaInicio: contrato.vigenciaInicio,
          vigenciaFim: contrato.vigenciaFim,
          valorTotalCentavos: contrato.valorTotalCentavos,
          ativo: contrato.ativo,
        }}
      />

      <CotasContratoSection
        contratoId={contrato.id}
        unidades={unidades}
        cotas={contrato.cotasPorUnidade.map((c) => ({
          id: c.id,
          unidadeId: c.unidadeId,
          unidadeNome: c.unidade.nome,
          cotaCentavos: c.cotaCentavos,
        }))}
      />
    </div>
  );
}
