"use client";

import { useTransition } from "react";
import {
  excluirBeneficiarioAction,
  reativarBeneficiarioAction,
} from "@/lib/actions/beneficiarios";

export default function BotaoExcluirBeneficiario({
  beneficiarioId,
  ativo,
}: {
  beneficiarioId: string;
  ativo: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  if (!ativo) {
    return (
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await reativarBeneficiarioAction(beneficiarioId);
          })
        }
        className="text-xs font-medium text-slate-600 underline hover:text-slate-900"
      >
        Reativar
      </button>
    );
  }

  return (
    <button
      disabled={isPending}
      onClick={() => {
        if (
          confirm(
            "Excluir este beneficiário? Se ele já tiver pedidos vinculados, ele será apenas desativado.",
          )
        ) {
          startTransition(async () => {
            await excluirBeneficiarioAction(beneficiarioId);
          });
        }
      }}
      className="text-xs font-medium text-red-600 underline hover:text-red-800"
    >
      Excluir
    </button>
  );
}
