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
  FileSpreadsheet,
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
  ehColaboradorExterno?: boolean;
  temRetificacao?: boolean;
  sequencialDiaria?: string | null;
  sequencialPassagem?: string | null;
  sequencialHospedagem?: string | null;
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
  ehColaboradorExterno = false,
  temRetificacao = false,
  sequencialDiaria,
  sequencialPassagem,
  sequencialHospedagem,
}: PainelKitSeiViagemProps) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);
  const [copiadoTexto, setCopiadoTexto] = useState(false);
  const [copiadoEspec, setCopiadoEspec] = useState(false);
  const [copiadoProc, setCopiadoProc] = useState(false);
  const [modoEdicaoSei, setModoEdicaoSei] = useState(false);

  const especificacaoSugerida = `${beneficiarioNome} - ${destinoFormatado} (${beneficiosLabel})`;

  const copiarParaClipboard = async (texto: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(texto);
      setter(true);
      setTimeout(() => setter(false), 3000);
    } catch {
      // Fallback
    }
  };

  const mostrarFormularioVinculo =
    aguardandoProcessoSei || !numeroProcessoSeiAtual || modoEdicaoSei;

  const seqPrincipalRef =
    sequencialDiaria || sequencialPassagem || sequencialHospedagem || "Solicitação Original";

  return (
    <div className="space-y-4">
      {/* BLOCO 1: CENTRAL DE TEMPLATES OFICIAIS UERN (.PDF E .DOCX COM BRASÃO E SEQUENCIAL AUTOMÁTICO) */}
      <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-slate-50 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-blue-100 pb-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-900 uppercase tracking-wide">
              <FileText className="h-3.5 w-3.5 text-blue-700" />
              Templates Oficiais UERN / SDHP com Brasão e Sequencial Automático
            </span>
            <h2 className="text-sm font-bold text-slate-900 mt-1">
              Exportação Dual (.PDF e .DOCX) — Formulários de Solicitação e Relatório de Prestação de Contas
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Todos os formulários seguem os modelos oficiais do Setor de Diárias, Passagens e Hospedagens (SDHP/PROAD/UERN), com cabeçalho institucional, Brasão colorido da UERN e numeração sequencial própria por modalidade.
            </p>
          </div>

          <button
            type="button"
            onClick={() => copiarParaClipboard(textoCopiavelSei, setCopiadoTexto)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-300 bg-white px-3.5 py-2 text-xs font-bold text-blue-900 hover:bg-blue-50 transition cursor-pointer shrink-0"
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

        {/* Lista de Documentos Oficiais com Exportação .PDF e .DOCX */}
        <div className="grid grid-cols-1 gap-3">
          {sequencialDiaria && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[#003366] px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">
                    Modelo 1 • Diárias (POP 03/04)
                  </span>
                  <span className="font-mono text-xs font-bold text-[#003366]">
                    {sequencialDiaria}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Formulário Oficial de Solicitação de Diárias (Tabelas de Dados Pessoais/Bancários, Percurso, Contato, Fonte Pagadora e Observações).
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`/api/pedidos/${viagemId}/documentos/diaria?formato=pdf`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#003366] px-3 py-2 text-xs font-bold text-white hover:bg-[#002244] transition"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  <span>Baixar .PDF</span>
                </a>
                <a
                  href={`/api/pedidos/${viagemId}/documentos/diaria?formato=docx`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-950 hover:bg-blue-100 transition"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-blue-700" />
                  <span>Baixar .DOCX</span>
                </a>
              </div>
            </div>
          )}

          {sequencialPassagem && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-sky-800 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">
                    Modelo 2 • Passagens Aéreas (POP 05)
                  </span>
                  <span className="font-mono text-xs font-bold text-sky-900">
                    {sequencialPassagem}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Formulário Oficial de Solicitação de Passagens Aéreas (Dados Civis/RG/Passaporte, Trechos, Períodos Madrugada/Manhã/Tarde/Noite e Fonte Pagadora).
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`/api/pedidos/${viagemId}/documentos/passagem?formato=pdf`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#003366] px-3 py-2 text-xs font-bold text-white hover:bg-[#002244] transition"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  <span>Baixar .PDF</span>
                </a>
                <a
                  href={`/api/pedidos/${viagemId}/documentos/passagem?formato=docx`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-950 hover:bg-blue-100 transition"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-blue-700" />
                  <span>Baixar .DOCX</span>
                </a>
              </div>
            </div>
          )}

          {sequencialHospedagem && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-indigo-800 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">
                    Modelo 3 • Hospedagem (POP 06)
                  </span>
                  <span className="font-mono text-xs font-bold text-indigo-900">
                    {sequencialHospedagem}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Formulário Oficial de Solicitação de Hospedagem (Check-in/Check-out, Almoço/Jantar, Tipo de Apartamento Simples/Duplo/Triplo e Endereço).
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`/api/pedidos/${viagemId}/documentos/hospedagem?formato=pdf`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#003366] px-3 py-2 text-xs font-bold text-white hover:bg-[#002244] transition"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  <span>Baixar .PDF</span>
                </a>
                <a
                  href={`/api/pedidos/${viagemId}/documentos/hospedagem?formato=docx`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-950 hover:bg-blue-100 transition"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-blue-700" />
                  <span>Baixar .DOCX</span>
                </a>
              </div>
            </div>
          )}

          {/* Modelo 4: Relatório de Viagem e Prestação de Contas (Sempre vinculado ao sequencial original!) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 shadow-2xs">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-emerald-800 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">
                  Modelo 4 • Relatório de Viagem / Prestação de Contas
                </span>
                <span className="font-mono text-xs font-bold text-emerald-950">
                  Vinculado à {seqPrincipalRef}
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-1">
                Relatório Oficial de Viagem (Art. 33 a 35 do Decreto nº 29.444/2020 e Decreto nº 5.992/2006) com menção automática ao sequencial da solicitação original.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`/api/pedidos/${viagemId}/documentos/relatorio-viagem?formato=pdf`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition"
              >
                <FileDown className="h-3.5 w-3.5" />
                <span>Baixar Relatório .PDF</span>
              </a>
              <a
                href={`/api/pedidos/${viagemId}/documentos/relatorio-viagem?formato=docx`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-950 hover:bg-emerald-50 transition"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
                <span>Baixar Relatório .DOCX</span>
              </a>
            </div>
          </div>

          {/* Modelo 5: Ficha de Cadastro eSocial (Colaborador Externo / Eventual) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-slate-700 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">
                  Modelo 5 • Ficha de Cadastro eSocial
                </span>
                {ehColaboradorExterno && (
                  <span className="rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                    Obrigatório p/ Colaborador Externo (POP 03/04)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Formulário Oficial de Cadastro eSocial para Agentes Colaboradores e Colaboradores Eventuais (com indicação de vínculo com outro órgão público).
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`/api/pedidos/${viagemId}/documentos/esocial?formato=pdf`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200 transition"
              >
                <FileDown className="h-3.5 w-3.5" />
                <span>eSocial .PDF</span>
              </a>
              <a
                href={`/api/pedidos/${viagemId}/documentos/esocial?formato=docx`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>eSocial .DOCX</span>
              </a>
            </div>
          </div>

          {/* Modelo 6: Termo de Retificação (Quando houver alteração de programação) */}
          {temRetificacao && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50/70 p-3.5 shadow-2xs">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-amber-800 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">
                    Modelo 6 • Termo de Retificação de Viagem / Diárias
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-950">
                    Ref. {seqPrincipalRef}
                  </span>
                </div>
                <p className="text-xs text-amber-900 mt-1">
                  Termo Oficial de Retificação de Datas e Horários (Orientações Gerais SDHP - pág. 7), com quadro comparativo e apuração de complemento ou devolução.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`/api/pedidos/${viagemId}/documentos/termo-retificacao?formato=pdf`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-800 px-3 py-2 text-xs font-bold text-white hover:bg-amber-900 transition"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  <span>Termo .PDF</span>
                </a>
                <a
                  href={`/api/pedidos/${viagemId}/documentos/termo-retificacao?formato=docx`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400 bg-white px-3 py-2 text-xs font-bold text-amber-950 hover:bg-amber-100 transition"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Termo .DOCX</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Ficha Pronta para Abertura Rápida do Processo no SEI */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs bg-white/90 rounded-xl p-3.5 border border-slate-200/80">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Tipo de Processo no SEI
            </span>
            <span className="font-semibold text-slate-800 block mt-0.5">
              Pessoal: diárias e passagens
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Nível de Acesso do Formulário
            </span>
            <span className="font-semibold text-amber-900 block mt-0.5">
              Restrito (Info. Pessoal - Art. 31 Lei 12.527/2011)
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Unidade de Destino no SEI
            </span>
            <span className="font-bold text-blue-900 block mt-0.5">
              SDHP / PROAD
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Especificação Capa SEI (Padrão SDHP)
              </span>
              <span
                className="font-medium text-slate-700 truncate block mt-0.5"
                title={especificacaoSugerida}
              >
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
                <strong>Setor de Diárias, Passagens e Hospedagens (SDHP/PROAD)</strong>:
                <br />
                <strong>1º)</strong> Crie o processo no SEI da sua unidade e insira o formulário oficial <strong>.PDF</strong> ou <strong>.DOCX</strong> gerado acima (assinado pela Chefia Imediata) junto aos comprovantes da atividade;{" "}
                <strong>2º)</strong> Envie o processo no SEI ao <strong>SDHP/PROAD</strong>;{" "}
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
                  placeholder="Ex.: 2948102 (ID da Solicitação/PCD no SEI)"
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
                <strong>Declaro que abri o Processo SEI informado acima</strong>, inseri o Formulário Oficial gerado pelo sistema (assinado pela Chefia Imediata) e os comprovantes da atividade, e <strong>encaminhei o processo no SEI para o Setor de Diárias, Passagens e Hospedagens (SDHP/PROAD)</strong>.
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
