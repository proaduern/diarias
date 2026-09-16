import { describe, expect, it } from "vitest";
import { diariasPorExtenso, numeroPorExtenso, valorPorExtenso } from "../numero-extenso";

describe("numeroPorExtenso", () => {
  it("zero", () => {
    expect(numeroPorExtenso(0)).toBe("zero");
  });

  it("unidades e dezenas irregulares (10-19)", () => {
    expect(numeroPorExtenso(1)).toBe("um");
    expect(numeroPorExtenso(10)).toBe("dez");
    expect(numeroPorExtenso(11)).toBe("onze");
    expect(numeroPorExtenso(15)).toBe("quinze");
    expect(numeroPorExtenso(19)).toBe("dezenove");
  });

  it("dezenas redondas e compostas", () => {
    expect(numeroPorExtenso(20)).toBe("vinte");
    expect(numeroPorExtenso(21)).toBe("vinte e um");
    expect(numeroPorExtenso(99)).toBe("noventa e nove");
  });

  it("cem exato vs. cento e X", () => {
    expect(numeroPorExtenso(100)).toBe("cem");
    expect(numeroPorExtenso(101)).toBe("cento e um");
    expect(numeroPorExtenso(150)).toBe("cento e cinquenta");
  });

  it("centenas redondas com concordância de gênero", () => {
    expect(numeroPorExtenso(200, "M")).toBe("duzentos");
    expect(numeroPorExtenso(200, "F")).toBe("duzentas");
    expect(numeroPorExtenso(900, "F")).toBe("novecentas");
  });

  it("centena composta (centena + dezena/unidade)", () => {
    expect(numeroPorExtenso(250)).toBe("duzentos e cinquenta");
    expect(numeroPorExtenso(999)).toBe("novecentos e noventa e nove");
  });

  it("milhar exato", () => {
    expect(numeroPorExtenso(1000)).toBe("mil");
    expect(numeroPorExtenso(2000)).toBe("dois mil");
    expect(numeroPorExtenso(200000)).toBe("duzentos mil");
  });

  it("milhar não usa concordância de gênero (sempre concorda com 'mil')", () => {
    expect(numeroPorExtenso(200000, "F")).toBe("duzentos mil");
  });

  it("'e' antes do resto só quando resto < 100 ou é centena redonda", () => {
    expect(numeroPorExtenso(1050)).toBe("mil e cinquenta");
    expect(numeroPorExtenso(1100)).toBe("mil e cem");
    expect(numeroPorExtenso(1200)).toBe("mil e duzentos");
  });

  it("sem 'e' de ligação quando o resto já tem centena+dezena/unidade", () => {
    expect(numeroPorExtenso(1250)).toBe("mil duzentos e cinquenta");
    expect(numeroPorExtenso(999999)).toBe(
      "novecentos e noventa e nove mil novecentos e noventa e nove",
    );
  });

  it("rejeita valores fora do intervalo suportado", () => {
    expect(() => numeroPorExtenso(-1)).toThrow();
    expect(() => numeroPorExtenso(1000000)).toThrow();
    expect(() => numeroPorExtenso(1.5)).toThrow();
  });
});

describe("valorPorExtenso", () => {
  it("zero", () => {
    expect(valorPorExtenso(0)).toBe("zero reais");
  });

  it("singular de real e centavo", () => {
    expect(valorPorExtenso(100)).toBe("um real");
    expect(valorPorExtenso(1)).toBe("um centavo");
    expect(valorPorExtenso(101)).toBe("um real e um centavo");
  });

  it("plural de reais e centavos", () => {
    expect(valorPorExtenso(25000)).toBe("duzentos e cinquenta reais");
    expect(valorPorExtenso(25050)).toBe("duzentos e cinquenta reais e cinquenta centavos");
  });

  it("só centavos, sem reais", () => {
    expect(valorPorExtenso(50)).toBe("cinquenta centavos");
  });

  it("valor redondo em milhar", () => {
    expect(valorPorExtenso(300000)).toBe("três mil reais");
  });

  it("rejeita valores inválidos", () => {
    expect(() => valorPorExtenso(-1)).toThrow();
    expect(() => valorPorExtenso(1.5)).toThrow();
  });
});

describe("diariasPorExtenso", () => {
  it("diária inteira", () => {
    expect(diariasPorExtenso(1)).toBe("1 (uma)");
    expect(diariasPorExtenso(2)).toBe("2 (duas)");
    expect(diariasPorExtenso(3)).toBe("3 (três)");
  });

  it("diária e meia", () => {
    expect(diariasPorExtenso(1.5)).toBe("1 e 1/2 (uma e meia)");
    expect(diariasPorExtenso(2.5)).toBe("2 e 1/2 (duas e meia)");
  });

  it("meia diária isolada", () => {
    expect(diariasPorExtenso(0.5)).toBe("1/2 (meia)");
  });

  it("rejeita fração que não seja meia", () => {
    expect(() => diariasPorExtenso(1.3)).toThrow();
  });
});
