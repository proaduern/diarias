"use client";

import { useState, useTransition } from "react";
import { atualizarUnidadeAction } from "@/lib/actions/admin";

interface UnidadeParaEdicao {
  id: string;
  nome: string;
  email: string;
}

export default function EditarUnidadeForm({ unidade }: { unidade: UnidadeParaEdicao }) {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} className="text-xs text-slate-600 underline">
        Editar
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
            await atualizarUnidadeAction(unidade.id, formData);
            setAberto(false);
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Erro inesperado.");
          }
        });
      }}
      className="mt-2 w-72 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Nome</label>
        <input
          name="nome"
          required
          defaultValue={unidade.nome}
          className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Email</label>
        <input
          name="email"
          type="email"
          required
          defaultValue={unidade.email}
          className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
        />
      </div>

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#003366] px-2 py-1 text-xs text-white hover:bg-[#002244] disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" onClick={() => setAberto(false)} className="text-xs text-slate-500">
          Cancelar
        </button>
      </div>
    </form>
  );
}
