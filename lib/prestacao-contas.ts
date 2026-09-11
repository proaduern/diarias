/**
 * Prestação de contas (Art. 33-39 do Decreto 29.444/2020).
 *
 * - Relatório de viagem deve ser enviado em até `prazoRelatorioDiasUteis`
 *   dias úteis após o retorno (chegada à sede). Padrão do decreto: 5 dias
 *   úteis — customizável pelo adm.
 * - Enquanto o relatório estiver pendente e fora do prazo, ou a devolução de
 *   valores estiver pendente, nenhum novo pedido pode ser lançado para o
 *   mesmo beneficiário (trava total, mesmo mecanismo da trava de prazo
 *   retroativo).
 * - Se o relatório não for enviado em até 30 dias corridos do retorno, a
 *   devolução dos valores recebidos passa a ser exigida.
 */

function ehFimDeSemana(data: Date): boolean {
  const dia = data.getDay();
  return dia === 0 || dia === 6;
}

export function somarDiasUteis(data: Date, quantidade: number): Date {
  const resultado = new Date(data);
  let restantes = quantidade;
  while (restantes > 0) {
    resultado.setDate(resultado.getDate() + 1);
    if (!ehFimDeSemana(resultado)) {
      restantes--;
    }
  }
  return resultado;
}

export interface PedidoParaPrestacaoContas {
  chegadaSede: Date;
  relatorioEnviadoEm: Date | null;
}

export type SituacaoPrestacaoContas =
  | { situacao: "EM_VIAGEM" }
  | { situacao: "AGUARDANDO_RELATORIO_NO_PRAZO"; prazoLimite: Date }
  | { situacao: "RELATORIO_ATRASADO"; prazoLimite: Date }
  | { situacao: "DEVOLUCAO_PENDENTE"; prazoLimite: Date }
  | { situacao: "CONCLUIDO" };

export function avaliarPrestacaoContas(
  pedido: PedidoParaPrestacaoContas,
  agora: Date,
  prazoRelatorioDiasUteis: number,
  prazoDevolucaoDiasCorridos: number,
): SituacaoPrestacaoContas {
  if (pedido.relatorioEnviadoEm) {
    return { situacao: "CONCLUIDO" };
  }

  if (agora.getTime() < pedido.chegadaSede.getTime()) {
    return { situacao: "EM_VIAGEM" };
  }

  const prazoRelatorio = somarDiasUteis(
    pedido.chegadaSede,
    prazoRelatorioDiasUteis,
  );

  const prazoDevolucaoMs =
    pedido.chegadaSede.getTime() +
    prazoDevolucaoDiasCorridos * 24 * 60 * 60 * 1000;

  if (agora.getTime() >= prazoDevolucaoMs) {
    return { situacao: "DEVOLUCAO_PENDENTE", prazoLimite: new Date(prazoDevolucaoMs) };
  }

  if (agora.getTime() > prazoRelatorio.getTime()) {
    return { situacao: "RELATORIO_ATRASADO", prazoLimite: prazoRelatorio };
  }

  return { situacao: "AGUARDANDO_RELATORIO_NO_PRAZO", prazoLimite: prazoRelatorio };
}

/** Bloqueia novo pedido se houver qualquer pendência (relatório atrasado ou devolução). */
export function temPendenciaBloqueante(
  situacao: SituacaoPrestacaoContas,
): boolean {
  return (
    situacao.situacao === "RELATORIO_ATRASADO" ||
    situacao.situacao === "DEVOLUCAO_PENDENTE"
  );
}
