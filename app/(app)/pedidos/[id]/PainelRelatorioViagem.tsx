"use client";

import { useState, useTransition } from "react";
import { salvarRelatorioViagemEstruturadoAction } from "@/lib/actions/pedidos";
import { desempacotar } from "@/lib/actions/resultado";
import { FileDown, FileSpreadsheet, CheckCircle2, ClipboardCheck } from "lucide-react";

interface PainelRelatorioViagemProps {
  viagemId: string;
  sequenciaisOriginais: string[];
  relatorioBaseLegalInicial: string;
  relatorioDescricaoAtividadesInicial: string;
  relatorioResultadoInicial: string;
  relatorioJustificativaResultadoInicial: string | null;
  relatorioJustificativaRetornoAntecipadoInicial: string | null;
  relatorioAnexosDescricaoInicial: string;
  temPedidoDeferido: boolean;
  jaConcluidoRelatorio: boolean;
}

export default function PainelRelatorioViagem({
  viagemId,
  sequenciaisOriginais,
  relatorioBaseLegalInicial,
  relatorioDescricaoAtividadesInicial,
  relatorioResultadoInicial,
  relatorioJustificativaResultadoInicial,
  relatorioJustificativaRetornoAntecipadoInicial,
  relatorioAnexosDescricaoInicial,
  temPedidoDeferido,
  jaConcluidoRelatorio,
}: PainelRelatorioViagemProps) {
  const [isPending, startTransition] = useTransition();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const refTexto = sequenciaisOriginais.join(" | ") || "Solicitação Original";

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900 uppercase tracking-wide">
            <ClipboardCheck className="h-3.5 w-3.5 text-emerald-700" />
            Prestação de Contas Oficial (Art. 33 a 35 do Decreto nº 29.444/2020)
          </span>
          <h2 className="text-sm font-bold text-slate-900 mt-1">
            Relatório de Viagem Padrão UERN — Vinculado à {refTexto}
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            O Relatório de Viagem (Modelo 2025) já herda todos os dados do beneficiário, roteiro, horários e atividades, fazendo menção automática ao sequencial da solicitação original (<strong>{refTexto}</strong>). Prazo legal: até 5 dias úteis após o retorno.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href={`/api/pedidos/${viagemId}/documentos/relatorio-viagem?formato=pdf`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>Baixar Relatório (.PDF)</span>
          </a>
          <a
            href={`/api/pedidos/${viagemId}/documentos/relatorio-viagem?formato=docx`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-950 hover:bg-emerald-100 transition"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
            <span>Baixar Relatório (.DOCX)</span>
          </a>
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            {aberto ? "Fechar Editor do Relatório" : "Personalizar / Emitir Relatório"}
          </button>
        </div>
      </div>

      {aberto && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErro(null);
            setSucesso(null);
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                desempacotar(await salvarRelatorioViagemEstruturadoAction(viagemId, fd));
                setSucesso(
                  "Dados do Relatório de Viagem salvos com sucesso! Você já pode baixar o .PDF ou .DOCX atualizado acima.",
                );
              } catch (err) {
                setErro(err instanceof Error ? err.message : "Erro ao salvar relatório.");
              }
            });
          }}
          className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs"
        >
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-emerald-950 font-medium">
            <strong>0. Vinculação Automática no Relatório:</strong> Este relatório será emitido com referência expressa a: <span className="font-mono font-bold">{refTexto}</span>.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-bold text-slate-700">
                1. Base Legal Aplicável
              </label>
              <select
                name="relatorioBaseLegal"
                defaultValue={relatorioBaseLegalInicial}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                <option value="DECRETO_29444_2020">
                  Decreto Estadual nº 29.444/2020 (Recursos Estaduais / Ordinários / OP / 0.501)
                </option>
                <option value="DECRETO_5992_2006">
                  Decreto Federal nº 5.992/2006 c/c 11.872/2023 (Recursos Federais / Convênios - POP 04)
                </option>
              </select>
            </div>

            <div>
              <label className="mb-1 block font-bold text-slate-700">
                7. Resultado da Viagem
              </label>
              <select
                name="relatorioResultado"
                defaultValue={relatorioResultadoInicial}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                <option value="TOTALMENTE_ATINGIDO">( X ) Objetivo totalmente atingido</option>
                <option value="PARCIALMENTE_ATINGIDO">( X ) Objetivo parcialmente atingido</option>
                <option value="NAO_ATINGIDO">( X ) Objetivo não atingido</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block font-bold text-slate-700">
              6. Descrição Sucinta e Clara da Viagem (Relato das atividades desenvolvidas e respectivas datas)
            </label>
            <textarea
              name="relatorioDescricaoAtividades"
              rows={4}
              defaultValue={relatorioDescricaoAtividadesInicial}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-medium text-slate-700">
                8.1. Justificativa (Somente se objetivo não atingido)
              </label>
              <input
                name="relatorioJustificativaResultado"
                defaultValue={relatorioJustificativaResultadoInicial ?? ""}
                placeholder="Deixe em branco caso o objetivo tenha sido atingido"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-slate-700">
                8.2. Justificativa de Retorno Antecipado (Se houver)
              </label>
              <input
                name="relatorioJustificativaRetornoAntecipado"
                defaultValue={relatorioJustificativaRetornoAntecipadoInicial ?? ""}
                placeholder="Justificar caso tenha retornado antes da data prevista na portaria"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">
              9. Relação de Documentos Comprobatórios / Anexos Juntados ao SEI (Certificados, cartões de embarque, fotos, atas)
            </label>
            <input
              name="relatorioAnexosDescricao"
              defaultValue={relatorioAnexosDescricaoInicial}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
            />
          </div>

          {temPedidoDeferido && !jaConcluidoRelatorio && (
            <label className="flex items-center gap-2 pt-1 font-semibold text-emerald-900 cursor-pointer">
              <input
                type="checkbox"
                name="concluirPrestacaoContas"
                className="h-4 w-4 rounded border-slate-300 text-emerald-600"
              />
              <span>
                Gerar e anexar automaticamente este Relatório Oficial ao pedido como Prestação de Contas concluída no sistema
              </span>
            </label>
          )}

          {erro && (
            <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-red-700 font-medium">
              {erro}
            </p>
          )}
          {sucesso && (
            <p className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-emerald-800 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{sucesso}</span>
            </p>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-[#003366] px-4 py-2 text-xs font-bold text-white hover:bg-[#002244] disabled:opacity-60 cursor-pointer"
            >
              {isPending ? "Salvando Relatório..." : "Salvar Dados do Relatório de Viagem"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
