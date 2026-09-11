/**
 * Limites de concessão de diárias por beneficiário (Art. 15 e 16 do Decreto
 * 29.444/2020). Contagem sempre por CPF do beneficiário, agregando pedidos de
 * todas as unidades do sistema — não só da unidade que está solicitando.
 */

export interface PedidoExistente {
  diarias: number;
  saidaSede: Date;
}

export type SituacaoLimite =
  | { situacao: "DENTRO_DO_LIMITE"; totalMensal: number; totalAnual: number }
  | {
      situacao: "EXCEDE_LIMITE_MENSAL";
      totalMensal: number;
      totalAnual: number;
    }
  | {
      situacao: "EXCEDE_LIMITE_ANUAL";
      totalMensal: number;
      totalAnual: number;
    };

function mesmoMes(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function mesmoAno(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear();
}

export function avaliarLimites(
  novoPedido: { diarias: number; saidaSede: Date },
  pedidosExistentesDoBeneficiario: PedidoExistente[],
  limiteMensal: number,
  limiteAnualDias: number,
): SituacaoLimite {
  const totalMensalExistente = pedidosExistentesDoBeneficiario
    .filter((p) => mesmoMes(p.saidaSede, novoPedido.saidaSede))
    .reduce((soma, p) => soma + p.diarias, 0);

  const totalAnualExistente = pedidosExistentesDoBeneficiario
    .filter((p) => mesmoAno(p.saidaSede, novoPedido.saidaSede))
    .reduce((soma, p) => soma + p.diarias, 0);

  const totalMensal = totalMensalExistente + novoPedido.diarias;
  const totalAnual = totalAnualExistente + novoPedido.diarias;

  if (totalAnual > limiteAnualDias) {
    return { situacao: "EXCEDE_LIMITE_ANUAL", totalMensal, totalAnual };
  }

  if (totalMensal > limiteMensal) {
    return { situacao: "EXCEDE_LIMITE_MENSAL", totalMensal, totalAnual };
  }

  return { situacao: "DENTRO_DO_LIMITE", totalMensal, totalAnual };
}
