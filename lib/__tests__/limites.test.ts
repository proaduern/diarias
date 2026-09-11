import { describe, expect, it } from "vitest";
import { avaliarLimites } from "../limites";

describe("avaliarLimites", () => {
  it("total mensal dentro do limite -> OK", () => {
    const r = avaliarLimites(
      { diarias: 2, saidaSede: new Date("2026-03-15") },
      [{ diarias: 5, saidaSede: new Date("2026-03-01") }],
      10,
      60,
    );
    expect(r.situacao).toBe("DENTRO_DO_LIMITE");
    expect(r.totalMensal).toBe(7);
  });

  it("total mensal ultrapassa 10 -> exige diligência do Art. 15", () => {
    const r = avaliarLimites(
      { diarias: 3, saidaSede: new Date("2026-03-15") },
      [{ diarias: 9, saidaSede: new Date("2026-03-01") }],
      10,
      60,
    );
    expect(r.situacao).toBe("EXCEDE_LIMITE_MENSAL");
    expect(r.totalMensal).toBe(12);
  });

  it("pedidos de outros meses não contam para o limite mensal", () => {
    const r = avaliarLimites(
      { diarias: 3, saidaSede: new Date("2026-03-01") },
      [{ diarias: 9, saidaSede: new Date("2026-02-28") }],
      10,
      60,
    );
    expect(r.situacao).toBe("DENTRO_DO_LIMITE");
    expect(r.totalMensal).toBe(3);
  });

  it("soma exatamente igual ao limite mensal não excede (limiar: só acima de 10 exige diligência)", () => {
    const r = avaliarLimites(
      { diarias: 1, saidaSede: new Date("2026-03-15") },
      [{ diarias: 9, saidaSede: new Date("2026-03-01") }],
      10,
      60,
    );
    expect(r.situacao).toBe("DENTRO_DO_LIMITE");
    expect(r.totalMensal).toBe(10);
  });

  it("total anual ultrapassa 60 dias -> exige autorização do Comitê (Art. 16)", () => {
    const r = avaliarLimites(
      { diarias: 3, saidaSede: new Date("2026-11-15") },
      [{ diarias: 58, saidaSede: new Date("2026-01-10") }],
      10,
      60,
    );
    expect(r.situacao).toBe("EXCEDE_LIMITE_ANUAL");
    expect(r.totalAnual).toBe(61);
  });

  it("categoria com limite anual de 90 dias (ex.: motorista) não excede com o mesmo total", () => {
    const r = avaliarLimites(
      { diarias: 3, saidaSede: new Date("2026-11-15") },
      [{ diarias: 58, saidaSede: new Date("2026-01-10") }],
      10,
      90,
    );
    expect(r.situacao).toBe("DENTRO_DO_LIMITE");
  });

  it("excedendo ambos os limites ao mesmo tempo, o limite anual prevalece na resposta", () => {
    const r = avaliarLimites(
      { diarias: 5, saidaSede: new Date("2026-11-15") },
      [
        { diarias: 9, saidaSede: new Date("2026-11-01") },
        { diarias: 58, saidaSede: new Date("2026-01-10") },
      ],
      10,
      60,
    );
    expect(r.situacao).toBe("EXCEDE_LIMITE_ANUAL");
  });

  it("pedidos de anos diferentes não contam para o limite anual", () => {
    const r = avaliarLimites(
      { diarias: 3, saidaSede: new Date("2026-01-05") },
      [{ diarias: 58, saidaSede: new Date("2025-12-20") }],
      10,
      60,
    );
    expect(r.situacao).toBe("DENTRO_DO_LIMITE");
    expect(r.totalAnual).toBe(3);
  });
});
