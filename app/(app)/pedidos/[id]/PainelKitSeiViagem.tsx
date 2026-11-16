"use client";

import { useState, useTransition } from "react";
import { vincularProcessoSeiConcluirDemandaAction } from "@/lib/actions/viagens";
import {
  FileDown,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  Send,
  FileText,
  Edit3,
} from "lucide-react";

interface PainelKitSeiViagemProps {
  viagemId: string;
  numeroProcessoSeiAtual: string | null;
  idDocumentoSeiAtual: string | null;
  processoSeiVinculadoEm: Date | null;
  aguardandoProcessoSei: boolean;
  beneficiarioNome: string;
  beneficiarioCpfFormatado: string;
  destinoFormatado: string;
  beneficiosLabel: string;
  textoCopiavelSei: string;
}

export default function PainelKitSeiViagem({
  viagemId,
  numeroProcessoSeiAtual,
  idDocumentoSeiAtual,
  aguardandoProcessoSei,
  beneficiarioNome,
  beneficiarioCpfFormatado,
  destinoFormatado,
  beneficiosLabel,
  textoCopiavelSei,
}: PainelKitSeiViagemProps) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);
  const [copiadoTexto, setCopiadoTexto] = useState(false);
  const [copiadoEspec, setCopiadoEspec] = useState(false);
  const [copiadoProc, setCopiadoProc] = useState(false);
  const [modoEdicaoSei, setModoEdicaoSei] = useState(false);

  const especificacaoSugerida = `Solicitação de ${beneficiosLabel} - ${beneficiarioNome} (CPF ${beneficiarioCpfFormatado}) - Destino: ${destinoFormatado}`;

  const copiarParaClipboard = async (texto: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(texto);
      setter(true);
      setTimeout(() => setter(false), 3000);
    } catch {
      // Fallback
    }
  };

  const mostrarFormularioVinculo = aguardandoProcessoSei || !numeroProcessoSeiAtual || modoEdicaoSei;

  return (
    <div className="space-y-4">
      {/* BLOCO 1: KIT PRONTO PARA O SEI (ZERO RETRABALHO) */}
      <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-slate-50 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-blue-100 pb-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-900 uppercase tracking-wide">
              <FileText className="h-3.5 w-3.5 text-blue-700" />
              Kit Automático de Instrução para o SEI (Sem Retrabalho)
            </span>
            <h2 className="text-sm font-bold text-slate-900 mt-1">
              Documentos Gerados Automaticamente a partir da sua Solicitação
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Você não precisa redigitar nada no SEI: baixe o PDF pronto (ou copie o texto formatado em 1 clique) para inserir no Processo SEI da sua unidade.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href={`/api/pedidos/${viagemId}/requerimento-sei-pdf`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#003366] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#002244] transition"
            >
              <FileDown className="h-4 w-4" />
              <span>1. Baixar Requerimento / Proposta (.PDF)</span>
            </a>

            <button
              type="button"
              onClick={() => copiarParaClipboard(textoCopiavelSei, setCopiadoTexto)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-300 bg-white px-3.5 py-2 text-xs font-bold text-blue-900 hover:bg-blue-50 transition cursor-pointer"
            >
              {copiadoTexto ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-700">Texto Copiado! Cole no SEI (Ctrl+V)</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-blue-700" />
                  <span>Copiar Texto para Colar no SEI</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Ficha Pronta para Abertura Rápida do Processo no SEI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-white/90 rounded-xl p-3.5 border border-slate-200/80">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Tipo de Processo no SEI
            </span>
            <span className="font-semibold text-slate-800 block mt-0.5">
              Pessoal: Diárias / Passagens e Hospedagens
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Unidade de Destino no SEI (Para Tramitação)
            </span>
            <span className="font-bold text-blue-900 block mt-0.5">
              Setor de Diárias, Passagens e Hospedagens / PROAD
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Especificação Sugerida para Capa do SEI
              </span>
              <span className="font-medium text-slate-700 truncate block mt-0.5" title={especificacaoSugerida}>
                {especificacaoSugerida}
              </span>
            </div>
            <button
              type="button"
              onClick={() => copiarParaClipboard(especificacaoSugerida, setCopiadoEspec)}
              className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              title="Copiar especificação para abertura do processo no SEI"
            >
              {copiadoEspec ? "✓ Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      </section>

      {/* BLOCO 2: VÍNCULO OBRIGATÓRIO DO PROCESSO SEI PARA CONCLUIR A DEMANDA */}
      {mostrarFormularioVinculo ? (
        <section className="rounded-2xl border-2 border-amber-400 bg-amber-50/70 p-5 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700 shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <span className="inline-block rounded-md bg-amber-200/80 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-950">
                {aguardandoProcessoSei
                  ? "Demanda Pendente de Conclusão — Aguardando Nº do Processo SEI"
                  : "Atualização do Vínculo SEI"}
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                Informe o Número do Processo SEI aberto pela Unidade para Concluir e Enviar a Demanda
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed">
                Para que sua solicitação de <strong>{beneficiosLabel}</strong> seja concluída e entre na fila de análise do{" "}
                <strong>Setor de Diárias, Passagens e Hospedagens</strong>:
                <br />
                <strong>1º)</strong> Crie o processo no SEI da sua unidade e insira o PDF gerado acima (ou o texto copiado) junto aos comprovantes da atividade;{" "}
                <strong>2º)</strong> Envie o processo no SEI ao <strong>Setor de Diárias, Passagens e Hospedagens</strong>;{" "}
                <strong>3º)</strong> Informe o número do Processo SEI abaixo e clique em <strong>Concluir Demanda</strong>.
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setErro(null);
              setSucessoMsg(null);
              const formData = new FormData(e.currentTarget);
              startTransition(async () => {
                const res = await vincularProcessoSeiConcluirDemandaAction(viagemId, formData);
                if (!res.ok) {
                  setErro(res.erro);
                } else {
                  setModoEdicaoSei(false);
                  setSucessoMsg(
                    "Processo SEI vinculado com sucesso! Sua demanda foi concluída e encaminhada à fila do Setor de Diárias, Passagens e Hospedagens.",
                  );
                }
              });
            }}
            className="space-y-3 bg-white rounded-xl p-4 border border-amber-200"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-800">
                  Número do Processo SEI Aberto pela Unidade *
                </label>
                <input
                  name="numeroProcessoSei"
                  required
                  defaultValue={numeroProcessoSeiAtual ?? ""}
                  placeholder="Ex.: 04410001.001234/2026-55"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  ID / Nº do Documento SEI da Solicitação (Opcional)
                </label>
                <input
                  name="idDocumentoSei"
                  defaultValue={idDocumentoSeiAtual ?? ""}
                  placeholder="Ex.: 2948102 (ID da Proposta/Requerimento no SEI)"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer pt-1">
              <input
                type="checkbox"
                name="confirmouEnvioSei"
                required
                defaultChecked={Boolean(numeroProcessoSeiAtual)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              <span>
                <strong>Declaro que abri o Processo SEI informado acima</strong>, inseri o Requerimento/Proposta gerado pelo sistema e os comprovantes da atividade, e <strong>encaminhei o processo no SEI para o Setor de Diárias, Passagens e Hospedagens</strong>.
              </span>
            </label>

            {erro && (
              <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-medium text-red-700">
                {erro}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              {modoEdicaoSei && (
                <button
                  type="button"
                  onClick={() => setModoEdicaoSei(false)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>
                  {isPending
                    ? "Vinculando e Enviando..."
                    : "Concluir Demanda e Enviar ao Setor de Diárias"}
                </span>
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-emerald-950">
                  Demanda Concluída e Vinculada ao Processo SEI:
                </span>
                <span className="rounded-lg bg-white border border-emerald-300 px-2.5 py-0.5 font-mono text-xs font-extrabold text-emerald-900">
                  {numeroProcessoSeiAtual}
                </span>
                <button
                  type="button"
                  onClick={() => copiarParaClipboard(numeroProcessoSeiAtual || "", setCopiadoProc)}
                  className="text-[11px] font-semibold text-emerald-800 underline hover:text-emerald-950 cursor-pointer"
                >
                  {copiadoProc ? "✓ Copiado" : "Copiar Nº SEI"}
                </button>
                {idDocumentoSeiAtual && (
                  <span className="text-xs text-emerald-800">
                    • Doc SEI: <strong className="font-mono">{idDocumentoSeiAtual}</strong>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Processo SEI aberto pela unidade demandante e encaminhado ao Setor de Diárias, Passagens e Hospedagens.
              </p>
              {sucessoMsg && (
                <p className="text-xs font-bold text-emerald-900 mt-1">{sucessoMsg}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModoEdicaoSei(true)}
            className="inline-flex items-center gap-1 self-start sm:self-center rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 transition cursor-pointer shrink-0"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Editar Nº SEI</span>
          </button>
        </section>
      )}
    </div>
  );
}
