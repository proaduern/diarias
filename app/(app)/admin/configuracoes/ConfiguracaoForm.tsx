"use client";

import { useState, useTransition } from "react";
import { atualizarConfiguracaoAction } from "@/lib/actions/admin";
import type { ConfiguracaoSistema } from "@prisma/client";

export default function ConfiguracaoForm({ config }: { config: ConfiguracaoSistema }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const campos = [
    {
      name: "limiteMensalDiarias",
      label: "Limite mensal de diárias por beneficiário (Art. 15)",
      defaultValue: config.limiteMensalDiarias,
    },
    {
      name: "prazoMinimoDiasAntecedencia",
      label: "Prazo mínimo de antecedência (dias)",
      defaultValue: config.prazoMinimoDiasAntecedencia,
    },
    {
      name: "prazoRelatorioDiasUteis",
      label: "Prazo do relatório de viagem (dias úteis)",
      defaultValue: config.prazoRelatorioDiasUteis,
    },
    {
      name: "prazoDevolucaoDiasCorridos",
      label: "Prazo para devolução se relatório não enviado (dias corridos)",
      defaultValue: config.prazoDevolucaoDiasCorridos,
    },
    {
      name: "kmMinimoSemPernoite",
      label: "Distância mínima sem pernoite para haver diária (km)",
      defaultValue: config.kmMinimoSemPernoite,
    },
    {
      name: "duracaoMinimaHoras",
      label: "Duração mínima do afastamento para haver diária (horas)",
      defaultValue: config.duracaoMinimaHoras,
    },
  ];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        setSucesso(false);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await atualizarConfiguracaoAction(formData);
            setSucesso(true);
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Erro inesperado.");
          }
        });
      }}
      className="space-y-3 rounded-2xl border border-slate-100 bg-white shadow-sm p-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {campos.map((c) => (
          <div key={c.name}>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              {c.label}
            </label>
            <input
              name={c.name}
              type="number"
              min={0}
              required
              defaultValue={c.defaultValue}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        ))}
      </div>

      {erro && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
      )}
      {sucesso && (
        <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">
          Configuração atualizada.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
