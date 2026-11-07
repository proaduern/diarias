'use client';

import React, { useState, useTransition } from 'react';
import {
  ShieldAlert,
  ChevronDown,
  Building2,
  FileText,
  Plane,
  X,
  Sparkles,
} from 'lucide-react';
import {
  iniciarAtuarComoAction,
  encerrarAtuarComoAction,
} from '@/lib/actions/auth';

interface BarraImpersonacaoAdminProps {
  sessaoReal?: {
    userId: string;
    nome: string;
    perfil: string;
  } | null;
  sessaoAtual?: {
    userId: string;
    nome: string;
    perfil: string;
  } | null;
}

export default function BarraImpersonacaoAdmin({
  sessaoReal,
  sessaoAtual,
}: BarraImpersonacaoAdminProps) {
  const [isPending, startTransition] = useTransition();
  const [menuAberto, setMenuAberto] = useState(false);

  const isAdminReal = sessaoReal?.perfil === 'ADMIN';

  if (!isAdminReal) {
    return null;
  }

  const isImpersonando = sessaoAtual?.perfil !== 'ADMIN';

  const handleTrocarPerfil = (tipo: 'DEMANDANTE' | 'ADMIN') => {
    setMenuAberto(false);
    startTransition(async () => {
      try {
        await iniciarAtuarComoAction(tipo);
      } catch (e: any) {
        alert(e?.message || 'Erro ao alternar perfil.');
      }
    });
  };

  const handleEncerrar = () => {
    setMenuAberto(false);
    startTransition(async () => {
      try {
        await encerrarAtuarComoAction();
      } catch (e: any) {
        alert(e?.message || 'Erro ao retornar ao modo administrador.');
      }
    });
  };

  return (
    <>
      {isImpersonando ? (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 text-slate-950 px-4 py-2 border-b border-amber-400 shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-black/20 text-white animate-pulse">
                <ShieldAlert className="w-4 h-4 text-yellow-100" />
              </span>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="bg-black text-amber-300 font-extrabold uppercase px-1.5 py-0.5 rounded text-[10px] tracking-wider">
                    Modo Simulação PROAD
                  </span>
                  <span>Atuando como:</span>
                  <strong className="text-black bg-white/70 px-2 py-0.5 rounded font-bold shadow-sm">
                    {sessaoAtual?.nome}
                  </strong>
                  <span className="text-amber-950 font-semibold">
                    (Demandante / Solicitante de Diárias)
                  </span>
                </div>
                <div className="text-[11px] text-amber-950 mt-0.5">
                  Sessão Real: <strong>{sessaoReal?.nome}</strong> (Administrador PROAD)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 relative">
              <button
                type="button"
                onClick={handleEncerrar}
                disabled={isPending}
                className="px-3 py-1 rounded bg-slate-950 text-white hover:bg-slate-900 font-bold flex items-center gap-1.5 shadow transition disabled:opacity-50"
                title="Restaurar modo Administrador PROAD"
              >
                <X className="w-3.5 h-3.5 text-amber-400" />
                <span>{isPending ? 'Saindo...' : 'Voltar para Admin'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 text-slate-200 border-b border-slate-800 px-4 py-1.5 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>
                Sessão Oficial PROAD: <strong>{sessaoReal?.nome}</strong> (Administrador Geral)
              </span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuAberto(!menuAberto)}
                className="px-2.5 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1.5 transition text-[11px]"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>🎭 Atuar Como Perfil...</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {menuAberto && (
                <div className="absolute right-0 top-7 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Simular Perfil em Diárias & Passagens
                  </div>
                  <button
                    onClick={() => handleTrocarPerfil('DEMANDANTE')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <Plane className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Demandante da Unidade</div>
                      <div className="text-[10px] text-slate-500">Solicitação de diárias e prestação de contas</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
