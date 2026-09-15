import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { formatarDataHora, formatarDiarias, formatarMoeda } from "@/lib/formato";

const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO_JUSTIFICATIVA_PRAZO: "Aguardando justificativa de prazo",
  AGUARDANDO_DELIBERACAO_LIMITE: "Aguardando deliberação de limite",
  AGUARDANDO_DEFERIMENTO: "Aguardando deferimento",
  DEFERIDO: "Deferido",
  INDEFERIDO: "Indeferido",
};

export default async function PedidosPage() {
  const sessao = await obterSessao();
  if (!sessao) return null;

  const where =
    sessao.perfil === "ADMIN"
      ? {}
      : { unidadeSolicitanteId: sessao.unidadeId ?? "__nenhuma__" };

  const pedidos = await prisma.pedidoDiaria.findMany({
    where,
    include: { beneficiario: true, unidadeSolicitante: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Pedidos de diária</h1>
        <Link
          href="/pedidos/novo"
          className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244]"
        >
          Novo pedido
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Beneficiário</th>
              <th className="px-4 py-2 font-medium">Unidade</th>
              <th className="px-4 py-2 font-medium">Saída</th>
              <th className="px-4 py-2 font-medium">Diárias</th>
              <th className="px-4 py-2 font-medium">Valor</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pedidos.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link href={`/pedidos/${p.id}`} className="text-slate-900 underline">
                    {p.beneficiario.nome}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600">{p.unidadeSolicitante.nome}</td>
                <td className="px-4 py-2 text-slate-600">
                  {formatarDataHora(p.saidaSede)}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {formatarDiarias(p.diarias ? Number(p.diarias) : null)}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {p.valorTotalCentavos != null
                    ? formatarMoeda(p.valorTotalCentavos, "BRL")
                    : "-"}
                </td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </td>
              </tr>
            ))}
            {pedidos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Nenhum pedido lançado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
