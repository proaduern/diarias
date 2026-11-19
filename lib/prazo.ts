/**
 * Regras de prazo para lançamento de pedido de diária, passagens e hospedagens
 * conforme Visão Geral SDHP/PROAD/UERN e Decreto Estadual nº 29.444/2020.
 *
 * Prazos Mínimos Oficiais (Visão Geral SDHP - pág. 1):
 * - Diárias Nacionais: 5 dias úteis antes da viagem
 * - Diárias Internacionais: 15 dias úteis antes da viagem
 * - Passagens Aéreas Nacionais: 10 dias úteis antes da viagem
 * - Passagens Aéreas Internacionais: 20 dias úteis antes da viagem
 * - Hospedagens: 10 dias úteis antes da hospedagem
 * - Prestação de Contas: 5 dias úteis após a viagem
 */

export type SituacaoPrazo =
  | { situacao: "BLOQUEADO_RETROATIVO" }
  | { situacao: "REQUER_JUSTIFICATIVA"; diasDeAntecedencia: number; prazoExigido?: number; regraAplicada?: string }
  | { situacao: "OK"; diasDeAntecedencia: number; prazoExigido?: number; regraAplicada?: string };

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

/**
 * Conta a quantidade de dias úteis (segunda a sexta-feira) entre duas datas.
 */
export function contarDiasUteisEntre(inicio: Date, fim: Date): number {
  if (fim.getTime() <= inicio.getTime()) return 0;

  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const alvo = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());

  let diasUteis = 0;
  while (cursor.getTime() < alvo.getTime()) {
    cursor.setDate(cursor.getDate() + 1);
    const diaSemana = cursor.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasUteis++;
    }
  }
  return diasUteis;
}

export function obterPrazoMinimoDiasUteisSdhp(opcoes: {
  querDiaria?: boolean;
  querPassagemAerea?: boolean;
  querHospedagem?: boolean;
  ehInternacional?: boolean;
  prazoBaseConfig?: number;
}): { diasUteisMinimos: number; descricaoNorma: string } {
  const {
    querDiaria = true,
    querPassagemAerea = false,
    querHospedagem = false,
    ehInternacional = false,
    prazoBaseConfig = 5,
  } = opcoes;

  let maiorPrazo = prazoBaseConfig;
  let regra = `Diárias Nacionais (${prazoBaseConfig} dias úteis)`;

  if (querDiaria && ehInternacional && 15 >= maiorPrazo) {
    maiorPrazo = 15;
    regra = "Diárias Internacionais (15 dias úteis — Visão Geral SDHP)";
  }
  if (querHospedagem && 10 > maiorPrazo) {
    maiorPrazo = 10;
    regra = "Hospedagem (10 dias úteis — POP 06 / Visão Geral SDHP)";
  }
  if (querPassagemAerea && !ehInternacional && 10 > maiorPrazo) {
    maiorPrazo = 10;
    regra = "Passagens Aéreas Nacionais (10 dias úteis — POP 05 / Visão Geral SDHP)";
  }
  if (querPassagemAerea && ehInternacional && 20 >= maiorPrazo) {
    maiorPrazo = 20;
    regra = "Passagens Aéreas Internacionais (20 dias úteis — POP 05 / Visão Geral SDHP)";
  }

  return { diasUteisMinimos: maiorPrazo, descricaoNorma: regra };
}

export function avaliarPrazoDiasUteisSdhp(
  agora: Date,
  saidaSede: Date,
  opcoes: {
    querDiaria?: boolean;
    querPassagemAerea?: boolean;
    querHospedagem?: boolean;
    ehInternacional?: boolean;
    prazoBaseConfig?: number;
  },
): SituacaoPrazo {
  if (agora.getTime() >= saidaSede.getTime()) {
    return { situacao: "BLOQUEADO_RETROATIVO" };
  }

  const { diasUteisMinimos, descricaoNorma } = obterPrazoMinimoDiasUteisSdhp(opcoes);
  const diasUteis = contarDiasUteisEntre(agora, saidaSede);

  if (diasUteis < diasUteisMinimos) {
    return {
      situacao: "REQUER_JUSTIFICATIVA",
      diasDeAntecedencia: diasUteis,
      prazoExigido: diasUteisMinimos,
      regraAplicada: descricaoNorma,
    };
  }

  return {
    situacao: "OK",
    diasDeAntecedencia: diasUteis,
    prazoExigido: diasUteisMinimos,
    regraAplicada: descricaoNorma,
  };
}

/**
 * Art. 6º, VIII e Art. 17, § 1º do Decreto Estadual nº 29.444/2020 + Orientações Gerais SDHP (pág. 3 e 5):
 * "Viagens iniciando em sextas-feiras, incluindo sábados, domingos ou feriados:
 * Obrigatoriamente, justificar quando as viagens começarem em sextas-feiras, bem como as que incluam
 * sábados, domingos e feriados."
 */
export function avaliarViagemFimDeSemanaFeriado(
  saidaSede: Date,
  chegadaSede: Date,
): { exigeJustificativa: boolean; motivo: string | null } {
  const motivos: string[] = [];

  if (saidaSede.getDay() === 5) {
    motivos.push("início da viagem em sexta-feira");
  }

  const cursor = new Date(saidaSede.getFullYear(), saidaSede.getMonth(), saidaSede.getDate());
  const fim = new Date(chegadaSede.getFullYear(), chegadaSede.getMonth(), chegadaSede.getDate());

  let temSabado = false;
  let temDomingo = false;

  while (cursor.getTime() <= fim.getTime()) {
    const d = cursor.getDay();
    if (d === 6) temSabado = true;
    if (d === 0) temDomingo = true;
    cursor.setDate(cursor.getDate() + 1);
  }

  if (temSabado) motivos.push("abrange sábado");
  if (temDomingo) motivos.push("abrange domingo");

  if (motivos.length === 0) {
    return { exigeJustificativa: false, motivo: null };
  }

  return {
    exigeJustificativa: true,
    motivo: `Viagem com ${motivos.join(" e ")} (Art. 6º, VIII e Art. 17, § 1º do Decreto Estadual nº 29.444/2020)`,
  };
}
