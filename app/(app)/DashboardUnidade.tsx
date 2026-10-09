"use client";

import Link from "next/link";
import {
  Wallet,
  Building2,
  Hotel,
  Plane,
  Bus,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatarMoeda } from "@/lib/formato";
import type { DashboardUnidadeDados } from "@/lib/services/dashboard-saldos";

interface DashboardUnidadeProps {
  dados: DashboardUnidadeDados;
}

export default function DashboardUnidade({ dados }: DashboardUnidadeProps) {
  if (!dados.temCotaAtribuida || !dados.unidade || !dados.totais) {
    return null;
  }

  const { unidade, totais, cotasContratos = [], orcamentoDiarias } = dados;

  const getIconeBeneficio = (tipo: string) => {
    switch (tipo) {
      case "HOSPEDAGEM":
        return <Hotel className="h-4 w-4 text-amber-600" />;
      case "PASSAGEM_AEREA":
        return <Plane className="h-4 w-4 text-sky-600" />;
      case "PASSAGEM_TERRESTRE":
        return <Bus className="h-4 w-4 text-emerald-600" />;
      default:
        return <Wallet className="h-4 w-4 text-slate-600" />;
    }
  };

  const getNomeBeneficio = (tipo: string) => {
    switch (tipo) {
      case "HOSPEDAGEM":
        return "Hospedagem";
      case "PASSAGEM_AEREA":
        return "Passagem Aérea";
      case "PASSAGEM_TERRESTRE":
        return "Passagem Terrestre";
      default:
        return tipo;
    }
  };

  const estaComSaldoBaixo = totais.percentualConsumido >= 80 && totais.percentualConsumido < 100;
  const cotaEsgotada = totais.percentualConsumido >= 100;

  return (
    <div className="space-y-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      {/* Banner de Identificação da Unidade e Cota */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-700/20">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Cota Setorial Atribuída
            </span>
            <span className="text-xs text-slate-400 font-medium">{unidade.email}</span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 mt-1 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            {unidade.nome}
          </h2>
          <p className="text-xs text-slate-500">
            Acompanhamento de cotas exclusivas e saldos disponíveis para emissão de solicitações pela sua unidade
          </p>
        </div>

        <Link
          href="/pedidos/novo"
          className="inline-flex items-center gap-1.5 self-start rounded-xl bg-[#003366] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#002244] transition"
        >
          Nova solicitação <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Alerta de Cota Esgotada ou Saldo Baixo */}
      {cotaEsgotada && (
        <div className="rounded-xl border border-red-200 bg-red-50/70 p-3.5 text-xs text-red-800 flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span>
            <strong>Atenção:</strong> A cota atribuída à sua unidade foi 100% consumida. Solicitações adicionais
            podem requerer suplementação ou autorização expressa da administração central (PROAD).
          </span>
        </div>
      )}

      {estaComSaldoBaixo && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-800 flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Aviso de Saldo:</strong> A sua unidade já utilizou mais de 80% da cota atribuída. Acompanhe o
            saldo disponível abaixo antes de planejar novos deslocamentos.
          </span>
        </div>
      )}

      {/* 4 Cards de Saldos da Unidade */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card Destaque: Saldo Disponível */}
        <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            Saldo Disponível da Unidade
          </span>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {formatarMoeda(totais.saldoDisponivelCentavos, "BRL")}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Disponível para novas emissões
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${Math.max(0, 100 - totais.percentualConsumido)}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-emerald-700">
              {(100 - totais.percentualConsumido).toFixed(1)}% livre
            </span>
          </div>
        </div>

        {/* Card Cota Total */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            Cota Total Atribuída
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatarMoeda(totais.cotaTotalCentavos, "BRL")}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Teto setorial da unidade (contratos + diárias)
          </p>
        </div>

        {/* Card Total Utilizado */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            Total Utilizado / Deferido
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatarMoeda(totais.consumidoCentavos, "BRL")}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {totais.percentualConsumido.toFixed(1)}% consumido da cota
          </p>
        </div>

        {/* Card Em Análise */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            Em Análise / Tramitando
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatarMoeda(totais.emAnaliseCentavos, "BRL")}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Pedidos pendentes de deferimento
          </p>
        </div>
      </div>

      {/* Detalhamento por Contrato / Benefício */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Detalhamento por Contrato & Benefício
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {cotasContratos.map((cota) => (
            <div
              key={cota.contratoId}
              className="rounded-xl border border-slate-200/90 bg-white p-3.5 space-y-2.5 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                  <div className="rounded-md bg-slate-100 p-1">
                    {getIconeBeneficio(cota.tipoBeneficio)}
                  </div>
                  <span>{getNomeBeneficio(cota.tipoBeneficio)}</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  {cota.numeroContrato}
                </span>
              </div>

              <p className="text-[11px] text-slate-600 line-clamp-1" title={cota.empresaNome}>
                {cota.empresaNome}
              </p>

              <div className="space-y-1 pt-1 border-t border-slate-100 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Cota:</span>
                  <span className="font-semibold text-slate-900">{formatarMoeda(cota.cotaCentavos, "BRL")}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Gasto:</span>
                  <span className="font-medium text-amber-700">{formatarMoeda(cota.consumidoCentavos, "BRL")}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>Saldo Disponível:</span>
                  <span>{formatarMoeda(cota.saldoDisponivelCentavos, "BRL")}</span>
                </div>
              </div>

              {/* Barra de Progresso do Benefício */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>Utilização</span>
                  <span>{cota.percentualConsumido.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      cota.percentualConsumido >= 100
                        ? "bg-red-500"
                        : cota.percentualConsumido >= 80
                        ? "bg-amber-500"
                        : "bg-blue-600"
                    }`}
                    style={{ width: `${cota.percentualConsumido}%` }}
                  />
                </div>
              </div>
            </div>
          ))}

          {orcamentoDiarias && (
            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                  <div className="rounded-md bg-purple-50 p-1">
                    <Wallet className="h-4 w-4 text-purple-600" />
                  </div>
                  <span>Diárias em Dinheiro</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  Ano {orcamentoDiarias.ano}
                </span>
              </div>

              <p className="text-[11px] text-slate-600">
                Orçamento de Diárias da Unidade
              </p>

              <div className="space-y-1 pt-1 border-t border-slate-100 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Dotação:</span>
                  <span className="font-semibold text-slate-900">
                    {formatarMoeda(orcamentoDiarias.valorTotalCentavos, "BRL")}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Gasto:</span>
                  <span className="font-medium text-amber-700">
                    {formatarMoeda(orcamentoDiarias.consumidoCentavos, "BRL")}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>Saldo Disponível:</span>
                  <span>{formatarMoeda(orcamentoDiarias.saldoDisponivelCentavos, "BRL")}</span>
                </div>
              </div>

              {/* Barra de Progresso */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>Utilização</span>
                  <span>{orcamentoDiarias.percentualConsumido.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      orcamentoDiarias.percentualConsumido >= 100
                        ? "bg-red-500"
                        : orcamentoDiarias.percentualConsumido >= 80
                        ? "bg-amber-500"
                        : "bg-purple-600"
                    }`}
                    style={{ width: `${orcamentoDiarias.percentualConsumido}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
