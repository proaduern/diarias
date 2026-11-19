import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { formatarCpf, formatarDataHora, formatarDiarias, formatarMoeda } from "@/lib/formato";
import { avaliarPrestacaoContas, type SituacaoPrestacaoContas } from "@/lib/prestacao-contas";
import AcoesPedido from "./AcoesPedido";
import EmitirPortariaForm from "./EmitirPortariaForm";
import PainelKitSeiViagem from "./PainelKitSeiViagem";
import PainelRelatorioViagem from "./PainelRelatorioViagem";
import PainelChecklistPopSdhp from "./PainelChecklistPopSdhp";
import ModalAlterarProgramacao from "./ModalAlterarProgramacao";
import { garantirSequenciaisViagem } from "@/lib/sequencial-sdhp";
import { formatarFontePagadoraTexto } from "@/lib/templates/documentos-sdhp";
import { CalendarClock, Coins, RotateCcw } from "lucide-react";
import {
  gerarTextoCopiavelParaSei,
  obterBeneficiosSolicitadosLabel,
  type DadosRequerimentoViagemSei,
} from "@/lib/requerimento-sei-pdf";
import type { TipoPedido } from "@/lib/actions/pedidos";

const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO_PROCESSO_SEI: "Aguardando vínculo do Processo SEI pela Unidade",
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

  await garantirSequenciaisViagem(id);

  const [viagem, config, enquadramentos] = await Promise.all([
    prisma.viagem.findUnique({
      where: { id },
      include: {
        beneficiario: { include: { categoria: true } },
        unidadeSolicitante: true,
        criadoPor: true,
        alteracoes: {
          include: { solicitadoPor: true, analisadoPor: true, anexos: true },
          orderBy: { createdAt: "desc" },
        },
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
            contrato: true,
            anexos: true,
            aprovacoes: { include: { aprovador: true }, orderBy: { createdAt: "desc" } },
          },
        },
        pedidosPassagemAerea: {
          include: {
            contrato: true,
            anexos: true,
            aprovacoes: { include: { aprovador: true }, orderBy: { createdAt: "desc" } },
          },
        },
      },
    }),
    prisma.configuracaoSistema.findUnique({ where: { id: 1 } }),
    prisma.enquadramentoAtividade.findMany({ where: { ativo: true }, orderBy: { ordem: "asc" } }),
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

  const pDiaria = viagem.pedidosDiaria[0] ?? null;
  const pHosp = viagem.pedidosHospedagem[0] ?? null;
  const pPass = viagem.pedidosPassagemAerea[0] ?? null;

  const numeroProcessoSeiEfetivo = viagem.numeroProcessoSei ?? pDiaria?.numeroProcessoSei ?? null;
  const idDocumentoSeiEfetivo = viagem.idDocumentoSei ?? pDiaria?.idPropostaConcessao ?? null;
  const aguardandoProcessoSei =
    !numeroProcessoSeiEfetivo ||
    pedidos.some(({ pedido }) => pedido.status === "AGUARDANDO_PROCESSO_SEI");

  const dadosKitSei: DadosRequerimentoViagemSei = {
    viagemId: viagem.id,
    numeroProcessoSei: numeroProcessoSeiEfetivo,
    idDocumentoSei: idDocumentoSeiEfetivo,
    criadoEm: viagem.createdAt,
    retificadaEm: viagem.retificadaEm,
    unidadeSolicitante: {
      nome: viagem.unidadeSolicitante.nome,
      email: viagem.unidadeSolicitante.email,
    },
    beneficiario: {
      nome: viagem.beneficiario.nome,
      cpf: viagem.beneficiario.cpf,
      matricula: viagem.beneficiario.matricula,
      cargo: viagem.beneficiario.cargo,
      categoriaNome: viagem.beneficiario.categoria.nome,
      banco: viagem.beneficiario.banco,
      agencia: viagem.beneficiario.agencia,
      contaCorrente: viagem.beneficiario.contaCorrente,
    },
    roteiro: {
      sedeCidade: viagem.sedeCidade,
      sedeEstado: viagem.sedeEstado,
      municipioDestino: viagem.municipioDestino,
      destinoEstado: viagem.destinoEstado,
      kmDeclarado: viagem.kmDeclarado,
      vaiBuscarAeroporto: viagem.vaiBuscarAeroporto,
      kmSedeAeroporto: viagem.kmSedeAeroporto,
      kmVoo: viagem.kmVoo,
      kmAeroportoDestino: viagem.kmAeroportoDestino,
      tempoViagemEstimadoMinutos: viagem.tempoViagemEstimadoMinutos,
      saidaSede: viagem.saidaSede,
      chegadaDestino: viagem.chegadaDestino,
      saidaDestino: viagem.saidaDestino,
      chegadaSede: viagem.chegadaSede,
      finalidade: viagem.finalidade,
    },
    atividades: viagem.atividades.map((a) => ({
      categoria: a.enquadramento.categoria,
      enquadramentoNome: a.enquadramento.nome,
      descricao: a.descricao,
      detalhamento: a.detalhamento,
      dataHoraInicio: a.dataHoraInicio,
      dataHoraFim: a.dataHoraFim,
      anexosNomes: a.anexos.map((ax) => ax.nomeArquivo),
    })),
    pedidoDiaria: pDiaria
      ? {
          id: pDiaria.id,
          tipoDestinoNome: pDiaria.tipoDestino.nome,
          noites: pDiaria.noites,
          ultimaNoiteQualifica: pDiaria.ultimaNoiteQualifica,
          diarias: pDiaria.diarias ? Number(pDiaria.diarias) : null,
          valorUnitarioCentavos: pDiaria.valorUnitarioCentavos,
          valorTotalCentavos: pDiaria.valorTotalCentavos,
          justificativaPrazoCurto: pDiaria.justificativaPrazoCurto,
          justificativaGestorAtividade: pDiaria.justificativaGestorAtividade,
        }
      : null,
    pedidoHospedagem: pHosp
      ? {
          id: pHosp.id,
          empresaNome: pHosp.contrato.empresaNome,
          numeroContrato: pHosp.contrato.numeroContrato,
          valorTotalCentavos: pHosp.valorTotalCentavos,
          justificativaPrazoCurto: pHosp.justificativaPrazoCurto,
        }
      : null,
    pedidoPassagemAerea: pPass
      ? {
          id: pPass.id,
          empresaNome: pPass.contrato.empresaNome,
          numeroContrato: pPass.contrato.numeroContrato,
          valorTotalCentavos: pPass.valorTotalCentavos,
          justificativaPrazoCurto: pPass.justificativaPrazoCurto,
        }
      : null,
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Solicitação de viagem — {viagem.beneficiario.nome}
          </h1>
          <div className="mt-1 flex flex-wrap gap-2 items-center">
            {pedidos.map(({ tipo, label, pedido }) => (
              <span
                key={tipo}
                className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                  pedido.status === "AGUARDANDO_PROCESSO_SEI"
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {label}: {STATUS_LABEL[pedido.status] ?? pedido.status}
              </span>
            ))}
            {viagem.retificadaEm && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-900">
                <CalendarClock className="h-3 w-3 text-blue-700" />
                Programação Retificada
              </span>
            )}
          </div>
        </div>

        {/* Modal de Ajuste de Programação / Percurso */}
        <ModalAlterarProgramacao
          viagemId={viagem.id}
          jaDeferido={pedidos.some(({ pedido }) => pedido.status === "DEFERIDO")}
          saidaSedeAtual={viagem.saidaSede}
          chegadaDestinoAtual={viagem.chegadaDestino}
          saidaDestinoAtual={viagem.saidaDestino}
          chegadaSedeAtual={viagem.chegadaSede}
          atividadesAtuais={viagem.atividades.map((a) => ({
            id: a.id,
            enquadramentoId: a.enquadramentoId,
            descricao: a.descricao,
            detalhamento: a.detalhamento,
            dataHoraInicio: a.dataHoraInicio,
            dataHoraFim: a.dataHoraFim,
          }))}
          enquadramentos={enquadramentos}
        />
      </div>

      {/* Alerta de Diária Complementar por Prorrogação de Percurso */}
      {pDiaria?.valorComplementarCentavos != null && pDiaria.valorComplementarCentavos > 0 && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 shadow-xs flex items-start gap-3">
          <div className="rounded-full bg-emerald-100 p-2 text-emerald-800">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-950">
              Diária Complementar Apurada (Prorrogação de Viagem)
            </h3>
            <p className="text-xs text-emerald-900 mt-0.5">
              Em decorrência da ampliação do período de afastamento, foi apurado acréscimo de{" "}
              <strong>{formatarMoeda(pDiaria.valorComplementarCentavos, "BRL")}</strong> para
              complementação de diárias do beneficiário.
            </p>
          </div>
        </div>
      )}

      {/* Alerta de Devolução ao Erário por Retorno Antecipado */}
      {pDiaria?.valorDevolucaoCentavos != null && pDiaria.valorDevolucaoCentavos > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 shadow-xs flex items-start gap-3">
          <div className="rounded-full bg-amber-100 p-2 text-amber-800">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-950">
              Devolução ao Erário Necessária (Retorno Antecipado / Redução de Percurso)
            </h3>
            <p className="text-xs text-amber-900">
              Devido à redução dos dias da viagem, o beneficiário recebeu a maior o valor de{" "}
              <strong>{formatarMoeda(pDiaria.valorDevolucaoCentavos, "BRL")}</strong>, devendo ser
              restituído ao erário estadual conforme o Art. 33 a 39 do Decreto Estadual nº 29.444/2020.
            </p>
            <p className="text-xs font-semibold text-amber-950">
              Situação da Devolução:{" "}
              {pDiaria.devolucaoConfirmadaEm ? (
                <span className="text-emerald-800 font-bold">
                  ✓ Comprovante anexado em {formatarDataHora(pDiaria.devolucaoConfirmadaEm)}
                </span>
              ) : (
                <span className="text-red-700 font-bold">
                  ⚠ Aguardando envio do comprovante bancário/GRU pelo beneficiário ou unidade
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* PAINEL DO KIT AUTOMÁTICO SEI + VÍNCULO OBRIGATÓRIO DO PROCESSO SEI */}
      <PainelKitSeiViagem
        viagemId={viagem.id}
        numeroProcessoSeiAtual={numeroProcessoSeiEfetivo}
        idDocumentoSeiAtual={idDocumentoSeiEfetivo}
        processoSeiVinculadoEm={viagem.processoSeiVinculadoEm}
        aguardandoProcessoSei={aguardandoProcessoSei}
        beneficiarioNome={viagem.beneficiario.nome}
        beneficiarioCpfFormatado={formatarCpf(viagem.beneficiario.cpf)}
        destinoFormatado={`${viagem.municipioDestino}/${viagem.destinoEstado}`}
        beneficiosLabel={obterBeneficiosSolicitadosLabel(dadosKitSei)}
        textoCopiavelSei={gerarTextoCopiavelParaSei(dadosKitSei)}
        ehColaboradorExterno={!viagem.beneficiario.unidadeVinculoId}
        temRetificacao={Boolean(viagem.retificadaEm || viagem.alteracoes.length > 0)}
        sequencialDiaria={pDiaria?.sequencialFormatado ?? null}
        sequencialPassagem={pPass?.sequencialFormatado ?? null}
        sequencialHospedagem={pHosp?.sequencialFormatado ?? null}
      />

      {/* PAINEL DO RELATÓRIO DE VIAGEM E PRESTAÇÃO DE CONTAS (MODELO 2025 VINCULADO AO SEQUENCIAL ORIGINAL) */}
      <PainelRelatorioViagem
        viagemId={viagem.id}
        sequenciaisOriginais={[
          ...(pDiaria?.sequencialFormatado ? [pDiaria.sequencialFormatado] : []),
          ...(pPass?.sequencialFormatado ? [pPass.sequencialFormatado] : []),
          ...(pHosp?.sequencialFormatado ? [pHosp.sequencialFormatado] : []),
        ]}
        relatorioBaseLegalInicial={
          pDiaria?.relatorioBaseLegal ||
          (viagem.fontePagadora === "CONVENIO_FEDERAL" ? "DECRETO_5992_2006" : "DECRETO_29444_2020")
        }
        relatorioDescricaoAtividadesInicial={
          pDiaria?.relatorioDescricaoAtividades ||
          pPass?.relatorioDescricaoAtividades ||
          pHosp?.relatorioDescricaoAtividades ||
          viagem.atividades
            .map(
              (a, idx) =>
                `${idx + 1}. [${formatarDataHora(a.dataHoraInicio)} a ${formatarDataHora(a.dataHoraFim)}] ${a.enquadramento.nome}: ${a.descricao}${a.detalhamento ? ` (${a.detalhamento})` : ""}`,
            )
            .join("\n")
        }
        relatorioResultadoInicial={
          pDiaria?.relatorioResultado ||
          pPass?.relatorioResultado ||
          pHosp?.relatorioResultado ||
          "TOTALMENTE_ATINGIDO"
        }
        relatorioJustificativaResultadoInicial={pDiaria?.relatorioJustificativaResultado ?? null}
        relatorioJustificativaRetornoAntecipadoInicial={
          pDiaria?.relatorioJustificativaRetornoAntecipado ?? null
        }
        relatorioAnexosDescricaoInicial={
          pDiaria?.relatorioAnexosDescricao ||
          viagem.atividades.flatMap((a) => a.anexos.map((ax) => ax.nomeArquivo)).join(", ") ||
          "Certificado/declaração de participação no evento, comprovantes de embarque e relatório fotográfico."
        }
        temPedidoDeferido={pedidos.some(({ pedido }) => pedido.status === "DEFERIDO")}
        jaConcluidoRelatorio={pedidos.every(
          ({ pedido }) => pedido.status !== "DEFERIDO" || Boolean(pedido.relatorioEnviadoEm),
        )}
      />

      {/* CHECKLIST OPERACIONAL SDHP/PROAD (POPs 03, 04, 05 e 06) */}
      <PainelChecklistPopSdhp
        viagemId={viagem.id}
        ehAdmin={ehAdmin}
        ehConvenio={viagem.fontePagadora === "CONVENIO_FEDERAL"}
        temDiaria={Boolean(pDiaria)}
        temPassagem={Boolean(pPass)}
        temHospedagem={Boolean(pHosp)}
        jouernPublicado={Boolean(pDiaria?.jouernPublicadoEm)}
        jouernEdicao={pDiaria?.jouernEdicao ?? null}
        esocialCadastrado={Boolean(pDiaria?.esocialCadastradoEm)}
        sigefPrestacaoContas={Boolean(pDiaria?.sigefPrestacaoContasEm)}
        obtvTransferegovNumero={pDiaria?.obtvTransferegovNumero ?? null}
        ordemServicoPassagem={pPass?.ordemServicoNumero ?? null}
        bilheteLocalizador={pPass?.bilheteLocalizador ?? null}
        ordemServicoHospedagem={pHosp?.ordemServicoNumero ?? null}
      />

      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-white shadow-sm p-4 sm:grid-cols-2">
        <Campo label="Beneficiário" valor={viagem.beneficiario.nome} />
        <Campo label="CPF" valor={formatarCpf(viagem.beneficiario.cpf)} />
        <Campo label="Categoria (Portaria 1454/2023)" valor={viagem.beneficiario.categoria.nome} />
        <Campo label="Unidade solicitante" valor={viagem.unidadeSolicitante.nome} />
        <Campo
          label="Fonte Pagadora da Despesa"
          valor={formatarFontePagadoraTexto(viagem.fontePagadora || "FONTE_0500", viagem.detalhamentoFonte)}
        />
        <Campo
          label="Chefia Imediata Solicitante"
          valor={
            viagem.chefiaNome
              ? `${viagem.chefiaNome}${viagem.chefiaCargo ? ` (${viagem.chefiaCargo})` : ""}`
              : `Chefia Imediata — ${viagem.unidadeSolicitante.nome}`
          }
        />
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
                {
                  chegadaSede: viagem.chegadaSede,
                  relatorioEnviadoEm: pedido.relatorioEnviadoEm,
                  valorDevolucaoCentavos:
                    "valorDevolucaoCentavos" in pedido ? pedido.valorDevolucaoCentavos : null,
                  devolucaoConfirmadaEm:
                    "devolucaoConfirmadaEm" in pedido ? pedido.devolucaoConfirmadaEm : null,
                },
                new Date(),
                config.prazoRelatorioDiasUteis,
                config.prazoDevolucaoDiasCorridos,
              )
            : null;

        const comprovanteLimite = pedido.anexos.find((a) => a.tipo === "AUTORIZACAO_LIMITE");
        const relatorioViagem = pedido.anexos.find((a) => a.tipo === "RELATORIO_VIAGEM");
        const comprovanteDevolucao = pedido.anexos.find((a) => a.tipo === "COMPROVANTE_DEVOLUCAO_DIARIA");

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
                  label="Valor total concedido"
                  valor={
                    pedido.valorTotalCentavos != null
                      ? formatarMoeda(pedido.valorTotalCentavos, "BRL")
                      : "-"
                  }
                />
                {pedido.valorComplementarCentavos != null && pedido.valorComplementarCentavos > 0 && (
                  <Campo
                    label="Diária complementar apurada"
                    valor={`+ ${formatarMoeda(pedido.valorComplementarCentavos, "BRL")} (Prorrogação de Percurso)`}
                  />
                )}
                {pedido.valorDevolucaoCentavos != null && pedido.valorDevolucaoCentavos > 0 && (
                  <Campo
                    label="Valor a devolver ao erário"
                    valor={`- ${formatarMoeda(pedido.valorDevolucaoCentavos, "BRL")} (Retorno Antecipado)`}
                  />
                )}
              </div>
            )}

            {(tipo === "HOSPEDAGEM" || tipo === "PASSAGEM_AEREA") && "valorCotadoEm" in pedido && (
              <>
                <Campo
                  label="Contrato"
                  valor={`${pedido.contrato.empresaNome} — contrato ${pedido.contrato.numeroContrato}`}
                />
                <Campo
                  label="Valor cotado (fora do sistema)"
                  valor={
                    pedido.valorTotalCentavos != null
                      ? `${formatarMoeda(pedido.valorTotalCentavos, "BRL")} — em ${formatarDataHora(pedido.valorCotadoEm!)}`
                      : "Ainda não informado"
                  }
                />
              </>
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
                {comprovanteDevolucao && (
                  <p className="mt-1 text-xs text-emerald-700 font-semibold">
                    Comprovante de devolução ao erário anexado em{" "}
                    {"devolucaoConfirmadaEm" in pedido && pedido.devolucaoConfirmadaEm
                      ? formatarDataHora(pedido.devolucaoConfirmadaEm)
                      : "data registrada"}
                    .{" "}
                    <a
                      href={`/api/anexos/${comprovanteDevolucao.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-emerald-900"
                    >
                      Abrir {comprovanteDevolucao.nomeArquivo}
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
                valorDevolucaoCentavos:
                  "valorDevolucaoCentavos" in pedido ? pedido.valorDevolucaoCentavos : undefined,
                devolucaoConfirmadaEm:
                  "devolucaoConfirmadaEm" in pedido ? pedido.devolucaoConfirmadaEm : undefined,
              }}
              situacaoPrestacao={situacaoPrestacao?.situacao ?? null}
              ehAdmin={ehAdmin}
              temComprovanteLimite={Boolean(comprovanteLimite)}
            />

            {tipo === "DIARIA" && ehAdmin && pedido.status === "DEFERIDO" && "diarias" in pedido && (
              <EmitirPortariaForm
                pedidoId={pedido.id}
                valoresIniciais={{
                  numeroProcessoSei: pedido.numeroProcessoSei ?? viagem.numeroProcessoSei,
                  idPropostaConcessao: pedido.idPropostaConcessao ?? viagem.idDocumentoSei,
                  portariaNumero: pedido.portariaNumero,
                  portariaData: pedido.portariaData,
                }}
                portariaEmitidaEm={pedido.portariaEmitidaEm}
                portariaEmitidaPor={pedido.portariaEmitidaPor}
                bloqueios={[
                  ...(!config.numeroPortariaDelegacao || !config.dataPortariaDelegacao
                    ? ["Configure o número/data da portaria de delegação de poderes em Configurações."]
                    : []),
                  ...(!config.assinante1Nome || !config.assinante1Cargo
                    ? ["Configure os dados do 1º assinante em Configurações."]
                    : []),
                  ...(!config.assinante2Nome || !config.assinante2Cargo
                    ? ["Configure os dados do 2º assinante em Configurações."]
                    : []),
                  ...(viagem.beneficiario.unidadeVinculoId &&
                  (!viagem.beneficiario.matricula || !viagem.beneficiario.cargo)
                    ? ["Cadastre matrícula e cargo/função do beneficiário antes de emitir a portaria."]
                    : []),
                ]}
              />
            )}

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

      {/* HISTÓRICO DE ALTERAÇÕES DE PROGRAMAÇÃO DA VIAGEM */}
      {viagem.alteracoes.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-amber-700" />
            <h2 className="text-sm font-semibold text-slate-900">
              Histórico de Alterações de Programação / Percurso
            </h2>
          </div>
          <div className="divide-y divide-slate-100 space-y-3">
            {viagem.alteracoes.map((alt) => (
              <div key={alt.id} className="pt-3 first:pt-0 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-800">
                    Alteração registrada por {alt.solicitadoPor.nome} em {formatarDataHora(alt.createdAt)}
                  </span>
                  {alt.diferencaCentavos != null && alt.diferencaCentavos !== 0 && (
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                        alt.diferencaCentavos > 0
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          : "bg-amber-100 text-amber-900 border border-amber-300"
                      }`}
                    >
                      {alt.diferencaCentavos > 0
                        ? `Complemento: +${formatarMoeda(alt.diferencaCentavos, "BRL")}`
                        : `Devolução: -${formatarMoeda(Math.abs(alt.diferencaCentavos), "BRL")}`}
                    </span>
                  )}
                </div>
                <div className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <span className="font-semibold text-slate-600 block mb-0.5">
                    Motivo / Justificativa informada:
                  </span>
                  {alt.motivo}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="font-semibold text-slate-500 block">Cronograma Anterior:</span>
                    Saída sede: {formatarDataHora(alt.saidaSedeAnterior)} <br />
                    Retorno sede: {formatarDataHora(alt.chegadaSedeAnterior)}
                    {alt.diariasAnteriores != null && (
                      <span className="block mt-0.5 text-slate-500">
                        Diárias: {formatarDiarias(Number(alt.diariasAnteriores))}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 block">Cronograma Retificado:</span>
                    Saída sede: {formatarDataHora(alt.saidaSedeNova)} <br />
                    Retorno sede: {formatarDataHora(alt.chegadaSedeNova)}
                    {alt.diariasNovas != null && (
                      <span className="block mt-0.5 text-slate-500">
                        Diárias: {formatarDiarias(Number(alt.diariasNovas))}
                      </span>
                    )}
                  </div>
                </div>
                {alt.anexos.map((anexo) => (
                  <p key={anexo.id} className="text-xs">
                    <a
                      href={`/api/anexos/${anexo.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 underline font-medium hover:text-blue-900"
                    >
                      Visualizar documento comprobatório: {anexo.nomeArquivo}
                    </a>
                  </p>
                ))}
              </div>
            ))}
          </div>
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
