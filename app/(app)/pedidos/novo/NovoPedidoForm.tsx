"use client";

import { useActionState, useState } from "react";
import { criarViagemComPedidosAction, type CriarViagemState } from "@/lib/actions/viagens";
import AtividadesFormSection from "./AtividadesFormSection";
import SedeDestinoAeroportoSection from "./SedeDestinoAeroportoSection";
import type { Beneficiario, CategoriaBeneficiario, EnquadramentoAtividade, TipoDestino, Unidade } from "@prisma/client";

const initialState: CriarViagemState = {};

type BeneficiarioComCategoria = Beneficiario & {
  categoria: Pick<CategoriaBeneficiario, "elegivelHospedagem">;
};

export default function NovoPedidoForm({
  beneficiarios,
  tiposDestino,
  unidades,
  enquadramentos,
  ehAdmin,
  prazoMinimoDias,
  kmMinimo,
}: {
  beneficiarios: BeneficiarioComCategoria[];
  tiposDestino: TipoDestino[];
  unidades: Unidade[];
  enquadramentos: EnquadramentoAtividade[];
  ehAdmin: boolean;
  prazoMinimoDias: number;
  kmMinimo: number;
}) {
  const [state, formAction, pending] = useActionState(criarViagemComPedidosAction, initialState);
  const [beneficiarioId, setBeneficiarioId] = useState("");

  const beneficiarioSelecionado = beneficiarios.find((b) => b.id === beneficiarioId);
  const elegivelHospedagem = beneficiarioSelecionado?.categoria.elegivelHospedagem ?? false;

  return (
    <form
      action={formAction}
      className="max-w-2xl space-y-4 rounded-2xl border border-slate-100 bg-white shadow-sm p-6"
    >
      {ehAdmin && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Unidade solicitante
          </label>
          <select
            name="unidadeSolicitanteId"
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
          value={beneficiarioId}
          onChange={(e) => setBeneficiarioId(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Tipo de destino (para fins de valor de diária)
          </label>
          <select
            name="tipoDestinoId"
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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

      <SedeDestinoAeroportoSection />

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Distância da sede ao destino (km)
        </label>
        <input
          name="kmDeclarado"
          type="number"
          min={0}
          required
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">
          O KM informado será conferido pela distância aferida no Google Maps,
          para fins de padronização. Deslocamentos abaixo de {kmMinimo} km sem
          pernoite não fazem jus a benefício algum.
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
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <AtividadesFormSection enquadramentos={enquadramentos} />

      <label className="flex items-start gap-2 text-xs text-slate-700">
        <input type="checkbox" name="cienciaPrazoAtividade" className="mt-0.5" />
        <span>
          Tenho ciência de que, se a viagem incluir tempo além do
          estritamente necessário para as atividades (chegada adiantada e/ou
          saída atrasada), a diária/hospedagem cobre apenas o período estrito
          da atividade — os dias de folga não são pagos, e o gestor da
          unidade precisará justificar/autorizar essa folga antes do pedido
          seguir no fluxo normal.
        </span>
      </label>

      <div className="space-y-2 rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">Tipo de pedido</h2>
        <p className="text-xs text-slate-500">
          Diária e hospedagem são mutuamente exclusivas — a diária já cobre
          alimentação e hospedagem. Cada tipo marcado gera um pedido próprio,
          calculado a partir dos mesmos dados acima.
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="tipoDiaria" defaultChecked />
          Diária
        </label>
        {beneficiarioId && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="tipoHospedagem" disabled={!elegivelHospedagem} />
            Hospedagem
            {!elegivelHospedagem && (
              <span className="text-xs text-slate-400">
                (categoria do beneficiário não é elegível para hospedagem)
              </span>
            )}
          </label>
        )}
      </div>

      {state.erro && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Lançar solicitação"}
      </button>
    </form>
  );
}
