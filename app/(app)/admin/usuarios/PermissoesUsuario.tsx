"use client";

import { useTransition } from "react";
import {
  alterarPermissaoEditarBeneficiariosAction,
  alterarPermissaoImportarUsuariosAction,
} from "@/lib/actions/admin";

export default function PermissoesUsuario({
  usuarioId,
  podeImportarUsuarios,
  podeEditarBeneficiarios,
}: {
  usuarioId: string;
  podeImportarUsuarios: boolean;
  podeEditarBeneficiarios: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-1 text-xs text-slate-600">
      <label className="flex items-center gap-1.5">
        <input
          type="checkbox"
          defaultChecked={podeImportarUsuarios}
          disabled={isPending}
          onChange={(e) =>
            startTransition(() => alterarPermissaoImportarUsuariosAction(usuarioId, e.target.checked))
          }
        />
        Importar usuários (própria unidade)
      </label>
      <label className="flex items-center gap-1.5">
        <input
          type="checkbox"
          defaultChecked={podeEditarBeneficiarios}
          disabled={isPending}
          onChange={(e) =>
            startTransition(() => alterarPermissaoEditarBeneficiariosAction(usuarioId, e.target.checked))
          }
        />
        Editar beneficiários (própria unidade)
      </label>
    </div>
  );
}
