"use client";

import { useActionState, useState } from "react";
import {
  criarBeneficiarioAction,
  type CriarBeneficiarioState,
} from "@/lib/actions/beneficiarios";
import type { CategoriaBeneficiario, Unidade } from "@prisma/client";

const initialState: CriarBeneficiarioState = {};

export default function NovoBeneficiarioForm({
  categorias,
  unidades,
}: {
  categorias: CategoriaBeneficiario[];
  unidades: Unidade[];
}) {
  const [state, formAction, pending] = useActionState(
    criarBeneficiarioAction,
    initialState,
  );
  const [aberto, setAberto] = useState(false);
  const [semVinculo, setSemVinculo] = useState(false);

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Cadastrar beneficiário
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
    >
      <h2 className="text-sm font-semibold text-slate-900">Novo beneficiário</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Nome completo
          </label>
          <input
            name="nome"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            CPF
          </label>
          <input
            name="cpf"
            required
            placeholder="000.000.000-00"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Banco
          </label>
          <input
            name="banco"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Agência
          </label>
          <input
            name="agencia"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Conta corrente
          </label>
          <input
            name="contaCorrente"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Categoria
          </label>
          <select
            name="categoriaId"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Selecione...</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
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
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
      </div>

      {state.erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.erro}
        </p>
      )}
      {state.sucesso && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Beneficiário cadastrado com sucesso.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
