"use client";

import { useState } from "react";
import type { EnquadramentoAtividade } from "@prisma/client";

interface Linha {
  key: number;
  enquadramentoId: string;
}

const CATEGORIA_LABEL: Record<string, string> = {
  ACADEMICA: "Acadêmica",
  ADMINISTRATIVA: "Administrativa",
};

export default function AtividadesFormSection({
  enquadramentos,
}: {
  enquadramentos: EnquadramentoAtividade[];
}) {
  const [linhas, setLinhas] = useState<Linha[]>([{ key: 0, enquadramentoId: "" }]);
  const [proximoKey, setProximoKey] = useState(1);

  function adicionar() {
    setLinhas((ls) => [...ls, { key: proximoKey, enquadramentoId: "" }]);
    setProximoKey((k) => k + 1);
  }

  function remover(key: number) {
    setLinhas((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : ls));
  }

  function definirEnquadramento(key: number, enquadramentoId: string) {
    setLinhas((ls) => ls.map((l) => (l.key === key ? { ...l, enquadramentoId } : l)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Programação de atividades</h2>
        <button
          type="button"
          onClick={adicionar}
          className="text-xs font-medium text-[#003366] underline"
        >
          + Adicionar atividade
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Informe cada atividade vinculada a esta viagem. A chegada ao destino
        não pode ser depois do início da atividade mais cedo, nem a saída
        antes do fim da atividade mais tarde.
      </p>

      {linhas.map((linha, idx) => {
        const enquadramento = enquadramentos.find((e) => e.id === linha.enquadramentoId);
        return (
          <div key={linha.key} className="space-y-2 rounded-xl border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Atividade {idx + 1}</span>
              {linhas.length > 1 && (
                <button
                  type="button"
                  onClick={() => remover(linha.key)}
                  className="text-xs text-red-600 underline"
                >
                  Remover
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Enquadramento
                </label>
                <select
                  name={`atividades[${idx}][enquadramentoId]`}
                  required
                  value={linha.enquadramentoId}
                  onChange={(e) => definirEnquadramento(linha.key, e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">Selecione...</option>
                  {(["ACADEMICA", "ADMINISTRATIVA"] as const).map((categoria) => {
                    const opcoes = enquadramentos.filter((e) => e.categoria === categoria);
                    if (opcoes.length === 0) return null;
                    return (
                      <optgroup key={categoria} label={CATEGORIA_LABEL[categoria]}>
                        {opcoes.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.nome}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Descrição
                </label>
                <input
                  name={`atividades[${idx}][descricao]`}
                  required
                  className="w-full rounded-xl border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>

              {enquadramento?.exigeDetalhamento && (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Detalhamento
                    {enquadramento.descricao ? ` (${enquadramento.descricao})` : ""}
                  </label>
                  <input
                    name={`atividades[${idx}][detalhamento]`}
                    required
                    className="w-full rounded-xl border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </div>
              )}

              {enquadramento?.exigeAnexo && (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Anexo obrigatório
                  </label>
                  <input
                    type="file"
                    name={`atividades[${idx}][anexo]`}
                    accept="application/pdf"
                    required
                    className="w-full text-sm"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Início</label>
                <input
                  type="datetime-local"
                  name={`atividades[${idx}][dataHoraInicio]`}
                  required
                  className="w-full rounded-xl border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Fim</label>
                <input
                  type="datetime-local"
                  name={`atividades[${idx}][dataHoraFim]`}
                  required
                  className="w-full rounded-xl border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          </div>
        );
      })}

      <input type="hidden" name="quantidadeAtividades" value={linhas.length} />
    </div>
  );
}
