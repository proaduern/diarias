import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { formatarCpf, formatarDataHora, formatarDiarias, formatarMoeda } from "@/lib/formato";
import { avaliarPrestacaoContas } from "@/lib/prestacao-contas";
import AcoesPedido from "./AcoesPedido";

const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO_JUSTIFICATIVA_PRAZO: "Aguardando justificativa de prazo",
  AGUARDANDO_DELIBERACAO_LIMITE: "Aguardando deliberação de limite (Art. 15/16)",
  AGUARDANDO_DEFERIMENTO: "Aguardando deferimento",
  DEFERIDO: "Deferido",
  INDEFERIDO: "Indeferido",
};

const PRESTACAO_LABEL: Record<string, string> = {
  EM_VIAGEM: "Viagem em andamento",
  AGUARDANDO_RELATORIO_NO_PRAZO: "Aguardando relatório de viagem (dentro do prazo)",
  RELATORIO_ATRASADO: "Relatório de viagem em atraso — bloqueia novos pedidos",
  DEVOLUCAO_PENDENTE: "Devolução de valores pendente — bloqueia novos pedidos",
  CONCLUIDO: "Prestação de contas concluída",
};

export default async function PedidoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessao = await obterSessao();
  if (!sessao) return null;

  const [pedido, config] = await Promise.all([
    prisma.pedidoDiaria.findUnique({
      where: { id },
      include: {
        beneficiario: { include: { categoria: true } },
        unidadeSolicitante: true,
        tipoDestino: true,
        anexos: true,
        aprovacoes: { include: { aprovador: true }, orderBy: { createdAt: "desc" } },
        criadoPor: true,
      },
    }),
    prisma.configuracaoSistema.findUnique({ where: { id: 1 } }),
  ]);

  if (!pedido || !config) notFound();

  if (sessao.perfil !== "ADMIN" && pedido.unidadeSolicitanteId !== sessao.unidadeId) {
    notFound();
  }

  const situacaoPrestacao =
    pedido.status === "DEFERIDO"
      ? avaliarPrestacaoContas(
          { chegadaSede: pedido.chegadaSede, relatorioEnviadoEm: pedido.relatorioEnviadoEm },
          new Date(),
          config.prazoRelatorioDiasUteis,
          config.prazoDevolucaoDiasCorridos,
        )
      : null;

  const comprovanteLimite = pedido.anexos.find((a) => a.tipo === "AUTORIZACAO_LIMITE");
  const relatorioViagem = pedido.anexos.find((a) => a.tipo === "RELATORIO_VIAGEM");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Pedido de diária — {pedido.beneficiario.nome}
        </h1>
        <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
          {STATUS_LABEL[pedido.status] ?? pedido.status}
        </span>
      </div>

      <section className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <Campo label="Beneficiário" valor={pedido.beneficiario.nome} />
        <Campo label="CPF" valor={formatarCpf(pedido.beneficiario.cpf)} />
        <Campo label="Categoria" valor={pedido.beneficiario.categoria.nome} />
        <Campo label="Unidade solicitante" valor={pedido.unidadeSolicitante.nome} />
        <Campo label="Município de destino" valor={pedido.municipioDestino} />
        <Campo label="Tipo de destino" valor={pedido.tipoDestino.nome} />
        <Campo label="Finalidade" valor={pedido.finalidade} />
        <Campo label="Distância declarada" valor={`${pedido.kmDeclarado} km`} />
        <Campo label="Saída da sede" valor={formatarDataHora(pedido.saidaSede)} />
        <Campo label="Chegada ao destino" valor={formatarDataHora(pedido.chegadaDestino)} />
        <Campo label="Saída do destino" valor={formatarDataHora(pedido.saidaDestino)} />
        <Campo label="Chegada à sede" valor={formatarDataHora(pedido.chegadaSede)} />
        <Campo label="Noites" valor={String(pedido.noites ?? "-")} />
        <Campo
          label="Última noite qualifica pernoite"
          valor={pedido.ultimaNoiteQualifica ? "Sim" : "Não"}
        />
        <Campo
          label="Diárias calculadas"
          valor={formatarDiarias(pedido.diarias ? Number(pedido.diarias) : null)}
        />
        <Campo
          label="Valor total"
          valor={
            pedido.valorTotalCentavos != null
              ? formatarMoeda(pedido.valorTotalCentavos, "BRL")
              : "-"
          }
        />
        {pedido.justificativaPrazoCurto && (
          <div className="sm:col-span-2">
            <Campo
              label="Justificativa de prazo curto"
              valor={pedido.justificativaPrazoCurto}
            />
          </div>
        )}
      </section>

      {situacaoPrestacao && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">
            Prestação de contas
          </h2>
          <p className="text-sm text-slate-700">
            {PRESTACAO_LABEL[situacaoPrestacao.situacao]}
          </p>
          {relatorioViagem && (
            <p className="mt-1 text-xs text-slate-500">
              Relatório enviado em {formatarDataHora(pedido.relatorioEnviadoEm!)}.{" "}
              <a
                href={`/api/anexos/${relatorioViagem.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-slate-700"
              >
                Abrir {relatorioViagem.nomeArquivo}
              </a>
            </p>
          )}
        </section>
      )}

      {comprovanteLimite && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">
            Comprovante de autorização anexado
          </h2>
          <p className="text-sm text-slate-600">
            <a
              href={`/api/anexos/${comprovanteLimite.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-700"
            >
              {comprovanteLimite.nomeArquivo}
            </a>
          </p>
        </section>
      )}

      <AcoesPedido
        pedido={{
          id: pedido.id,
          status: pedido.status,
          relatorioEnviadoEm: pedido.relatorioEnviadoEm,
          pendenciaRegularizadaEm: pedido.pendenciaRegularizadaEm,
        }}
        situacaoPrestacao={situacaoPrestacao?.situacao ?? null}
        ehAdmin={sessao.perfil === "ADMIN"}
        temComprovanteLimite={Boolean(comprovanteLimite)}
      />

      {pedido.aprovacoes.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Histórico</h2>
          <ul className="space-y-1 text-sm text-slate-600">
            {pedido.aprovacoes.map((a) => (
              <li key={a.id}>
                {a.decisao} por {a.aprovador.nome} em {formatarDataHora(a.createdAt)}
                {a.motivo ? ` — ${a.motivo}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm text-slate-900">{valor}</p>
    </div>
  );
}
