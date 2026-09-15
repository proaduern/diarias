"use client";

import { useRef, useState, useTransition } from "react";
import {
  definirCotaContratoUnidadeAction,
  excluirCotaContratoUnidadeAction,
} from "@/lib/actions/contratos";
import { formatarMoeda } from "@/lib/formato";
import type { Unidade } from "@prisma/client";

interface Cota {
  id: string;
  unidadeId: string;
  unidadeNome: string;
  cotaCentavos: number;
}

export default function CotasContratoSection({
  contratoId,
  unidades,
  cotas,
}: {
  contratoId: string;
  unidades: Unidade[];
  cotas: Cota[];
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
      <h2 className="text-sm font-semibold text-slate-900">Cota por unidade</h2>
      <p className="text-xs text-slate-500">
        Cota 0 (ou unidade sem registro aqui) significa que ela não tem teto
        próprio e disputa livremente o saldo global do contrato acima.
      </p>

      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          setErro(null);
          const formData = new FormData(e.currentTarget);
          startTransition(async () => {
            try {
              await definirCotaContratoUnidadeAction(contratoId, formData);
              formRef.current?.reset();
            } catch (err) {
              setErro(err instanceof Error ? err.message : "Erro inesperado.");
            }
          });
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Unidade</label>
          <select
            name="unidadeId"
            required
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Selecione...</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Cota (R$)</label>
          <input
            name="cota"
            type="number"
            step="0.01"
            min="0"
            defaultValue="0"
            className="w-32 rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
        >
          Salvar cota
        </button>
      </form>

      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Unidade</th>
              <th className="px-3 py-2 font-medium">Cota</th>
              <th className="px-3 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cotas.map((c) => (
              <tr key={c.id}>
                <td className="px-3 py-2 text-slate-900">{c.unidadeNome}</td>
                <td className="px-3 py-2 text-slate-600">
                  {c.cotaCentavos > 0
                    ? formatarMoeda(c.cotaCentavos, "BRL")
                    : "Sem teto próprio (saldo global)"}
                </td>
                <td className="px-3 py-2">
                  <button
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          await excluirCotaContratoUnidadeAction(c.id);
                        } catch (err) {
                          setErro(err instanceof Error ? err.message : "Erro inesperado.");
                        }
                      })
                    }
                    className="text-xs font-medium text-red-600 underline hover:text-red-800 disabled:opacity-60"
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
            {cotas.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center text-slate-400">
                  Nenhuma unidade com cota própria cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
