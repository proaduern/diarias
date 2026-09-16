import { prisma } from "@/lib/prisma";
import { criarContratoAction } from "@/lib/actions/contratos";
import FormularioSimples from "../FormularioSimples";
import ContratoLinha from "./ContratoLinha";

export default async function ContratosPage() {
  const [contratos, unidades] = await Promise.all([
    prisma.contrato.findMany({
      include: {
        cotasPorUnidade: { include: { unidade: true }, orderBy: { unidade: { nome: "asc" } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.unidade.findMany({ orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Contratos</h1>
      <p className="text-sm text-slate-500">
        Cadastro de contratos de hospedagem, passagem aérea e passagem terrestre
        (esta última ainda sem tipo de pedido próprio). Todos os campos são
        editáveis — contratos recebem aditivos de valor/duração, ou trocam de
        empresa por completo em rescisão/não-renovação.
      </p>

      <FormularioSimples
        action={criarContratoAction}
        titulo="Novo contrato"
        campos={[
          {
            name: "tipoBeneficio",
            label: "Tipo de benefício",
            required: true,
            options: [
              { value: "HOSPEDAGEM", label: "Hospedagem" },
              { value: "PASSAGEM_AEREA", label: "Passagem aérea" },
              { value: "PASSAGEM_TERRESTRE", label: "Passagem terrestre" },
            ],
          },
          { name: "empresaNome", label: "Empresa contratada", required: true },
          { name: "empresaCnpj", label: "CNPJ", required: true },
          { name: "numeroContrato", label: "Número do contrato", required: true },
          { name: "numeroProcessoSei", label: "Número do processo SEI", required: true },
          { name: "vigenciaInicio", label: "Vigência — início", type: "date", required: true },
          { name: "vigenciaFim", label: "Vigência — fim", type: "date", required: true },
          { name: "valorTotal", label: "Valor total do contrato (R$)", type: "number", required: true },
        ]}
      />

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Empresa</th>
              <th className="px-4 py-2 font-medium">Contrato / SEI</th>
              <th className="px-4 py-2 font-medium">Vigência</th>
              <th className="px-4 py-2 font-medium">Valor total</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contratos.map((c) => (
              <ContratoLinha
                key={c.id}
                contrato={{
                  id: c.id,
                  tipoBeneficio: c.tipoBeneficio,
                  empresaNome: c.empresaNome,
                  empresaCnpj: c.empresaCnpj,
                  numeroContrato: c.numeroContrato,
                  numeroProcessoSei: c.numeroProcessoSei,
                  vigenciaInicio: c.vigenciaInicio,
                  vigenciaFim: c.vigenciaFim,
                  valorTotalCentavos: c.valorTotalCentavos,
                  ativo: c.ativo,
                }}
                unidades={unidades}
                cotas={c.cotasPorUnidade.map((cota) => ({
                  id: cota.id,
                  unidadeId: cota.unidadeId,
                  unidadeNome: cota.unidade.nome,
                  cotaCentavos: cota.cotaCentavos,
                }))}
              />
            ))}
            {contratos.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Nenhum contrato cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
