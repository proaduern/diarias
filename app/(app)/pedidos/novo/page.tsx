import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import NovoPedidoForm from "./NovoPedidoForm";

export default async function NovoPedidoPage() {
  const sessao = await obterSessao();
  if (!sessao) return null;

  // A lista aqui só filtra por `ativo` — a vigência do contrato é checada no
  // servidor contra a data de saída da viagem (que ainda não é conhecida
  // neste componente), não contra a data de hoje. Um contrato ativo mas
  // fora de vigência para a data escolhida é rejeitado só na submissão,
  // com mensagem clara.
  const [beneficiarios, tiposDestino, unidades, enquadramentos, config, contratosHospedagem, contratosPassagemAerea] =
    await Promise.all([
      prisma.beneficiario.findMany({
        where: { ativo: true },
        include: { categoria: { select: { elegivelHospedagem: true } } },
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
      prisma.contrato.findMany({
        where: { tipoBeneficio: "HOSPEDAGEM", ativo: true },
        orderBy: { empresaNome: "asc" },
      }),
      prisma.contrato.findMany({
        where: { tipoBeneficio: "PASSAGEM_AEREA", ativo: true },
        orderBy: { empresaNome: "asc" },
      }),
    ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Nova solicitação</h1>
      <NovoPedidoForm
        beneficiarios={beneficiarios}
        tiposDestino={tiposDestino}
        unidades={unidades}
        enquadramentos={enquadramentos}
        ehAdmin={sessao.perfil === "ADMIN"}
        prazoMinimoDias={config?.prazoMinimoDiasAntecedencia ?? 5}
        kmMinimo={config?.kmMinimoSemPernoite ?? 40}
        contratosHospedagem={contratosHospedagem}
        contratosPassagemAerea={contratosPassagemAerea}
      />
    </div>
  );
}
