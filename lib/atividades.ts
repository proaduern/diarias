/**
 * Validação de horário crítica entre a janela de viagem e as atividades
 * (programação) vinculadas ao pedido — Fase 1 da expansão multi-benefício.
 *
 * - Trava total (sem exceção): chegada ao destino depois do início da
 *   atividade mais cedo, ou saída do destino antes do fim da atividade mais
 *   tarde. A viagem chegaria atrasada para o serviço ou sairia antes dele
 *   terminar — nunca é permitido, não existe fluxo de contorno para esse
 *   caso.
 * - Exceção de folga: a janela de viagem é mais larga que o estritamente
 *   necessário para as atividades (chegada adiantada e/ou saída atrasada em
 *   relação a elas). Isso é permitido, mas exige ciência do demandante (a
 *   diária/hospedagem só cobre o período estrito da atividade, sem
 *   pagamento pelos dias de folga) e justificativa do gestor da unidade
 *   (declarando que não há prejuízo ao serviço e que os dias de ausência não
 *   vinculados à atividade serão compensados conforme legislação/normas).
 */

export interface JanelaAtividade {
  dataHoraInicio: Date;
  dataHoraFim: Date;
}

export interface JanelaViagem {
  chegadaDestino: Date;
  saidaDestino: Date;
}

export type SituacaoHorarioAtividade =
  | { situacao: "BLOQUEADO_CHEGADA_APOS_INICIO"; inicioMinimo: Date }
  | { situacao: "BLOQUEADO_SAIDA_ANTES_FIM"; fimMaximo: Date }
  | { situacao: "REQUER_JUSTIFICATIVA_FOLGA"; inicioMinimo: Date; fimMaximo: Date }
  | { situacao: "OK"; inicioMinimo: Date; fimMaximo: Date };

export function limitesDasAtividades(atividades: JanelaAtividade[]): {
  inicioMinimo: Date;
  fimMaximo: Date;
} {
  if (atividades.length === 0) {
    throw new Error("É necessário informar ao menos uma atividade.");
  }

  const inicioMinimo = atividades.reduce(
    (min, a) => (a.dataHoraInicio < min ? a.dataHoraInicio : min),
    atividades[0].dataHoraInicio,
  );
  const fimMaximo = atividades.reduce(
    (max, a) => (a.dataHoraFim > max ? a.dataHoraFim : max),
    atividades[0].dataHoraFim,
  );

  return { inicioMinimo, fimMaximo };
}

export function avaliarHorarioAtividade(
  janelaViagem: JanelaViagem,
  atividades: JanelaAtividade[],
): SituacaoHorarioAtividade {
  const { inicioMinimo, fimMaximo } = limitesDasAtividades(atividades);

  if (janelaViagem.chegadaDestino.getTime() > inicioMinimo.getTime()) {
    return { situacao: "BLOQUEADO_CHEGADA_APOS_INICIO", inicioMinimo };
  }
  if (janelaViagem.saidaDestino.getTime() < fimMaximo.getTime()) {
    return { situacao: "BLOQUEADO_SAIDA_ANTES_FIM", fimMaximo };
  }

  const temFolga =
    janelaViagem.chegadaDestino.getTime() < inicioMinimo.getTime() ||
    janelaViagem.saidaDestino.getTime() > fimMaximo.getTime();

  return temFolga
    ? { situacao: "REQUER_JUSTIFICATIVA_FOLGA", inicioMinimo, fimMaximo }
    : { situacao: "OK", inicioMinimo, fimMaximo };
}
