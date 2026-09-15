/**
 * Motor de cálculo de tempo de deslocamento — Fase 2 da expansão
 * multi-benefício (sede/destino/aeroporto).
 *
 * Trecho terrestre: 60 minutos a cada 70 km, proporcional (~70 km/h médios).
 *
 * Trecho aéreo:
 * - < 500 km: bloqueado (o deslocamento deve ser feito por via terrestre).
 * - 500 km a 700 km (inclusive): tempo fixo de 90 minutos.
 * - > 700 km: 60 minutos a cada 700 km, proporcional.
 *
 * Quando o beneficiário é buscado no aeroporto (`vaiBuscarAeroporto`), a
 * viagem tem 3 trechos somados: terrestre sede->aeroporto, aéreo
 * aeroporto->aeroporto, terrestre aeroporto->destino.
 */

const MINUTOS_POR_KM_TERRESTRE = 60 / 70;

const KM_VOO_MINIMO = 500;
const KM_VOO_FAIXA_FIXA_ATE = 700;
const MINUTOS_VOO_FIXO = 90;
const KM_BASE_VOO_PROPORCIONAL = 700;
const MINUTOS_BASE_VOO_PROPORCIONAL = 60;

export function tempoTerrestreMinutos(km: number): number {
  return km * MINUTOS_POR_KM_TERRESTRE;
}

export type SituacaoVoo =
  | { situacao: "BLOQUEADO_DISTANCIA_MINIMA" }
  | { situacao: "OK"; minutos: number };

export function avaliarTempoVoo(kmVoo: number): SituacaoVoo {
  if (kmVoo < KM_VOO_MINIMO) {
    return { situacao: "BLOQUEADO_DISTANCIA_MINIMA" };
  }
  if (kmVoo <= KM_VOO_FAIXA_FIXA_ATE) {
    return { situacao: "OK", minutos: MINUTOS_VOO_FIXO };
  }
  return {
    situacao: "OK",
    minutos: (kmVoo / KM_BASE_VOO_PROPORCIONAL) * MINUTOS_BASE_VOO_PROPORCIONAL,
  };
}

export interface TrechoAeroporto {
  kmSedeAeroporto: number;
  kmVoo: number;
  kmAeroportoDestino: number;
}

export type SituacaoViagemAeroporto =
  | { situacao: "BLOQUEADO_VOO_DISTANCIA_MINIMA" }
  | {
      situacao: "OK";
      minutosTotais: number;
      minutosSedeAeroporto: number;
      minutosVoo: number;
      minutosAeroportoDestino: number;
    };

export function calcularTempoViagemAeroporto(
  trecho: TrechoAeroporto,
): SituacaoViagemAeroporto {
  const situacaoVoo = avaliarTempoVoo(trecho.kmVoo);
  if (situacaoVoo.situacao === "BLOQUEADO_DISTANCIA_MINIMA") {
    return { situacao: "BLOQUEADO_VOO_DISTANCIA_MINIMA" };
  }

  const minutosSedeAeroporto = tempoTerrestreMinutos(trecho.kmSedeAeroporto);
  const minutosAeroportoDestino = tempoTerrestreMinutos(trecho.kmAeroportoDestino);

  return {
    situacao: "OK",
    minutosTotais: minutosSedeAeroporto + situacaoVoo.minutos + minutosAeroportoDestino,
    minutosSedeAeroporto,
    minutosVoo: situacaoVoo.minutos,
    minutosAeroportoDestino,
  };
}
