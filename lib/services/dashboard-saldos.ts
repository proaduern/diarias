import { prisma } from "@/lib/prisma";

export interface ItemCotaContratoUnidade {
  contratoId: string;
  numeroContrato: string;
  empresaNome: string;
  tipoBeneficio: "HOSPEDAGEM" | "PASSAGEM_AEREA" | "PASSAGEM_TERRESTRE";
  cotaCentavos: number;
  consumidoCentavos: number;
  emAnaliseCentavos: number;
  saldoDisponivelCentavos: number;
  percentualConsumido: number;
}

export interface CotaUnidadeResumo {
  unidadeId: string;
  unidadeNome: string;
  unidadeEmail: string;
  temCotaAtribuida: boolean;
  totalCotaAtribuidaCentavos: number;
  totalConsumidoCentavos: number;
  totalEmAnaliseCentavos: number;
  totalSaldoDisponivelCentavos: number;
  percentualConsumido: number;
  status: "DENTRO_DA_COTA" | "ALERTA_COTA" | "COTA_ESGOTADA" | "SEM_COTA_PROPRIA";
  cotasContratos: ItemCotaContratoUnidade[];
  orcamentoDiarias: {
    ano: number;
    valorTotalCentavos: number;
    consumidoCentavos: number;
    emAnaliseCentavos: number;
    saldoDisponivelCentavos: number;
    percentualConsumido: number;
  } | null;
}

export interface DashboardAdminDados {
  saldosGerais: {
    totalContratosCentavos: number;
    totalOrcamentoDiariasCentavos: number;
    totalGeralPrevistoCentavos: number;
    totalGeralConsumidoCentavos: number;
    totalGeralEmAnaliseCentavos: number;
    totalGeralDisponivelCentavos: number;
    percentualConsumidoGeral: number;
    contratos: Array<{
      id: string;
      numeroContrato: string;
      empresaNome: string;
      tipoBeneficio: string;
      valorTotalCentavos: number;
      consumidoCentavos: number;
      emAnaliseCentavos: number;
      saldoDisponivelCentavos: number;
      percentualConsumido: number;
    }>;
  };
  saldoCotaGeral: {
    totalCotasAlocadasCentavos: number;
    totalConsumoCotasAlocadasCentavos: number;
    totalSaldoDisponivelCotasCentavos: number;
    percentualCotasUtilizado: number;
    saldoNaoAlocadoGeralCentavos: number; // Livre disputa global
    totalConsumoSemCotaCentavos: number;
  };
  cotasPorUnidade: {
    unidadesComCota: CotaUnidadeResumo[];
    todasUnidades: CotaUnidadeResumo[];
  };
}

export interface DashboardUnidadeDados {
  temCotaAtribuida: boolean;
  unidade?: {
    id: string;
    nome: string;
    email: string;
  };
  totais?: {
    cotaTotalCentavos: number;
    consumidoCentavos: number;
    emAnaliseCentavos: number;
    saldoDisponivelCentavos: number;
    percentualConsumido: number;
  };
  cotasContratos?: ItemCotaContratoUnidade[];
  orcamentoDiarias?: {
    ano: number;
    valorTotalCentavos: number;
    consumidoCentavos: number;
    emAnaliseCentavos: number;
    saldoDisponivelCentavos: number;
    percentualConsumido: number;
  } | null;
}

export async function obterDadosDashboardAdmin(): Promise<DashboardAdminDados> {
  const anoAtual = new Date().getFullYear();

  const [contratos, unidades, cotasContratos, orcamentos, pedidosH, pedidosP, pedidosD] =
    await Promise.all([
      prisma.contrato.findMany({
        where: { ativo: true },
        include: {
          cotasPorUnidade: { include: { unidade: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.unidade.findMany({ orderBy: { nome: "asc" } }),
      prisma.cotaContratoUnidade.findMany({
        include: { contrato: true, unidade: true },
      }),
      prisma.orcamentoUnidade.findMany({
        where: { ano: anoAtual },
        include: { unidade: true },
      }),
      prisma.pedidoHospedagem.findMany({
        where: {
          status: { not: "INDEFERIDO" },
        },
        include: {
          viagem: { select: { unidadeSolicitanteId: true } },
        },
      }),
      prisma.pedidoPassagemAerea.findMany({
        where: {
          status: { not: "INDEFERIDO" },
        },
        include: {
          viagem: { select: { unidadeSolicitanteId: true } },
        },
      }),
      prisma.pedidoDiaria.findMany({
        where: {
          status: { not: "INDEFERIDO" },
        },
        include: {
          viagem: { select: { unidadeSolicitanteId: true, saidaSede: true } },
        },
      }),
    ]);

  // Mapa de gastos por contrato: idContrato -> { consumido, emAnalise }
  const gastosPorContrato = new Map<string, { consumido: number; emAnalise: number }>();
  // Mapa de gastos por contrato e por unidade: `${contratoId}_${unidadeId}` -> { consumido, emAnalise }
  const gastosContratoUnidade = new Map<string, { consumido: number; emAnalise: number }>();

  function registrarGastoContrato(
    contratoId: string,
    unidadeId: string,
    valorCentavos: number,
    status: string
  ) {
    const isDeferido = status === "DEFERIDO";
    const gastoC = gastosPorContrato.get(contratoId) ?? { consumido: 0, emAnalise: 0 };
    if (isDeferido) {
      gastoC.consumido += valorCentavos;
    } else {
      gastoC.emAnalise += valorCentavos;
    }
    gastosPorContrato.set(contratoId, gastoC);

    const chaveCU = `${contratoId}_${unidadeId}`;
    const gastoCU = gastosContratoUnidade.get(chaveCU) ?? { consumido: 0, emAnalise: 0 };
    if (isDeferido) {
      gastoCU.consumido += valorCentavos;
    } else {
      gastoCU.emAnalise += valorCentavos;
    }
    gastosContratoUnidade.set(chaveCU, gastoCU);
  }

  for (const h of pedidosH) {
    if (h.valorTotalCentavos && h.valorTotalCentavos > 0) {
      registrarGastoContrato(
        h.contratoId,
        h.viagem.unidadeSolicitanteId,
        h.valorTotalCentavos,
        h.status
      );
    }
  }

  for (const p of pedidosP) {
    if (p.valorTotalCentavos && p.valorTotalCentavos > 0) {
      registrarGastoContrato(
        p.contratoId,
        p.viagem.unidadeSolicitanteId,
        p.valorTotalCentavos,
        p.status
      );
    }
  }

  // Mapa de gastos de diárias por unidade: unidadeId -> { consumido, emAnalise }
  const gastosDiariasUnidade = new Map<string, { consumido: number; emAnalise: number }>();
  let totalDiariasConsumidoCentavos = 0;
  let totalDiariasEmAnaliseCentavos = 0;

  for (const d of pedidosD) {
    const anoPedido = d.viagem.saidaSede
      ? new Date(d.viagem.saidaSede).getFullYear()
      : anoAtual;
    if (anoPedido === anoAtual && d.valorTotalCentavos && d.valorTotalCentavos > 0) {
      const uId = d.viagem.unidadeSolicitanteId;
      const gastoD = gastosDiariasUnidade.get(uId) ?? { consumido: 0, emAnalise: 0 };
      if (d.status === "DEFERIDO") {
        gastoD.consumido += d.valorTotalCentavos;
        totalDiariasConsumidoCentavos += d.valorTotalCentavos;
      } else {
        gastoD.emAnalise += d.valorTotalCentavos;
        totalDiariasEmAnaliseCentavos += d.valorTotalCentavos;
      }
      gastosDiariasUnidade.set(uId, gastoD);
    }
  }

  // 1. Saldos Gerais
  let totalContratosCentavos = 0;
  let totalContratosConsumidoCentavos = 0;
  let totalContratosEmAnaliseCentavos = 0;

  const contratosDetalhados = contratos.map((c) => {
    totalContratosCentavos += c.valorTotalCentavos;
    const g = gastosPorContrato.get(c.id) ?? { consumido: 0, emAnalise: 0 };
    totalContratosConsumidoCentavos += g.consumido;
    totalContratosEmAnaliseCentavos += g.emAnalise;
    const saldoDisponivel = Math.max(0, c.valorTotalCentavos - g.consumido);
    const percentual = c.valorTotalCentavos > 0 ? (g.consumido / c.valorTotalCentavos) * 100 : 0;

    return {
      id: c.id,
      numeroContrato: c.numeroContrato,
      empresaNome: c.empresaNome,
      tipoBeneficio: c.tipoBeneficio,
      valorTotalCentavos: c.valorTotalCentavos,
      consumidoCentavos: g.consumido,
      emAnaliseCentavos: g.emAnalise,
      saldoDisponivelCentavos: saldoDisponivel,
      percentualConsumido: Math.min(100, Math.round(percentual * 10) / 10),
    };
  });

  const totalOrcamentoDiariasCentavos = orcamentos.reduce(
    (acc, o) => acc + o.valorTotalCentavos,
    0
  );

  const totalGeralPrevistoCentavos = totalContratosCentavos + totalOrcamentoDiariasCentavos;
  const totalGeralConsumidoCentavos =
    totalContratosConsumidoCentavos + totalDiariasConsumidoCentavos;
  const totalGeralEmAnaliseCentavos =
    totalContratosEmAnaliseCentavos + totalDiariasEmAnaliseCentavos;
  const totalGeralDisponivelCentavos = Math.max(
    0,
    totalGeralPrevistoCentavos - totalGeralConsumidoCentavos
  );
  const percentualConsumidoGeral =
    totalGeralPrevistoCentavos > 0
      ? Math.min(100, Math.round((totalGeralConsumidoCentavos / totalGeralPrevistoCentavos) * 1000) / 10)
      : 0;

  // 2. Saldo de Cota Geral
  let totalCotasAlocadasCentavos = 0;
  let totalConsumoCotasAlocadasCentavos = 0;
  let totalConsumoSemCotaCentavos = 0;

  // Cotas de contrato
  for (const cota of cotasContratos) {
    if (cota.cotaCentavos > 0 && cota.contrato.ativo) {
      totalCotasAlocadasCentavos += cota.cotaCentavos;
      const gastoCU = gastosContratoUnidade.get(`${cota.contratoId}_${cota.unidadeId}`) ?? {
        consumido: 0,
        emAnalise: 0,
      };
      totalConsumoCotasAlocadasCentavos += gastoCU.consumido;
    }
  }

  // Orçamentos de diárias como cotas de unidade
  for (const o of orcamentos) {
    if (o.valorTotalCentavos > 0) {
      totalCotasAlocadasCentavos += o.valorTotalCentavos;
      const gastoD = gastosDiariasUnidade.get(o.unidadeId) ?? { consumido: 0, emAnalise: 0 };
      totalConsumoCotasAlocadasCentavos += gastoD.consumido;
    }
  }

  // Consumo por unidades sem cota própria
  totalConsumoSemCotaCentavos = Math.max(
    0,
    totalGeralConsumidoCentavos - totalConsumoCotasAlocadasCentavos
  );

  const totalSaldoDisponivelCotasCentavos = Math.max(
    0,
    totalCotasAlocadasCentavos - totalConsumoCotasAlocadasCentavos
  );
  const percentualCotasUtilizado =
    totalCotasAlocadasCentavos > 0
      ? Math.min(
          100,
          Math.round((totalConsumoCotasAlocadasCentavos / totalCotasAlocadasCentavos) * 1000) / 10
        )
      : 0;

  const saldoNaoAlocadoGeralCentavos = Math.max(
    0,
    totalGeralPrevistoCentavos - totalCotasAlocadasCentavos
  );

  // 3. Saldo de Cota por Unidade
  const todasUnidadesResumo: CotaUnidadeResumo[] = unidades.map((u) => {
    const cotasDaUnidade = cotasContratos.filter(
      (c) => c.unidadeId === u.id && c.cotaCentavos > 0 && c.contrato.ativo
    );
    const orcamentoDaUnidade = orcamentos.find((o) => o.unidadeId === u.id) ?? null;

    const temCotaAtribuida =
      cotasDaUnidade.length > 0 || (orcamentoDaUnidade !== null && orcamentoDaUnidade.valorTotalCentavos > 0);

    const itensContratos: ItemCotaContratoUnidade[] = cotasDaUnidade.map((c) => {
      const g = gastosContratoUnidade.get(`${c.contratoId}_${u.id}`) ?? {
        consumido: 0,
        emAnalise: 0,
      };
      const saldoDisp = Math.max(0, c.cotaCentavos - g.consumido);
      const perc = c.cotaCentavos > 0 ? (g.consumido / c.cotaCentavos) * 100 : 0;
      return {
        contratoId: c.contratoId,
        numeroContrato: c.contrato.numeroContrato,
        empresaNome: c.contrato.empresaNome,
        tipoBeneficio: c.contrato.tipoBeneficio,
        cotaCentavos: c.cotaCentavos,
        consumidoCentavos: g.consumido,
        emAnaliseCentavos: g.emAnalise,
        saldoDisponivelCentavos: saldoDisp,
        percentualConsumido: Math.min(100, Math.round(perc * 10) / 10),
      };
    });

    let orcamentoDiariasResumo: CotaUnidadeResumo["orcamentoDiarias"] = null;
    if (orcamentoDaUnidade && orcamentoDaUnidade.valorTotalCentavos > 0) {
      const gD = gastosDiariasUnidade.get(u.id) ?? { consumido: 0, emAnalise: 0 };
      const saldoD = Math.max(0, orcamentoDaUnidade.valorTotalCentavos - gD.consumido);
      const percD = (gD.consumido / orcamentoDaUnidade.valorTotalCentavos) * 100;
      orcamentoDiariasResumo = {
        ano: orcamentoDaUnidade.ano,
        valorTotalCentavos: orcamentoDaUnidade.valorTotalCentavos,
        consumidoCentavos: gD.consumido,
        emAnaliseCentavos: gD.emAnalise,
        saldoDisponivelCentavos: saldoD,
        percentualConsumido: Math.min(100, Math.round(percD * 10) / 10),
      };
    }

    const totalCota =
      itensContratos.reduce((acc, c) => acc + c.cotaCentavos, 0) +
      (orcamentoDiariasResumo ? orcamentoDiariasResumo.valorTotalCentavos : 0);

    const totalConsumido =
      itensContratos.reduce((acc, c) => acc + c.consumidoCentavos, 0) +
      (orcamentoDiariasResumo ? orcamentoDiariasResumo.consumidoCentavos : 0);

    const totalEmAnalise =
      itensContratos.reduce((acc, c) => acc + c.emAnaliseCentavos, 0) +
      (orcamentoDiariasResumo ? orcamentoDiariasResumo.emAnaliseCentavos : 0);

    const totalSaldoDisp = Math.max(0, totalCota - totalConsumido);
    const percTotal = totalCota > 0 ? (totalConsumido / totalCota) * 100 : 0;

    let status: CotaUnidadeResumo["status"] = "SEM_COTA_PROPRIA";
    if (temCotaAtribuida) {
      if (percTotal >= 100) {
        status = "COTA_ESGOTADA";
      } else if (percTotal >= 80) {
        status = "ALERTA_COTA";
      } else {
        status = "DENTRO_DA_COTA";
      }
    }

    return {
      unidadeId: u.id,
      unidadeNome: u.nome,
      unidadeEmail: u.email,
      temCotaAtribuida,
      totalCotaAtribuidaCentavos: totalCota,
      totalConsumidoCentavos: totalConsumido,
      totalEmAnaliseCentavos: totalEmAnalise,
      totalSaldoDisponivelCentavos: totalSaldoDisp,
      percentualConsumido: Math.min(100, Math.round(percTotal * 10) / 10),
      status,
      cotasContratos: itensContratos,
      orcamentoDiarias: orcamentoDiariasResumo,
    };
  });

  const unidadesComCota = todasUnidadesResumo.filter((u) => u.temCotaAtribuida);

  return {
    saldosGerais: {
      totalContratosCentavos,
      totalOrcamentoDiariasCentavos,
      totalGeralPrevistoCentavos,
      totalGeralConsumidoCentavos,
      totalGeralEmAnaliseCentavos,
      totalGeralDisponivelCentavos,
      percentualConsumidoGeral,
      contratos: contratosDetalhados,
    },
    saldoCotaGeral: {
      totalCotasAlocadasCentavos,
      totalConsumoCotasAlocadasCentavos,
      totalSaldoDisponivelCotasCentavos,
      percentualCotasUtilizado,
      saldoNaoAlocadoGeralCentavos,
      totalConsumoSemCotaCentavos,
    },
    cotasPorUnidade: {
      unidadesComCota,
      todasUnidades: todasUnidadesResumo,
    },
  };
}

export async function obterDadosDashboardUnidade(
  unidadeId: string | null
): Promise<DashboardUnidadeDados> {
  if (!unidadeId) {
    return { temCotaAtribuida: false };
  }

  const anoAtual = new Date().getFullYear();

  const [unidade, cotasContratos, orcamento, pedidosH, pedidosP, pedidosD] =
    await Promise.all([
      prisma.unidade.findUnique({ where: { id: unidadeId } }),
      prisma.cotaContratoUnidade.findMany({
        where: {
          unidadeId,
          cotaCentavos: { gt: 0 },
          contrato: { ativo: true },
        },
        include: { contrato: true },
      }),
      prisma.orcamentoUnidade.findFirst({
        where: {
          unidadeId,
          ano: anoAtual,
          valorTotalCentavos: { gt: 0 },
        },
      }),
      prisma.pedidoHospedagem.findMany({
        where: {
          status: { not: "INDEFERIDO" },
          viagem: { unidadeSolicitanteId: unidadeId },
        },
      }),
      prisma.pedidoPassagemAerea.findMany({
        where: {
          status: { not: "INDEFERIDO" },
          viagem: { unidadeSolicitanteId: unidadeId },
        },
      }),
      prisma.pedidoDiaria.findMany({
        where: {
          status: { not: "INDEFERIDO" },
          viagem: { unidadeSolicitanteId: unidadeId },
        },
      }),
    ]);

  if (!unidade) {
    return { temCotaAtribuida: false };
  }

  const temCotaAtribuida =
    cotasContratos.length > 0 || (orcamento !== null && orcamento.valorTotalCentavos > 0);

  // SE NÃO HOUVER COTA ESPECÍFICA ATRIBUÍDA:
  // Regra do usuário: "Esse dashboard só aparece pra unidade referente a sua cota e somente se for atribuído cota a ela.
  // Se ela estiver somente submetida aos saldos gerais e não tiver cota específica atribuida, não precisa aparecer dashboard pra unidade demandante."
  if (!temCotaAtribuida) {
    return { temCotaAtribuida: false };
  }

  // Mapear gastos da unidade por contrato
  const gastosPorContrato = new Map<string, { consumido: number; emAnalise: number }>();
  for (const h of pedidosH) {
    if (h.valorTotalCentavos) {
      const g = gastosPorContrato.get(h.contratoId) ?? { consumido: 0, emAnalise: 0 };
      if (h.status === "DEFERIDO") {
        g.consumido += h.valorTotalCentavos;
      } else {
        g.emAnalise += h.valorTotalCentavos;
      }
      gastosPorContrato.set(h.contratoId, g);
    }
  }

  for (const p of pedidosP) {
    if (p.valorTotalCentavos) {
      const g = gastosPorContrato.get(p.contratoId) ?? { consumido: 0, emAnalise: 0 };
      if (p.status === "DEFERIDO") {
        g.consumido += p.valorTotalCentavos;
      } else {
        g.emAnalise += p.valorTotalCentavos;
      }
      gastosPorContrato.set(p.contratoId, g);
    }
  }

  // Mapear gastos de diárias da unidade
  let diariasConsumidoCentavos = 0;
  let diariasEmAnaliseCentavos = 0;
  for (const d of pedidosD) {
    if (d.valorTotalCentavos) {
      if (d.status === "DEFERIDO") {
        diariasConsumidoCentavos += d.valorTotalCentavos;
      } else {
        diariasEmAnaliseCentavos += d.valorTotalCentavos;
      }
    }
  }

  const itensContratos: ItemCotaContratoUnidade[] = cotasContratos.map((c) => {
    const g = gastosPorContrato.get(c.contratoId) ?? { consumido: 0, emAnalise: 0 };
    const saldoDisp = Math.max(0, c.cotaCentavos - g.consumido);
    const perc = c.cotaCentavos > 0 ? (g.consumido / c.cotaCentavos) * 100 : 0;
    return {
      contratoId: c.contratoId,
      numeroContrato: c.contrato.numeroContrato,
      empresaNome: c.contrato.empresaNome,
      tipoBeneficio: c.contrato.tipoBeneficio,
      cotaCentavos: c.cotaCentavos,
      consumidoCentavos: g.consumido,
      emAnaliseCentavos: g.emAnalise,
      saldoDisponivelCentavos: saldoDisp,
      percentualConsumido: Math.min(100, Math.round(perc * 10) / 10),
    };
  });

  let orcamentoDiariasResumo: DashboardUnidadeDados["orcamentoDiarias"] = null;
  if (orcamento && orcamento.valorTotalCentavos > 0) {
    const saldoDisp = Math.max(0, orcamento.valorTotalCentavos - diariasConsumidoCentavos);
    const perc = (diariasConsumidoCentavos / orcamento.valorTotalCentavos) * 100;
    orcamentoDiariasResumo = {
      ano: orcamento.ano,
      valorTotalCentavos: orcamento.valorTotalCentavos,
      consumidoCentavos: diariasConsumidoCentavos,
      emAnaliseCentavos: diariasEmAnaliseCentavos,
      saldoDisponivelCentavos: saldoDisp,
      percentualConsumido: Math.min(100, Math.round(perc * 10) / 10),
    };
  }

  const cotaTotal =
    itensContratos.reduce((acc, c) => acc + c.cotaCentavos, 0) +
    (orcamentoDiariasResumo ? orcamentoDiariasResumo.valorTotalCentavos : 0);

  const totalConsumido =
    itensContratos.reduce((acc, c) => acc + c.consumidoCentavos, 0) +
    (orcamentoDiariasResumo ? orcamentoDiariasResumo.consumidoCentavos : 0);

  const totalEmAnalise =
    itensContratos.reduce((acc, c) => acc + c.emAnaliseCentavos, 0) +
    (orcamentoDiariasResumo ? orcamentoDiariasResumo.emAnaliseCentavos : 0);

  const totalDisponivel = Math.max(0, cotaTotal - totalConsumido);
  const percConsumidoTotal = cotaTotal > 0 ? (totalConsumido / cotaTotal) * 100 : 0;

  return {
    temCotaAtribuida: true,
    unidade: {
      id: unidade.id,
      nome: unidade.nome,
      email: unidade.email,
    },
    totais: {
      cotaTotalCentavos: cotaTotal,
      consumidoCentavos: totalConsumido,
      emAnaliseCentavos: totalEmAnalise,
      saldoDisponivelCentavos: totalDisponivel,
      percentualConsumido: Math.min(100, Math.round(percConsumidoTotal * 10) / 10),
    },
    cotasContratos: itensContratos,
    orcamentoDiarias: orcamentoDiariasResumo,
  };
}
