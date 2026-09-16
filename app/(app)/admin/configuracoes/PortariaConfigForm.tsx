"use client";

import { useState, useTransition } from "react";
import { atualizarConfiguracaoPortariaAction } from "@/lib/actions/admin";
import type { ConfiguracaoSistema } from "@prisma/client";

function paraInputDate(data: Date | null): string {
  if (!data) return "";
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export default function PortariaConfigForm({ config }: { config: ConfiguracaoSistema }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        setSucesso(false);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await atualizarConfiguracaoPortariaAction(formData);
            setSucesso(true);
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Erro inesperado.");
          }
        });
      }}
      className="space-y-3 rounded-2xl border border-slate-100 bg-white shadow-sm p-4"
    >
      <h2 className="text-sm font-semibold text-slate-900">
        Emissão de portaria de concessão de diária
      </h2>
      <p className="text-xs text-slate-500">
        Dados fixos usados em toda emissão de portaria (.docx). Edite apenas
        quando houver nova delegação de poderes ou troca de gestão.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Nº da portaria de delegação de poderes (ex.: 3674/2025)
          </label>
          <input
            name="numeroPortariaDelegacao"
            type="text"
            required
            defaultValue={config.numeroPortariaDelegacao ?? ""}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Data da portaria de delegação
          </label>
          <input
            name="dataPortariaDelegacao"
            type="date"
            required
            defaultValue={paraInputDate(config.dataPortariaDelegacao)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            1º assinante — nome
          </label>
          <input
            name="assinante1Nome"
            type="text"
            required
            defaultValue={config.assinante1Nome ?? ""}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            1º assinante — cargo
          </label>
          <input
            name="assinante1Cargo"
            type="text"
            required
            defaultValue={config.assinante1Cargo ?? ""}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            2º assinante — nome
          </label>
          <input
            name="assinante2Nome"
            type="text"
            required
            defaultValue={config.assinante2Nome ?? ""}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            2º assinante — cargo
          </label>
          <input
            name="assinante2Cargo"
            type="text"
            required
            defaultValue={config.assinante2Cargo ?? ""}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
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
