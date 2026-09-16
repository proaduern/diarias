import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/formato";
import ConfiguracaoForm from "./ConfiguracaoForm";
import PortariaConfigForm from "./PortariaConfigForm";
import OrcamentoForm from "./OrcamentoForm";

export default async function ConfiguracoesPage() {
  const [config, unidades, orcamentos] = await Promise.all([
    prisma.configuracaoSistema.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.unidade.findMany({ orderBy: { nome: "asc" } }),
    prisma.orcamentoUnidade.findMany({
      include: { unidade: true },
      orderBy: [{ ano: "desc" }],
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">
        Configurações do sistema
      </h1>

      <ConfiguracaoForm config={config} />

      <PortariaConfigForm config={config} />

      <div className="space-y-3 rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Orçamento por unidade (opcional — apenas acompanhamento, não trava
          pedidos)
        </h2>
        <OrcamentoForm unidades={unidades} />

        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1 font-medium">Unidade</th>
              <th className="py-1 font-medium">Ano</th>
              <th className="py-1 font-medium">Valor total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orcamentos.map((o) => (
              <tr key={o.id}>
                <td className="py-1 text-slate-900">{o.unidade.nome}</td>
                <td className="py-1 text-slate-600">{o.ano}</td>
                <td className="py-1 text-slate-600">
                  {formatarMoeda(o.valorTotalCentavos, "BRL")}
                </td>
              </tr>
            ))}
            {orcamentos.length === 0 && (
              <tr>
                <td colSpan={3} className="py-3 text-center text-slate-400">
                  Nenhum orçamento cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
