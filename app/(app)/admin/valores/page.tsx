import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/formato";
import ValorForm from "./ValorForm";

export default async function ValoresPage() {
  const [categorias, tiposDestino, valores] = await Promise.all([
    prisma.categoriaBeneficiario.findMany({ orderBy: { ordem: "asc" } }),
    prisma.tipoDestino.findMany({ orderBy: { ordem: "asc" } }),
    prisma.valorDiaria.findMany(),
  ]);

  const mapaValores = new Map(
    valores.map((v) => [`${v.categoriaId}:${v.tipoDestinoId}`, v]),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">
        Matriz de valores de diária
      </h1>
      <p className="text-sm text-slate-500">
        Um valor por combinação de categoria × tipo de destino. Clique em uma
        célula para editar. Fonte inicial: Portaria 293/2020-GP/FUERN, Anexo
        I (vigente).
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Categoria \ Destino</th>
              {tiposDestino.map((t) => (
                <th key={t.id} className="px-4 py-2 font-medium">
                  {t.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categorias.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2 font-medium text-slate-900">{c.nome}</td>
                {tiposDestino.map((t) => {
                  const valor = mapaValores.get(`${c.id}:${t.id}`);
                  return (
                    <td key={t.id} className="px-4 py-2">
                      <ValorForm
                        categoriaId={c.id}
                        tipoDestinoId={t.id}
                        valorAtual={valor ? valor.valorCentavos / 100 : null}
                        moedaAtual={valor?.moeda ?? (t.nome.startsWith("Exterior") ? "USD" : "BRL")}
                        label={
                          valor
                            ? formatarMoeda(valor.valorCentavos, valor.moeda)
                            : "não definido"
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
