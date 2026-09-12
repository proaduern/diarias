import { prisma } from "@/lib/prisma";
import { criarUnidadeAction, excluirUnidadeAction } from "@/lib/actions/admin";
import FormularioSimples from "../FormularioSimples";
import BotaoExcluir from "../BotaoExcluir";

export default async function UnidadesPage() {
  const unidades = await prisma.unidade.findMany({ orderBy: { nome: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Unidades</h1>

      <FormularioSimples
        action={criarUnidadeAction}
        titulo="Nova unidade"
        campos={[
          { name: "nome", label: "Nome", required: true },
          { name: "email", label: "Email", type: "email", required: true },
        ]}
      />

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {unidades.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2 text-slate-900">{u.nome}</td>
                <td className="px-4 py-2 text-slate-600">{u.email}</td>
                <td className="px-4 py-2">
                  <BotaoExcluir action={excluirUnidadeAction} id={u.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
