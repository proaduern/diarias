import { prisma } from "@/lib/prisma";
import { criarCategoriaAction, excluirCategoriaAction } from "@/lib/actions/admin";
import FormularioSimples from "../FormularioSimples";
import BotaoExcluir from "../BotaoExcluir";
import EditarCategoriaForm from "./EditarCategoriaForm";

export default async function CategoriasPage() {
  const categorias = await prisma.categoriaBeneficiario.findMany({
    orderBy: { ordem: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">
        Categorias de beneficiário
      </h1>
      <p className="text-sm text-slate-500">
        Cadastro livre — ajuste sempre que o decreto ou a portaria mudarem a
        estrutura de cargos/classes. O limite anual de dias (Art. 16) é
        definido por categoria: use 60 para o padrão geral e 90 para
        categorias equivalentes a motorista, por exemplo.
      </p>

      <FormularioSimples
        action={criarCategoriaAction}
        titulo="Nova categoria"
        campos={[
          { name: "nome", label: "Nome", required: true },
          { name: "descricao", label: "Descrição" },
          { name: "limiteAnualDias", label: "Limite anual de dias (Art. 16)", type: "number", required: true },
          { name: "elegivelHospedagem", label: "Elegível para hospedagem", type: "checkbox" },
          { name: "ordem", label: "Ordem de exibição", type: "number" },
        ]}
      />

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Descrição</th>
              <th className="px-4 py-2 font-medium">Limite anual (dias)</th>
              <th className="px-4 py-2 font-medium">Hospedagem</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categorias.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2 text-slate-900">{c.nome}</td>
                <td className="px-4 py-2 text-slate-600">{c.descricao ?? "-"}</td>
                <td className="px-4 py-2 text-slate-600">{c.limiteAnualDias}</td>
                <td className="px-4 py-2 text-slate-600">{c.elegivelHospedagem ? "Sim" : "Não"}</td>
                <td className="px-4 py-2 space-y-1">
                  <EditarCategoriaForm
                    categoria={{
                      id: c.id,
                      nome: c.nome,
                      descricao: c.descricao,
                      limiteAnualDias: c.limiteAnualDias,
                      elegivelHospedagem: c.elegivelHospedagem,
                      ordem: c.ordem,
                    }}
                  />
                  <BotaoExcluir action={excluirCategoriaAction} id={c.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
