import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { formatarDataHora, formatarDiarias, formatarMoeda } from "@/lib/formato";

const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO_JUSTIFICATIVA_PRAZO: "Aguardando justificativa de prazo",
  AGUARDANDO_JUSTIFICATIVA_ATIVIDADE: "Aguardando justificativa do gestor",
  AGUARDANDO_DELIBERACAO_LIMITE: "Aguardando deliberação de limite",
  AGUARDANDO_DEFERIMENTO: "Aguardando deferimento",
  DEFERIDO: "Deferido",
  INDEFERIDO: "Indeferido",
};

export default async function PedidosPage() {
  const sessao = await obterSessao();
  if (!sessao) return null;

  const where =
    sessao.perfil === "ADMIN" ? {} : { unidadeSolicitanteId: sessao.unidadeId ?? "__nenhuma__" };

  const viagens = await prisma.viagem.findMany({
    where,
    include: {
      beneficiario: true,
      unidadeSolicitante: true,
      pedidosDiaria: true,
      pedidosHospedagem: true,
      pedidosPassagemAerea: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Pedidos</h1>
        <Link
          href="/pedidos/novo"
          className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244]"
        >
          Nova solicitação
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Beneficiário</th>
              <th className="px-4 py-2 font-medium">Unidade</th>
              <th className="px-4 py-2 font-medium">Saída</th>
              <th className="px-4 py-2 font-medium">Tipos / Valor</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {viagens.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link href={`/pedidos/${v.id}`} className="text-slate-900 underline">
                    {v.beneficiario.nome}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600">{v.unidadeSolicitante.nome}</td>
                <td className="px-4 py-2 text-slate-600">{formatarDataHora(v.saidaSede)}</td>
                <td className="px-4 py-2 text-slate-600">
                  <div className="space-y-1">
                    {v.pedidosDiaria.map((p) => (
                      <div key={p.id}>
                        Diária —{" "}
                        {p.valorTotalCentavos != null
                          ? formatarMoeda(p.valorTotalCentavos, "BRL")
                          : formatarDiarias(p.diarias ? Number(p.diarias) : null)}
                      </div>
                    ))}
                    {v.pedidosHospedagem.map((p) => (
                      <div key={p.id}>
                        Hospedagem
                        {p.valorTotalCentavos != null ? ` — ${formatarMoeda(p.valorTotalCentavos, "BRL")}` : ""}
                      </div>
                    ))}
                    {v.pedidosPassagemAerea.map((p) => (
                      <div key={p.id}>
                        Passagem aérea
                        {p.valorTotalCentavos != null ? ` — ${formatarMoeda(p.valorTotalCentavos, "BRL")}` : ""}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-col gap-1">
                    {[...v.pedidosDiaria, ...v.pedidosHospedagem, ...v.pedidosPassagemAerea].map((p) => (
                      <span
                        key={p.id}
                        className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"
                      >
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {viagens.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Nenhuma solicitação lançada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
