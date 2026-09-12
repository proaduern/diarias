"use client";

import { useActionState } from "react";
import { criarPedidoAction, type CriarPedidoState } from "@/lib/actions/pedidos";
import type { Beneficiario, TipoDestino, Unidade } from "@prisma/client";

const initialState: CriarPedidoState = {};

export default function NovoPedidoForm({
  beneficiarios,
  tiposDestino,
  unidades,
  ehAdmin,
  prazoMinimoDias,
  kmMinimo,
}: {
  beneficiarios: Beneficiario[];
  tiposDestino: TipoDestino[];
  unidades: Unidade[];
  ehAdmin: boolean;
  prazoMinimoDias: number;
  kmMinimo: number;
}) {
  const [state, formAction, pending] = useActionState(criarPedidoAction, initialState);

  return (
    <form
      action={formAction}
      className="max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-6"
    >
      {ehAdmin && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Unidade solicitante
          </label>
          <select
            name="unidadeSolicitanteId"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Selecione...</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Beneficiário
        </label>
        <select
          name="beneficiarioId"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Selecione...</option>
          {beneficiarios.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Finalidade da viagem
        </label>
        <input
          name="finalidade"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Município de destino
          </label>
          <input
            name="municipioDestino"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Tipo de destino (para fins de valor de diária)
          </label>
          <select
            name="tipoDestinoId"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Selecione...</option>
            {tiposDestino.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Distância da sede ao destino (km)
        </label>
        <input
          name="kmDeclarado"
          type="number"
          min={0}
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">
          O KM informado será conferido pela distância aferida no Google Maps,
          para fins de padronização. Deslocamentos abaixo de {kmMinimo} km sem
          pernoite não fazem jus a diária.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Saída da sede
          </label>
          <input
            name="saidaSede"
            type="datetime-local"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Chegada ao destino
          </label>
          <input
            name="chegadaDestino"
            type="datetime-local"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Saída do destino (retorno)
          </label>
          <input
            name="saidaDestino"
            type="datetime-local"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-slate-500">
            Só configura pernoite se for às 06h ou depois do dia seguinte.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Chegada à sede
          </label>
          <input
            name="chegadaSede"
            type="datetime-local"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Justificativa para lançamento fora do prazo (só obrigatório se o
          prazo mínimo de {prazoMinimoDias} dia(s) de antecedência não for
          respeitado)
        </label>
        <textarea
          name="justificativaPrazoCurto"
          rows={2}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {state.erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Lançar pedido"}
      </button>
    </form>
  );
}
