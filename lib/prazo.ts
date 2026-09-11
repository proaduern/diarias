/**
 * Regras de prazo para lançamento de pedido de diária.
 *
 * - Trava total (sem exceção): o momento do lançamento é igual ou posterior à
 *   saída da sede (a viagem já começou ou já terminou). Nenhum fluxo de
 *   contorno existe para esse caso — o pedido não pode ser criado.
 * - Trava de justificativa: o lançamento ocorre antes da saída da sede, mas
 *   dentro do prazo mínimo de antecedência configurado pelo adm. Não bloqueia
 *   a criação, mas exige justificativa em texto livre, aprovada com um clique
 *   pelo adm, antes do pedido seguir no fluxo normal.
 */

export type SituacaoPrazo =
  | { situacao: "BLOQUEADO_RETROATIVO" }
  | { situacao: "REQUER_JUSTIFICATIVA"; diasDeAntecedencia: number }
  | { situacao: "OK"; diasDeAntecedencia: number };

const MS_POR_DIA = 1000 * 60 * 60 * 24;

export function avaliarPrazo(
  agora: Date,
  saidaSede: Date,
  prazoMinimoDiasAntecedencia: number,
): SituacaoPrazo {
  if (agora.getTime() >= saidaSede.getTime()) {
    return { situacao: "BLOQUEADO_RETROATIVO" };
  }

  const diasDeAntecedencia =
    (saidaSede.getTime() - agora.getTime()) / MS_POR_DIA;

  if (diasDeAntecedencia < prazoMinimoDiasAntecedencia) {
    return { situacao: "REQUER_JUSTIFICATIVA", diasDeAntecedencia };
  }

  return { situacao: "OK", diasDeAntecedencia };
}
