import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { criarContratoAction, excluirContratoAction } from "@/lib/actions/contratos";
import { formatarCnpj, formatarData, formatarMoeda } from "@/lib/formato";
import FormularioSimples from "../FormularioSimples";
import BotaoExcluir from "../BotaoExcluir";

const TIPO_LABEL: Record<string, string> = {
  HOSPEDAGEM: "Hospedagem",
  PASSAGEM_AEREA: "Passagem aérea",
  PASSAGEM_TERRESTRE: "Passagem terrestre",
};

export default async function ContratosPage() {
  const contratos = await prisma.contrato.findMany({
    orderBy: { createdAt: "desc" },
  });

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
              <tr key={c.id} className={c.ativo ? "" : "opacity-50"}>
                <td className="px-4 py-2 text-slate-600">{TIPO_LABEL[c.tipoBeneficio]}</td>
                <td className="px-4 py-2 text-slate-900">
                  {c.empresaNome}
                  <span className="block text-xs text-slate-400">{formatarCnpj(c.empresaCnpj)}</span>
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {c.numeroContrato} / SEI {c.numeroProcessoSei}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {formatarData(c.vigenciaInicio)} a {formatarData(c.vigenciaFim)}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {formatarMoeda(c.valorTotalCentavos, "BRL")}
                </td>
                <td className="px-4 py-2 text-slate-600">{c.ativo ? "Ativo" : "Inativo"}</td>
                <td className="px-4 py-2 space-y-1">
                  <Link
                    href={`/admin/contratos/${c.id}`}
                    className="block text-xs text-slate-600 underline"
                  >
                    Gerenciar cotas
                  </Link>
                  <BotaoExcluir action={excluirContratoAction} id={c.id} />
                </td>
              </tr>
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
