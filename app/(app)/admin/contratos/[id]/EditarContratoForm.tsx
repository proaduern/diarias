"use client";

import { useState, useTransition } from "react";
import { atualizarContratoAction } from "@/lib/actions/contratos";
import { formatarCnpj } from "@/lib/formato";

interface ContratoParaEdicao {
  id: string;
  tipoBeneficio: string;
  empresaNome: string;
  empresaCnpj: string;
  numeroContrato: string;
  numeroProcessoSei: string;
  vigenciaInicio: Date;
  vigenciaFim: Date;
  valorTotalCentavos: number;
  ativo: boolean;
}

function paraInputDate(data: Date): string {
  return data.toISOString().slice(0, 10);
}

export default function EditarContratoForm({ contrato }: { contrato: ContratoParaEdicao }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await atualizarContratoAction(contrato.id, formData);
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Erro inesperado.");
          }
        });
      }}
      className="space-y-3 rounded-2xl border border-slate-100 bg-white shadow-sm p-4"
    >
      <h2 className="text-sm font-semibold text-slate-900">Dados do contrato</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Tipo de benefício</label>
          <select
            name="tipoBeneficio"
            required
            defaultValue={contrato.tipoBeneficio}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="HOSPEDAGEM">Hospedagem</option>
            <option value="PASSAGEM_AEREA">Passagem aérea</option>
            <option value="PASSAGEM_TERRESTRE">Passagem terrestre</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Empresa contratada</label>
          <input
            name="empresaNome"
            required
            defaultValue={contrato.empresaNome}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">CNPJ</label>
          <input
            name="empresaCnpj"
            required
            defaultValue={formatarCnpj(contrato.empresaCnpj)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Número do contrato</label>
          <input
            name="numeroContrato"
            required
            defaultValue={contrato.numeroContrato}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Número do processo SEI</label>
          <input
            name="numeroProcessoSei"
            required
            defaultValue={contrato.numeroProcessoSei}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Valor total do contrato (R$)</label>
          <input
            name="valorTotal"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={(contrato.valorTotalCentavos / 100).toFixed(2)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Vigência — início</label>
          <input
            name="vigenciaInicio"
            type="date"
            required
            defaultValue={paraInputDate(contrato.vigenciaInicio)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Vigência — fim</label>
          <input
            name="vigenciaFim"
            type="date"
            required
            defaultValue={paraInputDate(contrato.vigenciaFim)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="ativo" defaultChecked={contrato.ativo} />
        Contrato ativo (desmarque em rescisão/não-renovação)
      </label>

      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}
