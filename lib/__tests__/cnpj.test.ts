import { describe, expect, it } from "vitest";
import { cnpjValido, normalizarCnpj } from "../cnpj";

describe("cnpjValido", () => {
  it("aceita um CNPJ válido conhecido, formatado", () => {
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
  });

  it("aceita o mesmo CNPJ só com dígitos", () => {
    expect(cnpjValido("11222333000181")).toBe(true);
  });

  it("rejeita dígito verificador incorreto", () => {
    expect(cnpjValido("11.222.333/0001-80")).toBe(false);
  });

  it("rejeita todos os dígitos iguais", () => {
    expect(cnpjValido("11111111111111")).toBe(false);
  });

  it("rejeita CNPJ com tamanho errado", () => {
    expect(cnpjValido("1122233300018")).toBe(false);
    expect(cnpjValido("112223330001811")).toBe(false);
  });
});

describe("normalizarCnpj", () => {
  it("remove pontuação", () => {
    expect(normalizarCnpj("11.222.333/0001-81")).toBe("11222333000181");
  });
});
