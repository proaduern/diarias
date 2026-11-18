"use client";

import { useState, useTransition } from "react";
import { CalendarClock, AlertCircle, CheckCircle2, Upload, Plus, Trash2, X } from "lucide-react";
import { alterarProgramacaoViagemAction } from "@/lib/actions/viagens";
import type { EnquadramentoAtividade } from "@prisma/client";

interface AtividadeItem {
  enquadramentoId: string;
  descricao: string;
  detalhamento: string;
  dataHoraInicio: string;
  dataHoraFim: string;
}

interface ModalAlterarProgramacaoProps {
  viagemId: string;
  jaDeferido: boolean;
  saidaSedeAtual: Date;
  chegadaDestinoAtual: Date;
  saidaDestinoAtual: Date;
  chegadaSedeAtual: Date;
  atividadesAtuais: {
    id: string;
    enquadramentoId: string;
    descricao: string;
    detalhamento: string | null;
    dataHoraInicio: Date;
    dataHoraFim: Date;
  }[];
  enquadramentos: EnquadramentoAtividade[];
}

function toDatetimeLocal(data: Date | string): string {
  const d = new Date(data);
  const pad = (n: number) => String(n).padStart(2, "0");
  const ano = d.getFullYear();
  const mes = pad(d.getMonth() + 1);
  const dia = pad(d.getDate());
  const hora = pad(d.getHours());
  const minuto = pad(d.getMinutes());
  return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
}

export default function ModalAlterarProgramacao({
  viagemId,
  jaDeferido,
  saidaSedeAtual,
  chegadaDestinoAtual,
  saidaDestinoAtual,
  chegadaSedeAtual,
  atividadesAtuais,
  enquadramentos,
}: ModalAlterarProgramacaoProps) {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  // Campos de datas
  const [saidaSede, setSaidaSede] = useState(toDatetimeLocal(saidaSedeAtual));
  const [chegadaDestino, setChegadaDestino] = useState(toDatetimeLocal(chegadaDestinoAtual));
  const [saidaDestino, setSaidaDestino] = useState(toDatetimeLocal(saidaDestinoAtual));
  const [chegadaSede, setChegadaSede] = useState(toDatetimeLocal(chegadaSedeAtual));

  const [motivo, setMotivo] = useState("");
  const [editarAtividades, setEditarAtividades] = useState(false);

  // Lista de atividades editáveis
  const [atividades, setAtividades] = useState<AtividadeItem[]>(() =>
    atividadesAtuais.map((a) => ({
      enquadramentoId: a.enquadramentoId,
      descricao: a.descricao,
      detalhamento: a.detalhamento ?? "",
      dataHoraInicio: toDatetimeLocal(a.dataHoraInicio),
      dataHoraFim: toDatetimeLocal(a.dataHoraFim),
    })),
  );

  const adicionarAtividade = () => {
    setAtividades((prev) => [
      ...prev,
      {
        enquadramentoId: enquadramentos[0]?.id ?? "",
        descricao: "",
        detalhamento: "",
        dataHoraInicio: chegadaDestino,
        dataHoraFim: saidaDestino,
      },
    ]);
  };

  const removerAtividade = (index: number) => {
    setAtividades((prev) => prev.filter((_, i) => i !== index));
  };

  const atualizarAtividade = (index: number, campo: keyof AtividadeItem, valor: string) => {
    setAtividades((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)),
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErro(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    formData.set("saidaSede", saidaSede);
    formData.set("chegadaDestino", chegadaDestino);
    formData.set("saidaDestino", saidaDestino);
    formData.set("chegadaSede", chegadaSede);
    formData.set("motivoAlteracao", motivo);

    if (editarAtividades && atividades.length > 0) {
      formData.set("quantidadeAtividades", String(atividades.length));
      atividades.forEach((ativ, index) => {
        formData.set(`atividades[${index}][enquadramentoId]`, ativ.enquadramentoId);
        formData.set(`atividades[${index}][descricao]`, ativ.descricao);
        formData.set(`atividades[${index}][detalhamento]`, ativ.detalhamento);
        formData.set(`atividades[${index}][dataHoraInicio]`, ativ.dataHoraInicio);
        formData.set(`atividades[${index}][dataHoraFim]`, ativ.dataHoraFim);
      });
    } else {
      formData.set("quantidadeAtividades", "0");
    }

    startTransition(async () => {
      const res = await alterarProgramacaoViagemAction(viagemId, formData);
      if (!res.ok) {
        setErro(res.erro);
      } else {
        setAberto(false);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 shadow-sm hover:bg-amber-100 transition cursor-pointer"
      >
        <CalendarClock className="h-4 w-4 text-amber-700" />
        <span>Ajustar Programação / Alterar Percurso</span>
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 my-8">
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900 uppercase tracking-wide">
                <CalendarClock className="h-3.5 w-3.5 text-amber-800" />
                {jaDeferido
                  ? "Retificação de Percurso (Pós-Deferimento)"
                  : "Ajuste de Programação (Demanda em Tramitação)"}
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-1.5">
                Alterar Datas e Programação da Viagem
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {jaDeferido
                  ? "Utilize esta opção quando a viagem já deferida sofrer alteração de agenda (prorrogação, antecipação de retorno ou deslocamento de datas). O sistema recalculará as diárias devidas e apurará eventual complementação ou devolução ao erário."
                  : "Ajuste as datas e horários antes do deferimento da concessão. Os cálculos e o Requerimento do SEI serão recalculados e atualizados automaticamente."}
              </p>
            </div>

            {erro && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <span>{erro}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Grade de Novas Datas */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Novo Cronograma de Deslocamento
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nova Saída da Sede *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={saidaSede}
                      onChange={(e) => setSaidaSede(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nova Chegada ao Destino *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={chegadaDestino}
                      onChange={(e) => setChegadaDestino(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nova Saída do Destino *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={saidaDestino}
                      onChange={(e) => setSaidaDestino(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nova Chegada à Sede *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={chegadaSede}
                      onChange={(e) => setChegadaSede(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Justificativa Obrigatória */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Justificativa da Alteração de Programação *
                </label>
                <textarea
                  required
                  rows={3}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex.: Em virtude da prorrogação da reunião oficial do CONSUNI convocada pelo Ofício nº 12/2026, ou reagendamento de congresso/banca..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Anexo Comprobatório Opcional */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Documento Comprobatório (Opcional - PDF ou Imagem)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    name="comprovanteAlteracao"
                    accept="application/pdf,image/*"
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ofício de convocação, e-mail da organização, convite retificado ou programação do evento.
                </p>
              </div>

              {/* Opção para Ajustar Atividades */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editarAtividades}
                    onChange={(e) => setEditarAtividades(e.target.checked)}
                    className="h-4 w-4 rounded-sm border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Desejo atualizar também a grade de atividades da viagem</span>
                </label>

                {editarAtividades && (
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    {atividades.map((ativ, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 text-xs relative"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700">Atividade #{idx + 1}</span>
                          {atividades.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removerAtividade(idx)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Remover atividade"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                              Enquadramento
                            </label>
                            <select
                              value={ativ.enquadramentoId}
                              onChange={(e) =>
                                atualizarAtividade(idx, "enquadramentoId", e.target.value)
                              }
                              className="w-full rounded-lg border border-slate-300 p-1.5 text-xs"
                            >
                              {enquadramentos.map((enq) => (
                                <option key={enq.id} value={enq.id}>
                                  {enq.nome}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                              Descrição Sucinta
                            </label>
                            <input
                              type="text"
                              required
                              value={ativ.descricao}
                              onChange={(e) => atualizarAtividade(idx, "descricao", e.target.value)}
                              placeholder="Ex.: Ministrar disciplina..."
                              className="w-full rounded-lg border border-slate-300 p-1.5 text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                              Início da Atividade
                            </label>
                            <input
                              type="datetime-local"
                              required
                              value={ativ.dataHoraInicio}
                              onChange={(e) =>
                                atualizarAtividade(idx, "dataHoraInicio", e.target.value)
                              }
                              className="w-full rounded-lg border border-slate-300 p-1.5 text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                              Término da Atividade
                            </label>
                            <input
                              type="datetime-local"
                              required
                              value={ativ.dataHoraFim}
                              onChange={(e) =>
                                atualizarAtividade(idx, "dataHoraFim", e.target.value)
                              }
                              className="w-full rounded-lg border border-slate-300 p-1.5 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={adicionarAtividade}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Adicionar Nova Atividade</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setAberto(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60 transition cursor-pointer"
                >
                  {isPending ? (
                    <span>Processando e Recalculando...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Salvar e Atualizar Programação</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
