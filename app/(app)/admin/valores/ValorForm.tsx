"use client";

import { useState, useTransition } from "react";
import { definirValorDiariaAction } from "@/lib/actions/admin";

export default function ValorForm({
  categoriaId,
  tipoDestinoId,
  valorAtual,
  moedaAtual,
  label,
}: {
  categoriaId: string;
  tipoDestinoId: string;
  valorAtual: number | null;
  moedaAtual: string;
  label: string;
}) {
  const [editando, setEditando] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (!editando) {
    return (
      <button
        onClick={() => setEditando(true)}
        className="text-slate-700 underline decoration-dotted hover:text-slate-900"
      >
        {label}
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await definirValorDiariaAction(formData);
            setEditando(false);
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Erro inesperado.");
          }
        });
      }}
      className="flex items-center gap-1"
    >
      <input type="hidden" name="categoriaId" value={categoriaId} />
      <input type="hidden" name="tipoDestinoId" value={tipoDestinoId} />
      <select
        name="moeda"
        defaultValue={moedaAtual}
        className="rounded-xl border border-slate-300 px-1 py-1 text-xs"
      >
        <option value="BRL">R$</option>
        <option value="USD">US$</option>
      </select>
      <input
        name="valor"
        type="number"
        step="0.01"
        min={0}
        required
        defaultValue={valorAtual ?? undefined}
        className="w-20 rounded-xl border border-slate-300 px-2 py-1 text-xs"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[#003366] px-2 py-1 text-xs text-white hover:bg-[#002244] disabled:opacity-60"
      >
        OK
      </button>
      <button
        type="button"
        onClick={() => setEditando(false)}
        className="text-xs text-slate-500"
      >
        Cancelar
      </button>
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </form>
  );
}
