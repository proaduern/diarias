"use client";

import { useRef, useState, useTransition } from "react";
import {
  aprovarJustificativaPrazoAction,
  anexarComprovanteLimiteAction,
  deferirLimiteAction,
  deferirPedidoAction,
  indeferirPedidoAction,
  enviarRelatorioViagemAction,
  regularizarPendenciaAction,
} from "@/lib/actions/pedidos";

interface PedidoAcoes {
  id: string;
  status: string;
  relatorioEnviadoEm: Date | null;
  pendenciaRegularizadaEm: Date | null;
}

export default function AcoesPedido({
  pedido,
  situacaoPrestacao,
  ehAdmin,
  temComprovanteLimite,
}: {
  pedido: PedidoAcoes;
  situacaoPrestacao: string | null;
  ehAdmin: boolean;
  temComprovanteLimite: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarIndeferir, setMostrarIndeferir] = useState(false);
  const motivoRef = useRef<HTMLTextAreaElement>(null);

  function executar(fn: () => Promise<unknown>) {
    setErro(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro inesperado.");
      }
    });
  }

  const acoes: React.ReactNode[] = [];

  if (ehAdmin && pedido.status === "AGUARDANDO_JUSTIFICATIVA_PRAZO") {
    acoes.push(
      <button
        key="aprovar-justificativa"
        disabled={isPending}
        onClick={() => executar(() => aprovarJustificativaPrazoAction(pedido.id))}
        className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
      >
        Aceitar justificativa de prazo
      </button>,
    );
  }

  if (pedido.status === "AGUARDANDO_DELIBERACAO_LIMITE") {
    acoes.push(
      <form
        key="anexar-comprovante"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const formData = new FormData(form);
          executar(() => anexarComprovanteLimiteAction(pedido.id, formData));
        }}
        className="flex items-center gap-2"
      >
        <input type="file" name="arquivo" accept="application/pdf" required className="text-sm" />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-60"
        >
          Anexar comprovante de autorização
        </button>
      </form>,
    );

    if (ehAdmin) {
      acoes.push(
        <button
          key="deferir-limite"
          disabled={isPending || !temComprovanteLimite}
          onClick={() => executar(() => deferirLimiteAction(pedido.id))}
          title={
            !temComprovanteLimite
              ? "Anexe o comprovante de autorização antes de liberar."
              : undefined
          }
          className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
        >
          Validar comprovante e liberar para deferimento
        </button>,
      );
    }
  }

  if (ehAdmin && pedido.status === "AGUARDANDO_DEFERIMENTO") {
    acoes.push(
      <button
        key="deferir"
        disabled={isPending}
        onClick={() => executar(() => deferirPedidoAction(pedido.id))}
        className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
      >
        Deferir
      </button>,
    );
  }

  if (
    ehAdmin &&
    ["AGUARDANDO_JUSTIFICATIVA_PRAZO", "AGUARDANDO_DELIBERACAO_LIMITE", "AGUARDANDO_DEFERIMENTO"].includes(
      pedido.status,
    )
  ) {
    acoes.push(
      <button
        key="indeferir-toggle"
        disabled={isPending}
        onClick={() => setMostrarIndeferir((v) => !v)}
        className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        Indeferir
      </button>,
    );
  }

  if (
    pedido.status === "DEFERIDO" &&
    !pedido.relatorioEnviadoEm &&
    (situacaoPrestacao === "AGUARDANDO_RELATORIO_NO_PRAZO" ||
      situacaoPrestacao === "RELATORIO_ATRASADO")
  ) {
    acoes.push(
      <form
        key="enviar-relatorio"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const formData = new FormData(form);
          executar(() => enviarRelatorioViagemAction(pedido.id, formData));
        }}
        className="flex items-center gap-2"
      >
        <input type="file" name="arquivo" accept="application/pdf" required className="text-sm" />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-60"
        >
          Enviar relatório de viagem
        </button>
      </form>,
    );
  }

  if (
    ehAdmin &&
    pedido.status === "DEFERIDO" &&
    !pedido.pendenciaRegularizadaEm &&
    (situacaoPrestacao === "RELATORIO_ATRASADO" || situacaoPrestacao === "DEVOLUCAO_PENDENTE")
  ) {
    acoes.push(
      <button
        key="regularizar"
        disabled={isPending}
        onClick={() => executar(() => regularizarPendenciaAction(pedido.id))}
        className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-60"
      >
        Marcar pendência como regularizada
      </button>,
    );
  }

  if (acoes.length === 0 && !mostrarIndeferir) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
      <h2 className="text-sm font-semibold text-slate-900">Ações</h2>
      <div className="flex flex-wrap items-center gap-3">{acoes}</div>

      {mostrarIndeferir && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData();
            formData.set("motivo", motivoRef.current?.value ?? "");
            executar(() => indeferirPedidoAction(pedido.id, formData));
          }}
          className="space-y-2"
        >
          <textarea
            ref={motivoRef}
            required
            placeholder="Motivo do indeferimento"
            rows={2}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            Confirmar indeferimento
          </button>
        </form>
      )}

      {erro && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
      )}
    </section>
  );
}
