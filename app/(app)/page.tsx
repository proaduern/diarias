import Link from "next/link";
import { obterSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const sessao = await obterSessao();
  if (!sessao) return null;

  const where =
    sessao.perfil === "ADMIN"
      ? {}
      : { unidadeSolicitanteId: sessao.unidadeId ?? "__nenhuma__" };

  const [total, aguardandoDeferimento, aguardandoJustificativa, aguardandoDeliberacao] =
    await Promise.all([
      prisma.pedidoDiaria.count({ where }),
      prisma.pedidoDiaria.count({
        where: { ...where, status: "AGUARDANDO_DEFERIMENTO" },
      }),
      prisma.pedidoDiaria.count({
        where: { ...where, status: "AGUARDANDO_JUSTIFICATIVA_PRAZO" },
      }),
      prisma.pedidoDiaria.count({
        where: { ...where, status: "AGUARDANDO_DELIBERACAO_LIMITE" },
      }),
    ]);

  const cards = [
    { label: "Total de pedidos", valor: total },
    { label: "Aguardando deferimento", valor: aguardandoDeferimento },
    { label: "Aguardando justificativa de prazo", valor: aguardandoJustificativa },
    { label: "Aguardando deliberação de limite", valor: aguardandoDeliberacao },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Início</h1>
        <Link
          href="/pedidos/novo"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Novo pedido de diária
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <p className="text-2xl font-semibold text-slate-900">{c.valor}</p>
            <p className="text-sm text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <Link href="/pedidos" className="text-sm font-medium text-slate-700 underline">
          Ver todos os pedidos →
        </Link>
      </div>
    </div>
  );
}
