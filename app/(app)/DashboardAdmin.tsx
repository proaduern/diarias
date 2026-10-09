"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Coins,
  Building2,
  PieChart,
  FileSignature,
  Hotel,
  Plane,
  Bus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  TrendingUp,
  Layers,
  Sparkles,
} from "lucide-react";
import { formatarMoeda } from "@/lib/formato";
import type { DashboardAdminDados, CotaUnidadeResumo } from "@/lib/services/dashboard-saldos";

interface DashboardAdminProps {
  dados: DashboardAdminDados;
}

export default function DashboardAdmin({ dados }: DashboardAdminProps) {
  const [abaAtiva, setAbaAtiva] = useState<"todos" | "saldos_gerais" | "cota_geral" | "cotas_unidades">("todos");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [apenasComCota, setApenasComCota] = useState(true);
  const [unidadeExpandidaId, setUnidadeExpandidaId] = useState<string | null>(null);

  const { saldosGerais, saldoCotaGeral, cotasPorUnidade } = dados;

  const listaUnidadesBase = apenasComCota
    ? cotasPorUnidade.unidadesComCota
    : cotasPorUnidade.todasUnidades;

  const unidadesFiltradas = listaUnidadesBase.filter((u) => {
    if (!filtroTexto.trim()) return true;
    const t = filtroTexto.toLowerCase();
    return u.unidadeNome.toLowerCase().includes(t) || u.unidadeEmail.toLowerCase().includes(t);
  });

  const getIconeBeneficio = (tipo: string) => {
    switch (tipo) {
      case "HOSPEDAGEM":
        return <Hotel className="h-4 w-4 text-amber-600" />;
      case "PASSAGEM_AEREA":
        return <Plane className="h-4 w-4 text-sky-600" />;
      case "PASSAGEM_TERRESTRE":
        return <Bus className="h-4 w-4 text-emerald-600" />;
      default:
        return <FileSignature className="h-4 w-4 text-slate-600" />;
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

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Painel Executivo */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
              <PieChart className="h-3.5 w-3.5" />
              Governança Orçamentária
            </span>
            <span className="text-xs text-slate-400">• PROAD UERN</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-1">
            Painel Geral de Saldos & Cotas
          </h2>
          <p className="text-xs text-slate-500">
            Acompanhamento de saldos gerais de contratos, saldo de cota global e alocação por unidade demandante
          </p>
        </div>

        {/* Abas de Navegação Rápida */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-medium text-slate-600">
          <button
            onClick={() => setAbaAtiva("todos")}
            className={`rounded-lg px-3 py-1.5 transition ${
              abaAtiva === "todos"
                ? "bg-white text-slate-900 shadow-sm font-semibold"
                : "hover:text-slate-900"
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setAbaAtiva("saldos_gerais")}
            className={`rounded-lg px-3 py-1.5 transition ${
              abaAtiva === "saldos_gerais"
                ? "bg-white text-slate-900 shadow-sm font-semibold"
                : "hover:text-slate-900"
            }`}
          >
            Saldos Gerais
          </button>
          <button
            onClick={() => setAbaAtiva("cota_geral")}
            className={`rounded-lg px-3 py-1.5 transition ${
              abaAtiva === "cota_geral"
                ? "bg-white text-slate-900 shadow-sm font-semibold"
                : "hover:text-slate-900"
            }`}
          >
            Saldo de Cota Geral
          </button>
          <button
            onClick={() => setAbaAtiva("cotas_unidades")}
            className={`rounded-lg px-3 py-1.5 transition ${
              abaAtiva === "cotas_unidades"
                ? "bg-white text-slate-900 shadow-sm font-semibold"
                : "hover:text-slate-900"
            }`}
          >
            Cota por Unidade
          </button>
        </div>
      </div>

      {/* 4 Cards de Indicadores Principais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Saldo Geral Disponível */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 via-white to-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Saldo Geral Disponível
            </span>
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-emerald-700">
              {formatarMoeda(saldosGerais.totalGeralDisponivelCentavos, "BRL")}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Restante para emissão de novos pedidos
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{
                  width: `${Math.max(
                    0,
                    100 - saldosGerais.percentualConsumidoGeral
                  )}%`,
                }}
              />
            </div>
            <span className="text-[10px] font-semibold text-emerald-700">
              {(100 - saldosGerais.percentualConsumidoGeral).toFixed(1)}% livre
            </span>
          </div>
        </div>

        {/* Card 2: Total Contratado / Previsto */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Total Previsto / Contratado
            </span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <Coins className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-slate-900">
              {formatarMoeda(saldosGerais.totalGeralPrevistoCentavos, "BRL")}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Contratos ativos ({formatarMoeda(saldosGerais.totalContratosCentavos, "BRL")}) + Diárias
            </p>
          </div>
        </div>

        {/* Card 3: Total Consumido */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Total Utilizado / Deferido
            </span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-slate-900">
              {formatarMoeda(saldosGerais.totalGeralConsumidoCentavos, "BRL")}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {saldosGerais.percentualConsumidoGeral.toFixed(1)}% do orçamento total
            </p>
          </div>
          {saldosGerais.totalGeralEmAnaliseCentavos > 0 && (
            <p className="text-[10px] text-amber-600 font-medium mt-1">
              + {formatarMoeda(saldosGerais.totalGeralEmAnaliseCentavos, "BRL")} em tramitação
            </p>
          )}
        </div>

        {/* Card 4: Cotas Alocadas vs Livre Concorrência */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Saldo de Cota Alocada
            </span>
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-indigo-950">
              {formatarMoeda(saldoCotaGeral.totalSaldoDisponivelCotasCentavos, "BRL")}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Disponível nas cotas atribuídas a unidades
            </p>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Reserva livre global: <span className="font-semibold text-slate-700">{formatarMoeda(saldoCotaGeral.saldoNaoAlocadoGeralCentavos, "BRL")}</span>
          </p>
        </div>
      </div>

      {/* SEÇÃO 1: SALDOS GERAIS DE CONTRATOS E DIÁRIAS */}
      {(abaAtiva === "todos" || abaAtiva === "saldos_gerais") && (
        <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-blue-600" />
                Saldos Gerais por Contrato & Diárias
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhamento individual dos contratos de serviços vigentes e dotação anual de diárias
              </p>
            </div>
            <Link
              href="/admin/contratos"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Gerenciar contratos <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {saldosGerais.contratos.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-white p-1.5 shadow-2xs">
                      {getIconeBeneficio(c.tipoBeneficio)}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {getNomeBeneficio(c.tipoBeneficio)}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1" title={c.empresaNome}>
                        {c.empresaNome}
                      </h4>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                    {c.numeroContrato}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Valor Global:</span>
                    <span className="font-semibold text-slate-900">{formatarMoeda(c.valorTotalCentavos, "BRL")}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Consumido / Deferido:</span>
                    <span className="font-medium text-amber-700">{formatarMoeda(c.consumidoCentavos, "BRL")}</span>
                  </div>
                  {c.emAnaliseCentavos > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Em Tramitação:</span>
                      <span className="text-amber-600">{formatarMoeda(c.emAnaliseCentavos, "BRL")}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-900 pt-1 border-t border-slate-200/80 font-bold">
                    <span>Saldo Restante:</span>
                    <span className="text-emerald-700">{formatarMoeda(c.saldoDisponivelCentavos, "BRL")}</span>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                    <span>Utilização</span>
                    <span>{c.percentualConsumido.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        c.percentualConsumido >= 90
                          ? "bg-red-500"
                          : c.percentualConsumido >= 70
                          ? "bg-amber-500"
                          : "bg-blue-600"
                      }`}
                      style={{ width: `${c.percentualConsumido}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Card Consolidado de Diárias */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-white p-1.5 shadow-2xs">
                    <Wallet className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Diárias em Dinheiro
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">
                      Orçamento Geral de Diárias
                    </h4>
                  </div>
                </div>
                <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                  Ano {new Date().getFullYear()}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Dotação Alocada:</span>
                  <span className="font-semibold text-slate-900">
                    {formatarMoeda(saldosGerais.totalOrcamentoDiariasCentavos, "BRL")}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Diárias Concedidas:</span>
                  <span className="font-medium text-amber-700">
                    {formatarMoeda(
                      Math.max(
                        0,
                        saldosGerais.totalGeralConsumidoCentavos -
                          dados.saldosGerais.contratos.reduce((acc, c) => acc + c.consumidoCentavos, 0)
                      ),
                      "BRL"
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-slate-900 pt-1 border-t border-slate-200/80 font-bold">
                  <span>Saldo de Diárias:</span>
                  <span className="text-emerald-700">
                    {formatarMoeda(
                      Math.max(
                        0,
                        saldosGerais.totalOrcamentoDiariasCentavos -
                          (saldosGerais.totalGeralConsumidoCentavos -
                            dados.saldosGerais.contratos.reduce((acc, c) => acc + c.consumidoCentavos, 0))
                      ),
                      "BRL"
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SEÇÃO 2: SALDO DE COTA GERAL */}
      {(abaAtiva === "todos" || abaAtiva === "cota_geral") && (
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              Saldo de Cota Geral: Alocação vs Livre Disputa
            </h3>
            <p className="text-xs text-slate-500">
              Distribuição do saldo global entre unidades com cota específica delimitada e o saldo livre para disputa
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-2">
              <span className="text-xs font-semibold text-indigo-900">Total Alocado em Cotas</span>
              <p className="text-xl font-bold text-indigo-950">
                {formatarMoeda(saldoCotaGeral.totalCotasAlocadasCentavos, "BRL")}
              </p>
              <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-indigo-200/60">
                <div className="flex justify-between">
                  <span>Utilizado pelas unidades:</span>
                  <span className="font-medium text-slate-800">
                    {formatarMoeda(saldoCotaGeral.totalConsumoCotasAlocadasCentavos, "BRL")}
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-indigo-900">
                  <span>Saldo livre nas cotas:</span>
                  <span>{formatarMoeda(saldoCotaGeral.totalSaldoDisponivelCotasCentavos, "BRL")}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
              <span className="text-xs font-semibold text-slate-800">Reserva Geral / Livre Disputa</span>
              <p className="text-xl font-bold text-slate-900">
                {formatarMoeda(saldoCotaGeral.saldoNaoAlocadoGeralCentavos, "BRL")}
              </p>
              <p className="text-[11px] text-slate-500">
                Saldo de contratos não amarrado a cotas específicas. Disponível para livre consumo de unidades sem teto próprio.
              </p>
              <div className="text-[11px] text-slate-600 flex justify-between pt-1 border-t border-slate-200">
                <span>Consumido sem cota:</span>
                <span className="font-medium">{formatarMoeda(saldoCotaGeral.totalConsumoSemCotaCentavos, "BRL")}</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-800">Taxa de Comprometimento de Cotas</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-slate-900">
                    {saldoCotaGeral.percentualCotasUtilizado.toFixed(1)}%
                  </span>
                  <span className="text-xs text-slate-500">consumido</span>
                </div>
              </div>
              <div className="space-y-1.5 mt-3">
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${saldoCotaGeral.percentualCotasUtilizado}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  {saldoCotaGeral.totalCotasAlocadasCentavos > 0
                    ? `${formatarMoeda(saldoCotaGeral.totalSaldoDisponivelCotasCentavos, "BRL")} ainda disponível nas cotas`
                    : "Nenhuma cota específica alocada ainda"}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SEÇÃO 3: SALDO DE COTA POR UNIDADE (TABELA DETALHADA) */}
      {(abaAtiva === "todos" || abaAtiva === "cotas_unidades") && (
        <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Saldo de Cota por Unidade Demandante
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhamento individual da cota atribuída, consumo e saldo disponível de cada setor
              </p>
            </div>

            {/* Controles de Filtro e Busca */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar unidade..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <button
                onClick={() => setApenasComCota(!apenasComCota)}
                className={`rounded-xl px-2.5 py-1.5 text-xs font-medium border transition flex items-center gap-1.5 ${
                  apenasComCota
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Filter className="h-3 w-3" />
                {apenasComCota ? "Apenas com cota atribuída" : "Todas as unidades"}
              </button>
            </div>
          </div>

          {/* Tabela de Unidades */}
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">Unidade Demandante</th>
                  <th className="px-3 py-2.5">Cota Atribuída</th>
                  <th className="px-3 py-2.5">Utilizado</th>
                  <th className="px-3 py-2.5">Em Análise</th>
                  <th className="px-3 py-2.5">Saldo Disponível</th>
                  <th className="px-4 py-2.5 w-36">% Consumido</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {unidadesFiltradas.map((u) => {
                  const expandida = unidadeExpandidaId === u.unidadeId;
                  const temCota = u.temCotaAtribuida;

                  return (
                    <>
                      <tr
                        key={u.unidadeId}
                        className={`hover:bg-slate-50/70 transition cursor-pointer ${
                          expandida ? "bg-blue-50/20" : ""
                        }`}
                        onClick={() => setUnidadeExpandidaId(expandida ? null : u.unidadeId)}
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <div>{u.unidadeNome}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{u.unidadeEmail}</div>
                        </td>

                        <td className="px-3 py-3 font-semibold text-slate-900 whitespace-nowrap">
                          {temCota
                            ? formatarMoeda(u.totalCotaAtribuidaCentavos, "BRL")
                            : <span className="text-slate-400 font-normal">Sem cota própria</span>}
                        </td>

                        <td className="px-3 py-3 whitespace-nowrap text-amber-700 font-medium">
                          {formatarMoeda(u.totalConsumidoCentavos, "BRL")}
                        </td>

                        <td className="px-3 py-3 whitespace-nowrap text-slate-500">
                          {u.totalEmAnaliseCentavos > 0
                            ? formatarMoeda(u.totalEmAnaliseCentavos, "BRL")
                            : "-"}
                        </td>

                        <td className="px-3 py-3 whitespace-nowrap font-bold text-emerald-700">
                          {temCota
                            ? formatarMoeda(u.totalSaldoDisponivelCentavos, "BRL")
                            : <span className="text-slate-500 font-normal text-[11px]">Disputa Saldo Geral</span>}
                        </td>

                        <td className="px-4 py-3">
                          {temCota ? (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-medium text-slate-500">
                                <span>{u.percentualConsumido.toFixed(1)}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    u.percentualConsumido >= 100
                                      ? "bg-red-500"
                                      : u.percentualConsumido >= 80
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${Math.min(100, u.percentualConsumido)}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          {u.status === "DENTRO_DA_COTA" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-700/10">
                              <CheckCircle2 className="h-3 w-3" />
                              Regular
                            </span>
                          )}
                          {u.status === "ALERTA_COTA" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-700/10">
                              <AlertTriangle className="h-3 w-3" />
                              Alerta (&gt;80%)
                            </span>
                          )}
                          {u.status === "COTA_ESGOTADA" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 ring-1 ring-inset ring-red-700/10">
                              <AlertTriangle className="h-3 w-3" />
                              Esgotada
                            </span>
                          )}
                          {u.status === "SEM_COTA_PROPRIA" && (
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                              Saldo Geral
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setUnidadeExpandidaId(expandida ? null : u.unidadeId);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded"
                          >
                            {expandida ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Linha Expandida com o detalhamento de cada cota da unidade */}
                      {expandida && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={8} className="px-6 py-3.5 space-y-3">
                            <div className="text-xs font-semibold text-slate-800">
                              Detalhamento de Cotas da Unidade ({u.unidadeNome}):
                            </div>

                            {u.cotasContratos.length === 0 && !u.orcamentoDiarias ? (
                              <p className="text-xs text-slate-500 italic">
                                Esta unidade não possui cotas individuais atribuídas em nenhum contrato ou orçamento específico.
                                Suas solicitações concorrem livremente pelo saldo global disponível da UERN.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {u.cotasContratos.map((cota) => (
                                  <div
                                    key={cota.contratoId}
                                    className="bg-white rounded-lg p-3 border border-slate-200/80 shadow-2xs space-y-2 text-xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                                        {getIconeBeneficio(cota.tipoBeneficio)}
                                        {getNomeBeneficio(cota.tipoBeneficio)}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        {cota.numeroContrato}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-600 line-clamp-1" title={cota.empresaNome}>
                                      {cota.empresaNome}
                                    </div>
                                    <div className="space-y-1 pt-1 border-t border-slate-100 text-[11px]">
                                      <div className="flex justify-between">
                                        <span>Cota:</span>
                                        <span className="font-semibold">{formatarMoeda(cota.cotaCentavos, "BRL")}</span>
                                      </div>
                                      <div className="flex justify-between text-amber-700">
                                        <span>Gasto:</span>
                                        <span>{formatarMoeda(cota.consumidoCentavos, "BRL")}</span>
                                      </div>
                                      <div className="flex justify-between font-bold text-emerald-700">
                                        <span>Saldo Disponível:</span>
                                        <span>{formatarMoeda(cota.saldoDisponivelCentavos, "BRL")}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                {u.orcamentoDiarias && (
                                  <div className="bg-white rounded-lg p-3 border border-slate-200/80 shadow-2xs space-y-2 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                                        <Wallet className="h-3.5 w-3.5 text-purple-600" />
                                        Diárias em Dinheiro
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        Ano {u.orcamentoDiarias.ano}
                                      </span>
                                    </div>
                                    <div className="space-y-1 pt-1 border-t border-slate-100 text-[11px]">
                                      <div className="flex justify-between">
                                        <span>Dotação:</span>
                                        <span className="font-semibold">
                                          {formatarMoeda(u.orcamentoDiarias.valorTotalCentavos, "BRL")}
                                        </span>
                                      </div>
                                      <div className="flex justify-between text-amber-700">
                                        <span>Gasto:</span>
                                        <span>{formatarMoeda(u.orcamentoDiarias.consumidoCentavos, "BRL")}</span>
                                      </div>
                                      <div className="flex justify-between font-bold text-emerald-700">
                                        <span>Saldo Disponível:</span>
                                        <span>{formatarMoeda(u.orcamentoDiarias.saldoDisponivelCentavos, "BRL")}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}

                {unidadesFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      Nenhuma unidade encontrada para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
