import { describe, expect, it } from "vitest";
import {
  avaliarTempoVoo,
  calcularTempoViagemAeroporto,
  tempoTerrestreMinutos,
} from "../tempo-viagem";

describe("tempoTerrestreMinutos", () => {
  it("70 km -> 60 minutos", () => {
    expect(tempoTerrestreMinutos(70)).toBeCloseTo(60);
  });

  it("35 km -> 30 minutos (proporcional)", () => {
    expect(tempoTerrestreMinutos(35)).toBeCloseTo(30);
  });

  it("140 km -> 120 minutos", () => {
    expect(tempoTerrestreMinutos(140)).toBeCloseTo(120);
  });

  it("0 km -> 0 minutos", () => {
    expect(tempoTerrestreMinutos(0)).toBe(0);
  });
});

describe("avaliarTempoVoo", () => {
  it("menos de 500 km -> bloqueado (deve usar deslocamento terrestre)", () => {
    expect(avaliarTempoVoo(499).situacao).toBe("BLOQUEADO_DISTANCIA_MINIMA");
  });

  it("exatamente 500 km -> tempo fixo de 90 minutos", () => {
    const r = avaliarTempoVoo(500);
    expect(r).toEqual({ situacao: "OK", minutos: 90 });
  });

  it("600 km (dentro da faixa 500-700) -> tempo fixo de 90 minutos", () => {
    const r = avaliarTempoVoo(600);
    expect(r).toEqual({ situacao: "OK", minutos: 90 });
  });

  it("exatamente 700 km -> ainda na faixa fixa, 90 minutos", () => {
    const r = avaliarTempoVoo(700);
    expect(r).toEqual({ situacao: "OK", minutos: 90 });
  });

  it("mais de 700 km -> 60 minutos a cada 700km, proporcional", () => {
    const r = avaliarTempoVoo(1400);
    expect(r).toEqual({ situacao: "OK", minutos: 120 });
  });

  it("1050 km -> proporcional (90 minutos)", () => {
    const r = avaliarTempoVoo(1050);
    if (r.situacao !== "OK") throw new Error("esperava OK");
    expect(r.minutos).toBeCloseTo(90);
  });
});

describe("calcularTempoViagemAeroporto", () => {
  it("soma os 3 trechos quando o voo é permitido", () => {
    const r = calcularTempoViagemAeroporto({
      kmSedeAeroporto: 70, // 60 min
      kmVoo: 600, // 90 min (faixa fixa)
      kmAeroportoDestino: 35, // 30 min
    });
    expect(r).toEqual({
      situacao: "OK",
      minutosTotais: 180,
      minutosSedeAeroporto: 60,
      minutosVoo: 90,
      minutosAeroportoDestino: 30,
    });
  });

  it("bloqueia a viagem inteira se o voo for menor que 500km", () => {
    const r = calcularTempoViagemAeroporto({
      kmSedeAeroporto: 70,
      kmVoo: 300,
      kmAeroportoDestino: 35,
    });
    expect(r.situacao).toBe("BLOQUEADO_VOO_DISTANCIA_MINIMA");
  });
});
