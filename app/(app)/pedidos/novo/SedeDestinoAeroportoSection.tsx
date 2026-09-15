"use client";

import { useMemo, useState } from "react";
import { calcularTempoViagemAeroporto } from "@/lib/tempo-viagem";

function formatarMinutos(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const min = Math.round(minutos % 60);
  if (horas === 0) return `${min} min`;
  return `${horas}h${min.toString().padStart(2, "0")}`;
}

export default function SedeDestinoAeroportoSection() {
  const [vaiBuscarAeroporto, setVaiBuscarAeroporto] = useState(false);
  const [kmSedeAeroporto, setKmSedeAeroporto] = useState("");
  const [kmVoo, setKmVoo] = useState("");
  const [kmAeroportoDestino, setKmAeroportoDestino] = useState("");

  const situacao = useMemo(() => {
    const a = Number(kmSedeAeroporto);
    const v = Number(kmVoo);
    const d = Number(kmAeroportoDestino);
    if (!vaiBuscarAeroporto || !kmSedeAeroporto || !kmVoo || !kmAeroportoDestino) return null;
    if (!Number.isFinite(a) || !Number.isFinite(v) || !Number.isFinite(d)) return null;
    return calcularTempoViagemAeroporto({ kmSedeAeroporto: a, kmVoo: v, kmAeroportoDestino: d });
  }, [vaiBuscarAeroporto, kmSedeAeroporto, kmVoo, kmAeroportoDestino]);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">Sede e destino</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Cidade da sede
          </label>
          <input
            name="sedeCidade"
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Estado (UF) da sede
          </label>
          <input
            name="sedeEstado"
            required
            maxLength={2}
            placeholder="RN"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm uppercase"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Estado (UF) do destino
          </label>
          <input
            name="destinoEstado"
            required
            maxLength={2}
            placeholder="RN"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm uppercase"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
        <input
          type="checkbox"
          name="vaiBuscarAeroporto"
          checked={vaiBuscarAeroporto}
          onChange={(e) => setVaiBuscarAeroporto(e.target.checked)}
        />
        Vai buscar o beneficiário no aeroporto?
      </label>

      {vaiBuscarAeroporto && (
        <div className="space-y-2 rounded-xl border border-slate-200 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Sede até o aeroporto (km)
              </label>
              <input
                name="kmSedeAeroporto"
                type="number"
                min={0}
                required
                value={kmSedeAeroporto}
                onChange={(e) => setKmSedeAeroporto(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Distância do voo (km)
              </label>
              <input
                name="kmVoo"
                type="number"
                min={0}
                required
                value={kmVoo}
                onChange={(e) => setKmVoo(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-2 py-1.5 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">
                Voos com menos de 500 km não são permitidos (use deslocamento terrestre).
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Aeroporto até o destino (km)
              </label>
              <input
                name="kmAeroportoDestino"
                type="number"
                min={0}
                required
                value={kmAeroportoDestino}
                onChange={(e) => setKmAeroportoDestino(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          {situacao?.situacao === "BLOQUEADO_VOO_DISTANCIA_MINIMA" && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
              Distância de voo abaixo de 500 km — não permitido, use deslocamento terrestre.
            </p>
          )}
          {situacao?.situacao === "OK" && (
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Tempo estimado de viagem: {formatarMinutos(situacao.minutosTotais)}{" "}
              (sede–aeroporto {formatarMinutos(situacao.minutosSedeAeroporto)} + voo{" "}
              {formatarMinutos(situacao.minutosVoo)} + aeroporto–destino{" "}
              {formatarMinutos(situacao.minutosAeroportoDestino)})
            </p>
          )}
        </div>
      )}
    </div>
  );
}
