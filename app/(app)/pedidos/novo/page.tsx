import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import NovoPedidoForm from "./NovoPedidoForm";

export default async function NovoPedidoPage() {
  const sessao = await obterSessao();
  if (!sessao) return null;

  const [beneficiarios, tiposDestino, unidades, enquadramentos, config] = await Promise.all([
    prisma.beneficiario.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    }),
    prisma.tipoDestino.findMany({ orderBy: { ordem: "asc" } }),
    sessao.perfil === "ADMIN"
      ? prisma.unidade.findMany({ orderBy: { nome: "asc" } })
      : Promise.resolve([]),
    prisma.enquadramentoAtividade.findMany({
      where: { ativo: true },
      orderBy: [{ categoria: "asc" }, { ordem: "asc" }],
    }),
    prisma.configuracaoSistema.findUnique({ where: { id: 1 } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Novo pedido de diária</h1>
      <NovoPedidoForm
        beneficiarios={beneficiarios}
        tiposDestino={tiposDestino}
        unidades={unidades}
        enquadramentos={enquadramentos}
        ehAdmin={sessao.perfil === "ADMIN"}
        prazoMinimoDias={config?.prazoMinimoDiasAntecedencia ?? 5}
        kmMinimo={config?.kmMinimoSemPernoite ?? 40}
      />
    </div>
  );
}
