/**
 * Controle de saldo de contrato (hospedagem/passagem aérea/terrestre).
 *
 * - O saldo global do contrato nunca pode ser ultrapassado pela soma dos
 *   pedidos vinculados a ele, de qualquer unidade.
 * - Se a unidade tem cota própria (`cotaCentavos > 0`), ela também não pode
 *   ultrapassar essa cota — cota = 0 significa que a unidade não tem teto
 *   próprio e disputa livremente o saldo global do contrato.
 *
 * Esta função é pura: quem chama já soma o quanto foi consumido (pedidos
 * não indeferidos, com valor cotado) e passa os totais prontos.
 */

export interface ParametrosSaldoContrato {
  novoValorCentavos: number;
  valorTotalContratoCentavos: number;
  consumidoContratoCentavos: number;
  cotaUnidadeCentavos: number; // 0 = sem cota própria, usa o saldo global
  consumidoUnidadeCentavos: number;
}

export type SituacaoSaldoContrato =
  | { situacao: "EXCEDE_COTA_UNIDADE"; cotaUnidadeDisponivel: number }
  | { situacao: "EXCEDE_SALDO_CONTRATO"; saldoContratoDisponivel: number }
  | { situacao: "DENTRO_DO_SALDO"; saldoContratoDisponivel: number; cotaUnidadeDisponivel: number | null };

export function avaliarSaldoContrato(params: ParametrosSaldoContrato): SituacaoSaldoContrato {
  const saldoContratoDisponivel = params.valorTotalContratoCentavos - params.consumidoContratoCentavos;
  const temCotaPropria = params.cotaUnidadeCentavos > 0;
  const cotaUnidadeDisponivel = temCotaPropria
    ? params.cotaUnidadeCentavos - params.consumidoUnidadeCentavos
    : null;

  if (temCotaPropria && params.novoValorCentavos > cotaUnidadeDisponivel!) {
    return { situacao: "EXCEDE_COTA_UNIDADE", cotaUnidadeDisponivel: cotaUnidadeDisponivel! };
  }

  if (params.novoValorCentavos > saldoContratoDisponivel) {
    return { situacao: "EXCEDE_SALDO_CONTRATO", saldoContratoDisponivel };
  }

  return { situacao: "DENTRO_DO_SALDO", saldoContratoDisponivel, cotaUnidadeDisponivel };
}
