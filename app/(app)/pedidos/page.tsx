import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { formatarDataHora, formatarDiarias, formatarMoeda } from "@/lib/formato";

const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO_PROCESSO_SEI: "Aguardando nº Processo SEI (Unidade)",
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
              <th className="px-4 py-2 font-medium">Processo SEI</th>
              <th className="px-4 py-2 font-medium">Saída</th>
              <th className="px-4 py-2 font-medium">Tipos / Valor</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {viagens.map((v) => {
              const sei = v.numeroProcessoSei ?? v.pedidosDiaria[0]?.numeroProcessoSei ?? null;
              return (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <div className="flex flex-col items-start gap-1">
                      <Link href={`/pedidos/${v.id}`} className="font-medium text-slate-900 underline">
                        {v.beneficiario.nome}
                      </Link>
                      <div className="flex flex-wrap gap-1">
                        {v.retificadaEm && (
                          <span className="inline-block rounded-md bg-blue-50 border border-blue-200 px-1.5 py-0.2 text-[10px] font-semibold text-blue-800">
                            Retificada
                          </span>
                        )}
                        {v.pedidosDiaria.some((p) => p.valorComplementarCentavos != null && p.valorComplementarCentavos > 0) && (
                          <span className="inline-block rounded-md bg-emerald-50 border border-emerald-300 px-1.5 py-0.2 text-[10px] font-bold text-emerald-900">
                            Complemento
                          </span>
                        )}
                        {v.pedidosDiaria.some(
                          (p) => p.valorDevolucaoCentavos != null && p.valorDevolucaoCentavos > 0 && !p.devolucaoConfirmadaEm,
                        ) && (
                          <span className="inline-block rounded-md bg-amber-50 border border-amber-300 px-1.5 py-0.2 text-[10px] font-bold text-amber-900">
                            Devolução Pendente
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{v.unidadeSolicitante.nome}</td>
                  <td className="px-4 py-2">
                    {sei ? (
                      <span className="inline-block rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-800">
                        {sei}
                      </span>
                    ) : (
                      <Link
                        href={`/pedidos/${v.id}`}
                        className="inline-block rounded-lg bg-amber-50 border border-amber-300 px-2 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                      >
                        Informar SEI p/ Concluir →
                      </Link>
                    )}
                  </td>
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
                          className={`rounded-full px-2 py-1 text-xs ${
                            p.status === "AGUARDANDO_PROCESSO_SEI"
                              ? "bg-amber-100 text-amber-900 font-semibold"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
            {viagens.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
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
