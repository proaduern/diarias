import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { formatarCpf, formatarDataHora, formatarDiarias, formatarMoeda } from "@/lib/formato";
import { avaliarPrestacaoContas, type SituacaoPrestacaoContas } from "@/lib/prestacao-contas";
import AcoesPedido from "./AcoesPedido";
import type { TipoPedido } from "@/lib/actions/pedidos";

const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO_JUSTIFICATIVA_PRAZO: "Aguardando justificativa de prazo",
  AGUARDANDO_JUSTIFICATIVA_ATIVIDADE: "Aguardando justificativa do gestor (folga de atividade)",
  AGUARDANDO_DELIBERACAO_LIMITE: "Aguardando deliberação de limite (Art. 15/16)",
  AGUARDANDO_DEFERIMENTO: "Aguardando deferimento",
  DEFERIDO: "Deferido",
  INDEFERIDO: "Indeferido",
};

const CATEGORIA_ATIVIDADE_LABEL: Record<string, string> = {
  ACADEMICA: "Acadêmica",
  ADMINISTRATIVA: "Administrativa",
};

const PRESTACAO_LABEL: Record<string, string> = {
  EM_VIAGEM: "Viagem em andamento",
  AGUARDANDO_RELATORIO_NO_PRAZO: "Aguardando relatório de viagem (dentro do prazo)",
  RELATORIO_ATRASADO: "Relatório de viagem em atraso — bloqueia novos pedidos",
  DEVOLUCAO_PENDENTE: "Devolução de valores pendente — bloqueia novos pedidos",
  CONCLUIDO: "Prestação de contas concluída",
};

export default async function ViagemDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessao = await obterSessao();
  if (!sessao) return null;

  const [viagem, config] = await Promise.all([
    prisma.viagem.findUnique({
      where: { id },
      include: {
        beneficiario: { include: { categoria: true } },
        unidadeSolicitante: true,
        criadoPor: true,
        atividades: {
          include: { enquadramento: true, anexos: true },
          orderBy: { dataHoraInicio: "asc" },
        },
        pedidosDiaria: {
          include: {
            tipoDestino: true,
            anexos: true,
            aprovacoes: { include: { aprovador: true }, orderBy: { createdAt: "desc" } },
          },
        },
        pedidosHospedagem: {
          include: {
            anexos: true,
            aprovacoes: { include: { aprovador: true }, orderBy: { createdAt: "desc" } },
          },
        },
        pedidosPassagemAerea: {
          include: {
            anexos: true,
            aprovacoes: { include: { aprovador: true }, orderBy: { createdAt: "desc" } },
          },
        },
      },
    }),
    prisma.configuracaoSistema.findUnique({ where: { id: 1 } }),
  ]);

  if (!viagem || !config) notFound();

  if (sessao.perfil !== "ADMIN" && viagem.unidadeSolicitanteId !== sessao.unidadeId) {
    notFound();
  }

  const ehAdmin = sessao.perfil === "ADMIN";

  const pedidos: {
    tipo: TipoPedido;
    label: string;
    pedido:
      | (typeof viagem.pedidosDiaria)[number]
      | (typeof viagem.pedidosHospedagem)[number]
      | (typeof viagem.pedidosPassagemAerea)[number];
  }[] = [
    ...viagem.pedidosDiaria.map((p) => ({ tipo: "DIARIA" as const, label: "Diária", pedido: p })),
    ...viagem.pedidosHospedagem.map((p) => ({ tipo: "HOSPEDAGEM" as const, label: "Hospedagem", pedido: p })),
    ...viagem.pedidosPassagemAerea.map((p) => ({
      tipo: "PASSAGEM_AEREA" as const,
      label: "Passagem aérea",
      pedido: p,
    })),
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Solicitação de viagem — {viagem.beneficiario.nome}
        </h1>
        <div className="mt-1 flex flex-wrap gap-2">
          {pedidos.map(({ tipo, label, pedido }) => (
            <span
              key={tipo}
              className="inline-block rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"
            >
              {label}: {STATUS_LABEL[pedido.status] ?? pedido.status}
            </span>
          ))}
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-white shadow-sm p-4 sm:grid-cols-2">
        <Campo label="Beneficiário" valor={viagem.beneficiario.nome} />
        <Campo label="CPF" valor={formatarCpf(viagem.beneficiario.cpf)} />
        <Campo label="Categoria" valor={viagem.beneficiario.categoria.nome} />
        <Campo label="Unidade solicitante" valor={viagem.unidadeSolicitante.nome} />
        <Campo label="Sede" valor={`${viagem.sedeCidade}/${viagem.sedeEstado}`} />
        <Campo
          label="Município de destino"
          valor={`${viagem.municipioDestino}/${viagem.destinoEstado}`}
        />
        <Campo label="Finalidade" valor={viagem.finalidade} />
        <Campo label="Distância declarada" valor={`${viagem.kmDeclarado} km`} />
        {viagem.vaiBuscarAeroporto && (
          <div className="sm:col-span-2 rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Trecho aéreo</p>
            <p className="text-sm text-slate-900">
              Sede–aeroporto: {viagem.kmSedeAeroporto} km · Voo: {viagem.kmVoo} km ·
              Aeroporto–destino: {viagem.kmAeroportoDestino} km
            </p>
            {viagem.tempoViagemEstimadoMinutos != null && (
              <p className="text-xs text-slate-500">
                Tempo total estimado: {Math.round(viagem.tempoViagemEstimadoMinutos)} min
              </p>
            )}
          </div>
        )}
        <Campo label="Saída da sede" valor={formatarDataHora(viagem.saidaSede)} />
        <Campo label="Chegada ao destino" valor={formatarDataHora(viagem.chegadaDestino)} />
        <Campo label="Saída do destino" valor={formatarDataHora(viagem.saidaDestino)} />
        <Campo label="Chegada à sede" valor={formatarDataHora(viagem.chegadaSede)} />
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Programação de atividades</h2>
        <div className="space-y-3">
          {viagem.atividades.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">
                {CATEGORIA_ATIVIDADE_LABEL[a.enquadramento.categoria]} — {a.enquadramento.nome}
              </p>
              <p className="text-sm text-slate-900">{a.descricao}</p>
              {a.detalhamento && <p className="text-sm text-slate-600">{a.detalhamento}</p>}
              <p className="mt-1 text-xs text-slate-500">
                {formatarDataHora(a.dataHoraInicio)} até {formatarDataHora(a.dataHoraFim)}
              </p>
              {a.anexos.map((anexo) => (
                <p key={anexo.id} className="mt-1 text-xs">
                  <a
                    href={`/api/anexos/${anexo.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-slate-700"
                  >
                    Abrir anexo: {anexo.nomeArquivo}
                  </a>
                </p>
              ))}
            </div>
          ))}
        </div>
      </section>

      {pedidos.map(({ tipo, label, pedido }) => {
        const situacaoPrestacao: SituacaoPrestacaoContas | null =
          pedido.status === "DEFERIDO"
            ? avaliarPrestacaoContas(
                { chegadaSede: viagem.chegadaSede, relatorioEnviadoEm: pedido.relatorioEnviadoEm },
                new Date(),
                config.prazoRelatorioDiasUteis,
                config.prazoDevolucaoDiasCorridos,
              )
            : null;

        const comprovanteLimite = pedido.anexos.find((a) => a.tipo === "AUTORIZACAO_LIMITE");
        const relatorioViagem = pedido.anexos.find((a) => a.tipo === "RELATORIO_VIAGEM");

        return (
          <section
            key={tipo}
            className="space-y-4 rounded-2xl border border-slate-100 bg-white shadow-sm p-4"
          >
            <h2 className="text-sm font-semibold text-slate-900">
              Pedido de {label} — {STATUS_LABEL[pedido.status] ?? pedido.status}
            </h2>

            {tipo === "DIARIA" && "diarias" in pedido && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="Tipo de destino" valor={pedido.tipoDestino.nome} />
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
              </div>
            )}

            {(tipo === "HOSPEDAGEM" || tipo === "PASSAGEM_AEREA") && "valorCotadoEm" in pedido && (
              <Campo
                label="Valor cotado (fora do sistema)"
                valor={
                  pedido.valorTotalCentavos != null
                    ? `${formatarMoeda(pedido.valorTotalCentavos, "BRL")} — em ${formatarDataHora(pedido.valorCotadoEm!)}`
                    : "Ainda não informado"
                }
              />
            )}

            {pedido.justificativaPrazoCurto && (
              <Campo label="Justificativa de prazo curto" valor={pedido.justificativaPrazoCurto} />
            )}
            {pedido.justificativaGestorAtividade && (
              <Campo
                label="Justificativa do gestor (folga de atividade)"
                valor={pedido.justificativaGestorAtividade}
              />
            )}

            {situacaoPrestacao && (
              <div>
                <p className="text-xs font-medium text-slate-500">Prestação de contas</p>
                <p className="text-sm text-slate-700">{PRESTACAO_LABEL[situacaoPrestacao.situacao]}</p>
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
              </div>
            )}

            {comprovanteLimite && (
              <div>
                <p className="text-xs font-medium text-slate-500">Comprovante de autorização anexado</p>
                <a
                  href={`/api/anexos/${comprovanteLimite.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-slate-600 underline hover:text-slate-700"
                >
                  {comprovanteLimite.nomeArquivo}
                </a>
              </div>
            )}

            <AcoesPedido
              tipo={tipo}
              pedido={{
                id: pedido.id,
                status: pedido.status,
                relatorioEnviadoEm: pedido.relatorioEnviadoEm,
                pendenciaRegularizadaEm: pedido.pendenciaRegularizadaEm,
                valorTotalCentavos: "valorCotadoEm" in pedido ? pedido.valorTotalCentavos : undefined,
              }}
              situacaoPrestacao={situacaoPrestacao?.situacao ?? null}
              ehAdmin={ehAdmin}
              temComprovanteLimite={Boolean(comprovanteLimite)}
            />

            {pedido.aprovacoes.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">Histórico</p>
                <ul className="space-y-1 text-sm text-slate-600">
                  {pedido.aprovacoes.map((a) => (
                    <li key={a.id}>
                      {a.decisao} por {a.aprovador.nome} em {formatarDataHora(a.createdAt)}
                      {a.motivo ? ` — ${a.motivo}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        );
      })}
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
