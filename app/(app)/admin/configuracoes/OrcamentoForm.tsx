"use client";

import { useRef, useState, useTransition } from "react";
import { definirOrcamentoAction } from "@/lib/actions/admin";
import type { Unidade } from "@prisma/client";

export default function OrcamentoForm({ unidades }: { unidades: Unidade[] }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await definirOrcamentoAction(formData);
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
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
        <label className="mb-1 block text-xs font-medium text-slate-700">Ano</label>
        <input
          name="ano"
          type="number"
          required
          defaultValue={new Date().getFullYear()}
          className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Valor total (R$)
        </label>
        <input
          name="valorTotal"
          type="number"
          step="0.01"
          min={0}
          required
          className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        Salvar
      </button>
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </form>
  );
}
