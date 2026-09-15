"use client";

import { useRef, useState, useTransition } from "react";
import { criarEnquadramentoAction } from "@/lib/actions/admin";

export default function NovoEnquadramentoForm() {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244]"
      >
        Novo enquadramento
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await criarEnquadramentoAction(formData);
            formRef.current?.reset();
            setAberto(false);
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Erro inesperado.");
          }
        });
      }}
      className="space-y-3 rounded-2xl border border-slate-100 bg-white shadow-sm p-4"
    >
      <h2 className="text-sm font-semibold text-slate-900">Novo enquadramento</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Categoria</label>
          <select
            name="categoria"
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Selecione...</option>
            <option value="ACADEMICA">Acadêmica</option>
            <option value="ADMINISTRATIVA">Administrativa</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Nome</label>
          <input
            name="nome"
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-700">Descrição</label>
          <input
            name="descricao"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Ordem de exibição</label>
          <input
            name="ordem"
            type="number"
            defaultValue={0}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input type="checkbox" name="exigeDetalhamento" />
            Exige detalhamento (texto livre)
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input type="checkbox" name="exigeAnexo" />
            Exige anexo
          </label>
        </div>
      </div>

      {erro && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
