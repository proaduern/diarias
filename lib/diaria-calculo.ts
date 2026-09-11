/**
 * Motor de cálculo de diárias — Decreto Estadual nº 29.444/2020 (RN), com a
 * redação do Art. 12, II dada pelo Decreto nº 32.688/2023, e Portaria
 * nº 293/2020 - GP/FUERN.
 */

export interface DadosViagem {
  saidaSede: Date;
  chegadaDestino: Date;
  saidaDestino: Date;
  chegadaSede: Date;
  kmDeclarado: number;
}

export interface ParametrosCalculo {
  kmMinimoSemPernoite: number; // Art. 17, I / Art. 12, I — padrão 40
  duracaoMinimaHoras: number; // Art. 17, III — padrão 6
}

export interface ResultadoCalculo {
  duracaoHoras: number;
  noites: number;
  ultimaNoiteQualifica: boolean;
  diarias: number;
  motivoZero?: "DURACAO_MINIMA" | "DISTANCIA_MINIMA";
}

const MS_POR_HORA = 1000 * 60 * 60;
const HORA_LIMITE_PERNOITE = 6; // 06:00 — Art. 12, §1º: inclusive (>= 6h conta pernoite)

/**
 * Conta o número de noites (meia-noite virada) entre duas datas.
 * Ex.: sai dia 11 às 8h, retorna dia 13 às 8h -> 2 noites (11-12, 12-13).
 */
function contarNoites(saidaSede: Date, saidaDestino: Date): number {
  const inicioDiaSaida = new Date(
    saidaSede.getFullYear(),
    saidaSede.getMonth(),
    saidaSede.getDate(),
  );
  const inicioDiaRetorno = new Date(
    saidaDestino.getFullYear(),
    saidaDestino.getMonth(),
    saidaDestino.getDate(),
  );
  const diffDias = Math.round(
    (inicioDiaRetorno.getTime() - inicioDiaSaida.getTime()) / (MS_POR_HORA * 24),
  );
  return Math.max(0, diffDias);
}

function ultimaNoiteQualificaPernoite(saidaDestino: Date): boolean {
  const horaDecimal = saidaDestino.getHours() + saidaDestino.getMinutes() / 60;
  return horaDecimal >= HORA_LIMITE_PERNOITE;
}

/**
 * Calcula o número de diárias devidas para uma viagem, segundo a fórmula:
 *
 * N = noites entre saída da sede e saída do destino.
 * - N = 0                                  -> 0,5 diária (viagem no mesmo dia)
 * - N >= 1 e última noite qualifica         -> N + 0,5
 * - N >= 1 e última noite não qualifica     -> (N - 1) + 0,5
 *
 * Antes disso, duas exclusões (Art. 17) zeram a diária:
 * - duração total < duracaoMinimaHoras (padrão 6h) -> 0
 * - sem nenhum pernoite (N efetivo = 0) e distância < kmMinimoSemPernoite (padrão 40km) -> 0
 */
export function calcularDiarias(
  viagem: DadosViagem,
  parametros: ParametrosCalculo,
): ResultadoCalculo {
  const duracaoHoras =
    (viagem.chegadaSede.getTime() - viagem.saidaSede.getTime()) / MS_POR_HORA;

  if (duracaoHoras < parametros.duracaoMinimaHoras) {
    return {
      duracaoHoras,
      noites: 0,
      ultimaNoiteQualifica: false,
      diarias: 0,
      motivoZero: "DURACAO_MINIMA",
    };
  }

  const noitesTotais = contarNoites(viagem.saidaSede, viagem.saidaDestino);
  const ultimaQualifica =
    noitesTotais > 0 ? ultimaNoiteQualificaPernoite(viagem.saidaDestino) : false;

  const noitesValidas =
    noitesTotais > 0 && !ultimaQualifica ? noitesTotais - 1 : noitesTotais;

  if (noitesValidas === 0 && viagem.kmDeclarado < parametros.kmMinimoSemPernoite) {
    return {
      duracaoHoras,
      noites: noitesTotais,
      ultimaNoiteQualifica: ultimaQualifica,
      diarias: 0,
      motivoZero: "DISTANCIA_MINIMA",
    };
  }

  const diarias = noitesValidas === 0 ? 0.5 : noitesValidas + 0.5;

  return {
    duracaoHoras,
    noites: noitesTotais,
    ultimaNoiteQualifica: ultimaQualifica,
    diarias,
  };
}

export const PARAMETROS_PADRAO: ParametrosCalculo = {
  kmMinimoSemPernoite: 40,
  duracaoMinimaHoras: 6,
};
