"use client";

import { useState, useTransition } from "react";
import { atualizarBeneficiarioAction } from "@/lib/actions/beneficiarios";
import { formatarCpf } from "@/lib/formato";
import type { CategoriaBeneficiario, Unidade } from "@prisma/client";

interface BeneficiarioParaEdicao {
  id: string;
  nome: string;
  cpf: string;
  banco: string;
  agencia: string;
  contaCorrente: string;
  categoriaId: string;
  unidadeVinculoId: string | null;
  matricula: string | null;
  cargo: string | null;
}

export default function EditarBeneficiarioForm({
  beneficiario,
  categorias,
  unidades,
  modoAdmin,
}: {
  beneficiario: BeneficiarioParaEdicao;
  categorias: CategoriaBeneficiario[];
  unidades: Unidade[];
  modoAdmin: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [semVinculo, setSemVinculo] = useState(!beneficiario.unidadeVinculoId);

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
            await atualizarBeneficiarioAction(beneficiario.id, formData);
            setAberto(false);
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Erro inesperado.");
          }
        });
      }}
      className="mt-2 w-full max-w-xl space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Nome completo</label>
          <input
            name="nome"
            required
            defaultValue={beneficiario.nome}
            className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">CPF</label>
          <input
            name="cpf"
            required
            defaultValue={formatarCpf(beneficiario.cpf)}
            className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Banco</label>
          <input
            name="banco"
            required
            defaultValue={beneficiario.banco}
            className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Agência</label>
          <input
            name="agencia"
            required
            defaultValue={beneficiario.agencia}
            className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Conta corrente</label>
          <input
            name="contaCorrente"
            required
            defaultValue={beneficiario.contaCorrente}
            className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Categoria</label>
          <select
            name="categoriaId"
            required
            defaultValue={beneficiario.categoriaId}
            className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
          >
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        {modoAdmin && (
          <div className="sm:col-span-2">
            <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={semVinculo}
                onChange={(e) => setSemVinculo(e.target.checked)}
              />
              Colaborador eventual, sem vínculo funcional com nenhuma unidade
            </label>
            {!semVinculo && (
              <select
                name="unidadeVinculoId"
                defaultValue={beneficiario.unidadeVinculoId ?? ""}
                className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
              >
                <option value="">Selecione a unidade de vínculo...</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
        {!semVinculo && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Matrícula</label>
              <input
                name="matricula"
                required
                defaultValue={beneficiario.matricula ?? ""}
                className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Cargo/função</label>
              <input
                name="cargo"
                required
                defaultValue={beneficiario.cargo ?? ""}
                className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
              />
            </div>
          </>
        )}
      </div>

      {erro && <p className="rounded-xl bg-red-50 px-2 py-1 text-xs text-red-700">{erro}</p>}

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
