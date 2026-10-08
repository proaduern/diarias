"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BotaoSincronizarSgc() {
  const [sincronizando, setSincronizando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const router = useRouter();

  const handleSincronizar = async () => {
    try {
      setSincronizando(true);
      setMensagem(null);

      const res = await fetch("/api/integracao/sgc-contratos", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erro ao sincronizar com o SGC.");
      } else {
        setMensagem(data.mensagem);
        router.refresh();
      }
    } catch (err: any) {
      alert("Erro de conexão com a API de integração do SGC.");
    } finally {
      setSincronizando(false);
    }
  };

  return (
    <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/60 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Interoperabilidade PROAD
          </div>
          <h2 className="text-sm font-bold text-slate-900">
            Sincronização de Contratos com o SGC-UERN
          </h2>
          <p className="text-xs text-slate-600 max-w-xl">
            Importe ou atualize automaticamente contratos ativos de agenciamento de viagens, passagens aéreas e hospedagem cadastrados na gestão central de contratos da universidade.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSincronizar}
            disabled={sincronizando}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${sincronizando ? "animate-spin" : ""}`} />
            <span>{sincronizando ? "Sincronizando..." : "Sincronizar com SGC"}</span>
          </button>
        </div>
      </div>

      {mensagem && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{mensagem}</span>
        </div>
      )}
    </div>
  );
}
