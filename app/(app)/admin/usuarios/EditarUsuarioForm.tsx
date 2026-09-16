"use client";

import { useState, useTransition } from "react";
import { atualizarUsuarioAction } from "@/lib/actions/admin";
import { formatarCpf } from "@/lib/formato";
import type { Unidade } from "@prisma/client";

interface UsuarioParaEdicao {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  perfil: "ADMIN" | "DEMANDANTE";
  unidadeId: string | null;
}

export default function EditarUsuarioForm({
  usuario,
  unidades,
}: {
  usuario: UsuarioParaEdicao;
  unidades: Unidade[];
}) {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} className="text-xs text-slate-600 underline">
        Editar
      </button>
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
            await atualizarUsuarioAction(usuario.id, formData);
            setAberto(false);
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Erro inesperado.");
          }
        });
      }}
      className="mt-2 w-72 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Nome</label>
        <input
          name="nome"
          required
          defaultValue={usuario.nome}
          className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Email</label>
        <input
          name="email"
          type="email"
          required
          defaultValue={usuario.email}
          className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">CPF</label>
        <input
          name="cpf"
          required
          defaultValue={formatarCpf(usuario.cpf)}
          className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Perfil</label>
        <select
          name="perfil"
          required
          defaultValue={usuario.perfil}
          className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
        >
          <option value="DEMANDANTE">Demandante</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Unidade (obrigatório para demandante)
        </label>
        <select
          name="unidadeId"
          defaultValue={usuario.unidadeId ?? ""}
          className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
        >
          <option value="">Selecione...</option>
          {unidades.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Nova senha (deixe em branco para manter a atual)
        </label>
        <input
          name="senha"
          type="password"
          className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
        />
      </div>

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#003366] px-2 py-1 text-xs text-white hover:bg-[#002244] disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" onClick={() => setAberto(false)} className="text-xs text-slate-500">
          Cancelar
        </button>
      </div>
    </form>
  );
}
