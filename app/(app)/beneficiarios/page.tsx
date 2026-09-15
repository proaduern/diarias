import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { formatarCpf } from "@/lib/formato";
import NovoBeneficiarioForm from "./NovoBeneficiarioForm";
import BotaoExcluirBeneficiario from "./BotaoExcluirBeneficiario";
import EditarBeneficiarioForm from "./EditarBeneficiarioForm";

export default async function BeneficiariosPage() {
  const sessao = await obterSessao();
  if (!sessao) return null;

  const [beneficiarios, categorias, unidades] = await Promise.all([
    prisma.beneficiario.findMany({
      include: { categoria: true, unidadeVinculo: true },
      orderBy: { nome: "asc" },
    }),
    prisma.categoriaBeneficiario.findMany({ orderBy: { ordem: "asc" } }),
    prisma.unidade.findMany({ orderBy: { nome: "asc" } }),
  ]);

  const modoAdmin = sessao.perfil === "ADMIN";
  const mostraColunaAcoes = modoAdmin || sessao.podeEditarBeneficiarios;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Beneficiários</h1>

      <NovoBeneficiarioForm categorias={categorias} unidades={unidades} />

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">CPF</th>
              <th className="px-4 py-2 font-medium">Categoria</th>
              <th className="px-4 py-2 font-medium">Vínculo</th>
              <th className="px-4 py-2 font-medium">Status</th>
              {mostraColunaAcoes && <th className="px-4 py-2 font-medium">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {beneficiarios.map((b) => {
              const podeEditar =
                modoAdmin ||
                (sessao.podeEditarBeneficiarios &&
                  sessao.unidadeId !== null &&
                  b.unidadeVinculoId === sessao.unidadeId);
              return (
                <tr key={b.id} className={b.ativo ? "" : "opacity-50"}>
                  <td className="px-4 py-2 text-slate-900">{b.nome}</td>
                  <td className="px-4 py-2 text-slate-600">{formatarCpf(b.cpf)}</td>
                  <td className="px-4 py-2 text-slate-600">{b.categoria.nome}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {b.unidadeVinculo?.nome ?? "Colaborador eventual (sem vínculo)"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {b.ativo ? "Ativo" : "Inativo"}
                  </td>
                  {mostraColunaAcoes && (
                    <td className="px-4 py-2 space-y-1">
                      {podeEditar && (
                        <EditarBeneficiarioForm
                          beneficiario={{
                            id: b.id,
                            nome: b.nome,
                            cpf: b.cpf,
                            banco: b.banco,
                            agencia: b.agencia,
                            contaCorrente: b.contaCorrente,
                            categoriaId: b.categoriaId,
                            unidadeVinculoId: b.unidadeVinculoId,
                          }}
                          categorias={categorias}
                          unidades={unidades}
                          modoAdmin={modoAdmin}
                        />
                      )}
                      {modoAdmin && (
                        <BotaoExcluirBeneficiario beneficiarioId={b.id} ativo={b.ativo} />
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {beneficiarios.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Nenhum beneficiário cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
