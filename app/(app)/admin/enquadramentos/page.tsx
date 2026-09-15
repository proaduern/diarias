import { prisma } from "@/lib/prisma";
import { excluirEnquadramentoAction } from "@/lib/actions/admin";
import BotaoExcluir from "../BotaoExcluir";
import NovoEnquadramentoForm from "./NovoEnquadramentoForm";
import EditarEnquadramentoForm from "./EditarEnquadramentoForm";

const CATEGORIA_LABEL: Record<string, string> = {
  ACADEMICA: "Acadêmica",
  ADMINISTRATIVA: "Administrativa",
};

export default async function EnquadramentosPage() {
  const enquadramentos = await prisma.enquadramentoAtividade.findMany({
    orderBy: [{ categoria: "asc" }, { ordem: "asc" }],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">
        Enquadramento de atividades
      </h1>
      <p className="text-sm text-slate-500">
        Taxonomia usada na programação de atividades vinculada aos pedidos.
        Ajuste sempre que a regulamentação mudar — os pedidos referenciam
        estes registros, não um texto fixo no código.
      </p>

      <NovoEnquadramentoForm />

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Categoria</th>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Descrição</th>
              <th className="px-4 py-2 font-medium">Exige</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {enquadramentos.map((e) => (
              <tr key={e.id} className={e.ativo ? "" : "opacity-50"}>
                <td className="px-4 py-2 text-slate-600">{CATEGORIA_LABEL[e.categoria]}</td>
                <td className="px-4 py-2 text-slate-900">{e.nome}</td>
                <td className="px-4 py-2 text-slate-600">{e.descricao ?? "-"}</td>
                <td className="px-4 py-2 text-slate-600">
                  {[e.exigeDetalhamento && "Detalhamento", e.exigeAnexo && "Anexo"]
                    .filter(Boolean)
                    .join(", ") || "-"}
                </td>
                <td className="px-4 py-2 text-slate-600">{e.ativo ? "Ativo" : "Inativo"}</td>
                <td className="px-4 py-2 space-y-1">
                  <EditarEnquadramentoForm
                    enquadramento={{
                      id: e.id,
                      categoria: e.categoria,
                      nome: e.nome,
                      descricao: e.descricao,
                      exigeDetalhamento: e.exigeDetalhamento,
                      exigeAnexo: e.exigeAnexo,
                      ativo: e.ativo,
                      ordem: e.ordem,
                    }}
                  />
                  <BotaoExcluir action={excluirEnquadramentoAction} id={e.id} />
                </td>
              </tr>
            ))}
            {enquadramentos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Nenhum enquadramento cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
