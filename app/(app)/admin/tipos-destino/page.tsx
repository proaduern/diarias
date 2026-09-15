import { prisma } from "@/lib/prisma";
import { criarTipoDestinoAction, excluirTipoDestinoAction } from "@/lib/actions/admin";
import FormularioSimples from "../FormularioSimples";
import BotaoExcluir from "../BotaoExcluir";
import EditarTipoDestinoForm from "./EditarTipoDestinoForm";

export default async function TiposDestinoPage() {
  const tipos = await prisma.tipoDestino.findMany({ orderBy: { ordem: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Tipos de destino</h1>
      <p className="text-sm text-slate-500">
        Cadastro livre — usado para determinar a faixa de valor da diária.
        Lembrete da Portaria 293/2020-GP/FUERN: viagens a Natal ou Mossoró
        usam a faixa &quot;Outras Cidades do Brasil&quot;, não &quot;Interior do RN&quot;.
      </p>

      <FormularioSimples
        action={criarTipoDestinoAction}
        titulo="Novo tipo de destino"
        campos={[
          { name: "nome", label: "Nome", required: true },
          { name: "descricao", label: "Descrição" },
          { name: "ordem", label: "Ordem de exibição", type: "number" },
        ]}
      />

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Descrição</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tipos.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-2 text-slate-900">{t.nome}</td>
                <td className="px-4 py-2 text-slate-600">{t.descricao ?? "-"}</td>
                <td className="px-4 py-2 space-y-1">
                  <EditarTipoDestinoForm
                    tipo={{ id: t.id, nome: t.nome, descricao: t.descricao, ordem: t.ordem }}
                  />
                  <BotaoExcluir action={excluirTipoDestinoAction} id={t.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
