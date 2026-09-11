import { describe, expect, it } from "vitest";
import { avaliarPrazo } from "../prazo";

describe("avaliarPrazo", () => {
  it("lançar depois que a viagem já começou -> bloqueado total", () => {
    const r = avaliarPrazo(
      new Date("2026-03-11T09:00:00"),
      new Date("2026-03-11T08:00:00"),
      5,
    );
    expect(r.situacao).toBe("BLOQUEADO_RETROATIVO");
  });

  it("lançar no exato instante da saída -> bloqueado total (limiar inclusivo do bloqueio)", () => {
    const r = avaliarPrazo(
      new Date("2026-03-11T08:00:00"),
      new Date("2026-03-11T08:00:00"),
      5,
    );
    expect(r.situacao).toBe("BLOQUEADO_RETROATIVO");
  });

  it("lançar em dia posterior à viagem -> bloqueado total", () => {
    const r = avaliarPrazo(
      new Date("2026-03-12T09:00:00"),
      new Date("2026-03-11T08:00:00"),
      5,
    );
    expect(r.situacao).toBe("BLOQUEADO_RETROATIVO");
  });

  it("lançar no mesmo dia, antes da saída -> não é bloqueio total, mas exige justificativa (antecedência < mínimo)", () => {
    const r = avaliarPrazo(
      new Date("2026-03-11T07:00:00"),
      new Date("2026-03-11T08:00:00"),
      5,
    );
    expect(r.situacao).toBe("REQUER_JUSTIFICATIVA");
  });

  it("lançar com antecedência menor que o mínimo configurado -> exige justificativa", () => {
    const r = avaliarPrazo(
      new Date("2026-03-09T08:00:00"),
      new Date("2026-03-11T08:00:00"),
      5,
    );
    expect(r.situacao).toBe("REQUER_JUSTIFICATIVA");
  });

  it("lançar com antecedência maior ou igual ao mínimo -> OK, sem justificativa", () => {
    const r = avaliarPrazo(
      new Date("2026-03-06T08:00:00"),
      new Date("2026-03-11T08:00:00"),
      5,
    );
    expect(r.situacao).toBe("OK");
  });

  it("prazo mínimo configurado para 0 dias -> só a trava total se aplica", () => {
    const r = avaliarPrazo(
      new Date("2026-03-11T07:59:00"),
      new Date("2026-03-11T08:00:00"),
      0,
    );
    expect(r.situacao).toBe("OK");
  });
});
