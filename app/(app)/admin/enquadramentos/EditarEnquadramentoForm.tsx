"use client";

import { useState, useTransition } from "react";
import { atualizarEnquadramentoAction } from "@/lib/actions/admin";

interface EnquadramentoParaEdicao {
  id: string;
  categoria: "ACADEMICA" | "ADMINISTRATIVA";
  nome: string;
  descricao: string | null;
  exigeDetalhamento: boolean;
  exigeAnexo: boolean;
  ativo: boolean;
  ordem: number;
}

export default function EditarEnquadramentoForm({
  enquadramento,
}: {
  enquadramento: EnquadramentoParaEdicao;
}) {
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
            await atualizarEnquadramentoAction(enquadramento.id, formData);
            setAberto(false);
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Erro inesperado.");
          }
        });
      }}
      className="mt-2 w-80 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Categoria</label>
        <select
          name="categoria"
          required
          defaultValue={enquadramento.categoria}
          className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
        >
          <option value="ACADEMICA">Acadêmica</option>
          <option value="ADMINISTRATIVA">Administrativa</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Nome</label>
        <input
          name="nome"
          required
          defaultValue={enquadramento.nome}
          className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Descrição</label>
        <input
          name="descricao"
          defaultValue={enquadramento.descricao ?? ""}
          className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-700">Ordem</label>
          <input
            name="ordem"
            type="number"
            defaultValue={enquadramento.ordem}
            className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
        <input type="checkbox" name="exigeDetalhamento" defaultChecked={enquadramento.exigeDetalhamento} />
        Exige detalhamento (texto livre)
      </label>
      <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
        <input type="checkbox" name="exigeAnexo" defaultChecked={enquadramento.exigeAnexo} />
        Exige anexo
      </label>
      <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
        <input type="checkbox" name="ativo" defaultChecked={enquadramento.ativo} />
        Ativo (aparece para novos pedidos)
      </label>

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
