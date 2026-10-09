import Link from "next/link";
import { obterSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardAdmin from "./DashboardAdmin";
import DashboardUnidade from "./DashboardUnidade";
import {
  obterDadosDashboardAdmin,
  obterDadosDashboardUnidade,
} from "@/lib/services/dashboard-saldos";
import { FileText, Clock, AlertCircle, ShieldAlert, ArrowRight, PlusCircle } from "lucide-react";

export default async function DashboardPage() {
  const sessao = await obterSessao();
  if (!sessao) return null;

  const isAdmin = sessao.perfil === "ADMIN";

  const filtroUnidade = isAdmin
    ? {}
    : { unidadeSolicitanteId: sessao.unidadeId ?? "__nenhuma__" };

  async function contarTodosOsTipos(status?: string) {
    const where = { viagem: filtroUnidade, ...(status ? { status: status as never } : {}) };
    const [diarias, hospedagens, passagens] = await Promise.all([
      prisma.pedidoDiaria.count({ where }),
      prisma.pedidoHospedagem.count({ where }),
      prisma.pedidoPassagemAerea.count({ where }),
    ]);
    return diarias + hospedagens + passagens;
  }

  // Carrega dados de status de pedidos em paralelo com os dados do dashboard
  const [
    total,
    aguardandoDeferimento,
    aguardandoJustificativa,
    aguardandoDeliberacao,
    dadosAdmin,
    dadosUnidade,
  ] = await Promise.all([
    contarTodosOsTipos(),
    contarTodosOsTipos("AGUARDANDO_DEFERIMENTO"),
    contarTodosOsTipos("AGUARDANDO_JUSTIFICATIVA_PRAZO"),
    contarTodosOsTipos("AGUARDANDO_DELIBERACAO_LIMITE"),
    isAdmin ? obterDadosDashboardAdmin() : Promise.resolve(null),
    !isAdmin ? obterDadosDashboardUnidade(sessao.unidadeId) : Promise.resolve(null),
  ]);

  const cardsPedidos = [
    {
      label: "Total de solicitações",
      valor: total,
      icone: FileText,
      cor: "text-blue-600 bg-blue-50",
    },
    {
      label: "Aguardando deferimento",
      valor: aguardandoDeferimento,
      icone: Clock,
      cor: "text-amber-600 bg-amber-50",
    },
    {
      label: "Aguardando justificativa",
      valor: aguardandoJustificativa,
      icone: AlertCircle,
      cor: "text-purple-600 bg-purple-50",
    },
    {
      label: "Deliberação de limite",
      valor: aguardandoDeliberacao,
      icone: ShieldAlert,
      cor: "text-rose-600 bg-rose-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. SE FOR ADMIN: RENDERIZA O DASHBOARD COMPLETO DE SALDOS GERAIS E COTAS */}
      {isAdmin && dadosAdmin && <DashboardAdmin dados={dadosAdmin} />}

      {/* 2. SE FOR DEMANDANTE: RENDERIZA O DASHBOARD DA UNIDADE SOMENTE SE HOUVER COTA ATRIBUÍDA */}
      {!isAdmin && dadosUnidade && dadosUnidade.temCotaAtribuida && (
        <DashboardUnidade dados={dadosUnidade} />
      )}

      {/* Cabeçalho de Solicitações (quando não for admin e não tiver cota, ou para acompanhar fila) */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              {isAdmin ? "Status das Solicitações em Tramitação" : "Minhas Solicitações de Viagem"}
            </h3>
            <p className="text-xs text-slate-500">
              {isAdmin
                ? "Visão geral de todos os pedidos da UERN por estágio de tramitação"
                : "Acompanhe o andamento dos pedidos de diárias, passagens e hospedagem da sua unidade"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/pedidos"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Ver todas as solicitações <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/pedidos/novo"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#003366] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#002244] transition"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Nova solicitação
            </Link>
          </div>
        </div>

        {/* Grid de Cards de Contagem de Pedidos */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-1">
          {cardsPedidos.map((c) => {
            const Icone = c.icone;
            return (
              <div
                key={c.label}
                className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 flex items-center justify-between"
              >
                <div>
                  <p className="text-2xl font-bold text-slate-900 tracking-tight">{c.valor}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
                </div>
                <div className={`rounded-xl p-2.5 ${c.cor}`}>
                  <Icone className="h-5 w-5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
