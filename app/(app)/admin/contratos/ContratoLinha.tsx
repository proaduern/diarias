"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { excluirContratoAction } from "@/lib/actions/contratos";
import { formatarCnpj, formatarData, formatarMoeda } from "@/lib/formato";
import CotasContratoSection from "./CotasContratoSection";
import type { Unidade } from "@prisma/client";

const TIPO_LABEL: Record<string, string> = {
  HOSPEDAGEM: "Hospedagem",
  PASSAGEM_AEREA: "Passagem aérea",
  PASSAGEM_TERRESTRE: "Passagem terrestre",
};

interface Cota {
  id: string;
  unidadeId: string;
  unidadeNome: string;
  cotaCentavos: number;
}

interface ContratoLinhaProps {
  contrato: {
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
  };
  unidades: Unidade[];
  cotas: Cota[];
}

export default function ContratoLinha({ contrato: c, unidades, cotas }: ContratoLinhaProps) {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <>
      <tr className={c.ativo ? "" : "opacity-50"}>
        <td className="px-4 py-2 text-slate-600">{TIPO_LABEL[c.tipoBeneficio]}</td>
        <td className="px-4 py-2 text-slate-900">
          {c.empresaNome}
          <span className="block text-xs text-slate-400">{formatarCnpj(c.empresaCnpj)}</span>
        </td>
        <td className="px-4 py-2 text-slate-600">
          {c.numeroContrato} / SEI {c.numeroProcessoSei}
        </td>
        <td className="px-4 py-2 text-slate-600">
          {formatarData(c.vigenciaInicio)} a {formatarData(c.vigenciaFim)}
        </td>
        <td className="px-4 py-2 text-slate-600">{formatarMoeda(c.valorTotalCentavos, "BRL")}</td>
        <td className="px-4 py-2 text-slate-600">{c.ativo ? "Ativo" : "Inativo"}</td>
        <td className="px-4 py-2 space-y-1">
          <button
            onClick={() => setAberto((v) => !v)}
            className="block text-xs font-medium text-slate-600 underline"
          >
            {aberto ? "Ocultar cotas" : `Cotas por unidade (${cotas.length})`}
          </button>
          <Link href={`/admin/contratos/${c.id}`} className="block text-xs text-slate-600 underline">
            Editar contrato
          </Link>
          <button
            disabled={isPending}
            onClick={() => {
              if (!confirm("Tem certeza que deseja excluir?")) return;
              setErro(null);
              startTransition(async () => {
                try {
                  await excluirContratoAction(c.id);
                } catch (err) {
                  setErro(err instanceof Error ? err.message : "Erro inesperado.");
                }
              });
            }}
            className="text-xs font-medium text-red-600 underline hover:text-red-800 disabled:opacity-60"
          >
            Excluir
          </button>
          {erro && <p className="text-xs text-red-600">{erro}</p>}
        </td>
      </tr>
      {aberto && (
        <tr>
          <td colSpan={7} className="bg-slate-50 px-4 py-3">
            <CotasContratoSection contratoId={c.id} unidades={unidades} cotas={cotas} />
          </td>
        </tr>
      )}
    </>
  );
}
