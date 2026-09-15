"use client";

import { useActionState } from "react";
import { BookOpen, Mail, Lock, ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";
import { loginAction, type LoginState } from "@/lib/actions/auth";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="flex min-h-screen flex-col justify-between bg-gradient-to-br from-slate-900 via-[#002244] to-[#003366] p-4 md:p-8">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between py-2">
        <div className="flex items-center space-x-3 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/40 bg-blue-600/30 text-lg font-bold shadow-lg">
            D
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wide md:text-lg">FUERN</h1>
            <p className="text-xs text-blue-200">Fundação Universidade do Estado do Rio Grande do Norte</p>
          </div>
        </div>
        <div className="hidden items-center space-x-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-blue-200 backdrop-blur-sm sm:flex">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Sistema de Diárias</span>
        </div>
      </header>

      <main className="mx-auto my-auto w-full max-w-sm py-6">
        <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#003366] shadow-inner">
              <BookOpen className="h-7 w-7 text-[#0055A5]" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Sistema de Diárias</h2>
            <p className="mt-1 text-sm text-slate-500">
              Fundação Universidade do Estado do Rio Grande do Norte
            </p>
          </div>

          {state.erro && (
            <div className="mb-6 flex items-start space-x-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
              <span>{state.erro}</span>
            </div>
          )}

          <form action={formAction} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="voce@uern.br"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-4 text-sm outline-none transition-all hover:bg-white focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Senha
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  name="senha"
                  type="password"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-4 text-sm outline-none transition-all hover:bg-white focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="flex w-full cursor-pointer items-center justify-center space-x-2 rounded-xl bg-[#003366] px-4 py-3.5 font-semibold text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-[#002244] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl py-4 text-center text-xs text-blue-200/70">
        <p>Fundação Universidade do Estado do Rio Grande do Norte - FUERN</p>
      </footer>
    </div>
  );
}
