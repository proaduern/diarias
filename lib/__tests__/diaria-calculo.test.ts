import { describe, expect, it } from "vitest";
import { calcularDiarias, PARAMETROS_PADRAO } from "../diaria-calculo";

function dt(iso: string): Date {
  return new Date(iso);
}

describe("calcularDiarias — exemplos fechados na especificação", () => {
  it("viagem no mesmo dia, sem pernoite (Mossoró -> Natal e volta no mesmo dia) = 0,5", () => {
    const r = calcularDiarias(
      {
        saidaSede: dt("2026-03-11T08:00:00"),
        chegadaDestino: dt("2026-03-11T11:00:00"),
        saidaDestino: dt("2026-03-11T18:00:00"),
        chegadaSede: dt("2026-03-11T21:00:00"),
        kmDeclarado: 280,
      },
      PARAMETROS_PADRAO,
    );
    expect(r.diarias).toBe(0.5);
    expect(r.noites).toBe(0);
  });

  it("sai dia 11 às 8h, retorna dia 12 às 5h (antes das 6h) -> não configura pernoite -> 0,5", () => {
    const r = calcularDiarias(
      {
        saidaSede: dt("2026-03-11T08:00:00"),
        chegadaDestino: dt("2026-03-11T11:00:00"),
        saidaDestino: dt("2026-03-12T05:00:00"),
        chegadaSede: dt("2026-03-12T08:00:00"),
        kmDeclarado: 280,
      },
      PARAMETROS_PADRAO,
    );
    expect(r.diarias).toBe(0.5);
    expect(r.noites).toBe(1);
    expect(r.ultimaNoiteQualifica).toBe(false);
  });

  it("sai dia 11 às 8h, retorna dia 12 às 7h (depois das 6h) -> pernoite -> 1,5", () => {
    const r = calcularDiarias(
      {
        saidaSede: dt("2026-03-11T08:00:00"),
        chegadaDestino: dt("2026-03-11T11:00:00"),
        saidaDestino: dt("2026-03-12T07:00:00"),
        chegadaSede: dt("2026-03-12T10:00:00"),
        kmDeclarado: 280,
      },
      PARAMETROS_PADRAO,
    );
    expect(r.diarias).toBe(1.5);
    expect(r.noites).toBe(1);
    expect(r.ultimaNoiteQualifica).toBe(true);
  });

  it("exatamente às 6h00 conta como pernoite (fronteira inclusiva)", () => {
    const r = calcularDiarias(
      {
        saidaSede: dt("2026-03-11T08:00:00"),
        chegadaDestino: dt("2026-03-11T11:00:00"),
        saidaDestino: dt("2026-03-12T06:00:00"),
        chegadaSede: dt("2026-03-12T09:00:00"),
        kmDeclarado: 280,
      },
      PARAMETROS_PADRAO,
    );
    expect(r.ultimaNoiteQualifica).toBe(true);
    expect(r.diarias).toBe(1.5);
  });

  it("06:00 menos um minuto NÃO conta como pernoite", () => {
    const r = calcularDiarias(
      {
        saidaSede: dt("2026-03-11T08:00:00"),
        chegadaDestino: dt("2026-03-11T11:00:00"),
        saidaDestino: dt("2026-03-12T05:59:00"),
        chegadaSede: dt("2026-03-12T09:00:00"),
        kmDeclarado: 280,
      },
      PARAMETROS_PADRAO,
    );
    expect(r.ultimaNoiteQualifica).toBe(false);
    expect(r.diarias).toBe(0.5);
  });

  it("sai dia 11, volta dia 13 às 8h (2 pernoites) -> 2,5", () => {
    const r = calcularDiarias(
      {
        saidaSede: dt("2026-03-11T08:00:00"),
        chegadaDestino: dt("2026-03-11T11:00:00"),
        saidaDestino: dt("2026-03-13T08:00:00"),
        chegadaSede: dt("2026-03-13T11:00:00"),
        kmDeclarado: 280,
      },
      PARAMETROS_PADRAO,
    );
    expect(r.diarias).toBe(2.5);
    expect(r.noites).toBe(2);
  });

  it("sai dia 11, volta dia 14 às 5h (última noite não qualifica) -> 2,5", () => {
    const r = calcularDiarias(
      {
        saidaSede: dt("2026-03-11T08:00:00"),
        chegadaDestino: dt("2026-03-11T11:00:00"),
        saidaDestino: dt("2026-03-14T05:00:00"),
        chegadaSede: dt("2026-03-14T08:00:00"),
        kmDeclarado: 280,
      },
      PARAMETROS_PADRAO,
    );
    expect(r.diarias).toBe(2.5);
    expect(r.noites).toBe(3);
    expect(r.ultimaNoiteQualifica).toBe(false);
  });

  it("viagem de 5 noites, última qualifica -> 5,5", () => {
    const r = calcularDiarias(
      {
        saidaSede: dt("2026-03-01T08:00:00"),
        chegadaDestino: dt("2026-03-01T11:00:00"),
        saidaDestino: dt("2026-03-06T07:00:00"),
        chegadaSede: dt("2026-03-06T10:00:00"),
        kmDeclarado: 280,
      },
      PARAMETROS_PADRAO,
    );
    expect(r.noites).toBe(5);
    expect(r.diarias).toBe(5.5);
  });

  it("noites intermediárias são sempre pernoite por construção — só a última é condicional", () => {
    const r = calcularDiarias(
      {
        saidaSede: dt("2026-03-01T08:00:00"),
        chegadaDestino: dt("2026-03-01T11:00:00"),
        saidaDestino: dt("2026-03-04T08:00:00"),
        chegadaSede: dt("2026-03-04T11:00:00"),
        kmDeclarado: 280,
      },
      PARAMETROS_PADRAO,
    );
    expect(r.noites).toBe(3);
    expect(r.diarias).toBe(3.5);
  });

  it("deslocamento < 40km sem pernoite -> zero diária (Art. 17, I)", () => {
    const r = calcularDiarias(
      {
        saidaSede: dt("2026-03-11T08:00:00"),
        chegadaDestino: dt("2026-03-11T09:00:00"),
        saidaDestino: dt("2026-03-11T17:00:00"),
        chegadaSede: dt("2026-03-11T18:00:00"),
        kmDeclarado: 25,
      },
      PARAMETROS_PADRAO,
    );
    expect(r.diarias).toBe(0);
    expect(r.motivoZero).toBe("DISTANCIA_MINIMA");
  });

  it("deslocamento exatamente 40km sem pernoite -> conta (limiar inclusivo) -> 0,5", () => {
    const r = calcularDiarias(
      {
        saidaSede: dt("2026-03-11T08:00:00"),
        chegadaDestino: dt("2026-03-11T09:00:00"),
        saidaDestino: dt("2026-03-11T17:00:00"),
        chegadaSede: dt("2026-03-11T18:00:00"),
        kmDeclarado: 40,
      },
      PARAMETROS_PADRAO,
    );
    expect(r.diarias).toBe(0.5);
  });

  it("distância curta MAS com pernoite -> distância não zera (regra dos 40km só vale sem pernoite)", () => {
    const r = calcularDiarias(
      {
        saidaSede: dt("2026-03-11T08:00:00"),
        chegadaDestino: dt("2026-03-11T09:00:00"),
        saidaDestino: dt("2026-03-12T07:00:00"),
        chegadaSede: dt("2026-03-12T10:00:00"),
        kmDeclarado: 25,
      },
      PARAMETROS_PADRAO,
    );
    expect(r.diarias).toBe(1.5);
  });

  it("duração total inferior a 6h -> zero diária (Art. 17, III), mesmo com distância grande", () => {
    const r = calcularDiarias(
      {
        saidaSede: dt("2026-03-11T08:00:00"),
        chegadaDestino: dt("2026-03-11T10:00:00"),
        saidaDestino: dt("2026-03-11T12:00:00"),
        chegadaSede: dt("2026-03-11T13:00:00"),
        kmDeclarado: 280,
      },
      PARAMETROS_PADRAO,
    );
    expect(r.diarias).toBe(0);
    expect(r.motivoZero).toBe("DURACAO_MINIMA");
  });

  it("duração exatamente igual a 6h -> não é zerada (limiar inclusivo do lado 'permitido')", () => {
    const r = calcularDiarias(
      {
        saidaSede: dt("2026-03-11T08:00:00"),
        chegadaDestino: dt("2026-03-11T10:00:00"),
        saidaDestino: dt("2026-03-11T13:00:00"),
        chegadaSede: dt("2026-03-11T14:00:00"),
        kmDeclarado: 280,
      },
      PARAMETROS_PADRAO,
    );
    expect(r.diarias).toBe(0.5);
  });
});
