"use client";

import { useState, useTransition } from "react";
import { emitirPortariaAction } from "@/lib/actions/portaria";
import { formatarDataHora } from "@/lib/formato";

function paraInputDate(data: Date | null): string {
  if (!data) return "";
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export default function EmitirPortariaForm({
  pedidoId,
  valoresIniciais,
  portariaEmitidaEm,
  portariaEmitidaPor,
  bloqueios,
}: {
  pedidoId: string;
  valoresIniciais: {
    numeroProcessoSei: string | null;
    idPropostaConcessao: string | null;
    portariaNumero: string | null;
    portariaData: Date | null;
  };
  portariaEmitidaEm: Date | null;
  portariaEmitidaPor: string | null;
  bloqueios: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (bloqueios.length > 0) {
    return (
      <section className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-sm font-semibold text-amber-900">
          Emissão de portaria (.docx) indisponível
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
          {bloqueios.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>
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
            await emitirPortariaAction(pedidoId, formData);
            window.location.href = `/api/pedidos/${pedidoId}/portaria`;
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Erro inesperado.");
          }
        });
      }}
      className="space-y-3 rounded-2xl border border-slate-100 bg-white shadow-sm p-4"
    >
      <h2 className="text-sm font-semibold text-slate-900">Emitir portaria (.docx)</h2>
      <p className="text-xs text-slate-500">
        Documento para levar à assinatura no SEI — não é o documento já
        assinado. O número da portaria é digitado manualmente, sem contador
        automático.
      </p>

      {portariaEmitidaEm && (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Última emissão em {formatarDataHora(portariaEmitidaEm)} por {portariaEmitidaPor}.
          Reemitir substitui os dados abaixo e gera um novo download.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Processo SEI</label>
          <input
            name="numeroProcessoSei"
            required
            defaultValue={valoresIniciais.numeroProcessoSei ?? ""}
            placeholder="00000000.000000/0000-00"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            ID da Proposta de Concessão de Diárias
          </label>
          <input
            name="idPropostaConcessao"
            required
            defaultValue={valoresIniciais.idPropostaConcessao ?? ""}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Número da portaria (sem ano/sigla)
          </label>
          <input
            name="portariaNumero"
            required
            defaultValue={valoresIniciais.portariaNumero ?? ""}
            placeholder="Ex.: 3785"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Data da portaria</label>
          <input
            name="portariaData"
            type="date"
            required
            defaultValue={paraInputDate(valoresIniciais.portariaData)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
      >
        {isPending ? "Gerando..." : "Emitir e baixar .docx"}
      </button>
    </form>
  );
}
