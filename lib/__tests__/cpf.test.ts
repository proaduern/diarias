import { describe, expect, it } from "vitest";
import {
  checarDuplicidadeBeneficiario,
  cpfValido,
  distanciaHammingCpf,
  normalizarNome,
} from "../cpf";

describe("cpfValido", () => {
  it("aceita CPF válido conhecido", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
  });

  it("rejeita CPF com dígito verificador errado", () => {
    expect(cpfValido("529.982.247-26")).toBe(false);
  });

  it("rejeita CPF com todos os dígitos iguais", () => {
    expect(cpfValido("111.111.111-11")).toBe(false);
  });

  it("rejeita CPF com número de dígitos errado", () => {
    expect(cpfValido("123456789")).toBe(false);
  });
});

describe("distanciaHammingCpf", () => {
  it("dois primeiros dígitos trocados contam como distância 2, não 1", () => {
    expect(distanciaHammingCpf("12345678901", "21345678901")).toBe(2);
  });

  it("um único dígito trocado conta como distância 1", () => {
    expect(distanciaHammingCpf("12345678901", "12345678909")).toBe(1);
  });

  it("CPFs idênticos têm distância zero", () => {
    expect(distanciaHammingCpf("12345678901", "12345678901")).toBe(0);
  });
});

describe("normalizarNome", () => {
  it("remove acentos, normaliza caixa e espaços duplicados", () => {
    expect(normalizarNome("  João   da Silva  ")).toBe("JOAO DA SILVA");
  });
});

describe("checarDuplicidadeBeneficiario", () => {
  it("CPF idêntico bloqueia, mesmo com nome diferente", () => {
    const r = checarDuplicidadeBeneficiario(
      { nome: "Maria Souza", cpf: "12345678901" },
      { nome: "Maria de Souza", cpf: "123.456.789-01" },
    );
    expect(r.tipo).toBe("CPF_IDENTICO");
  });

  it("mesmo nome + CPF com 1 dígito diferente -> provável erro de digitação, bloqueia", () => {
    const r = checarDuplicidadeBeneficiario(
      { nome: "Maria Souza", cpf: "12345678901" },
      { nome: "MARIA SOUZA", cpf: "12345678909" },
    );
    expect(r.tipo).toBe("PROVAVEL_ERRO_DIGITACAO");
  });

  it("mesmo nome + CPF com 2 dígitos diferentes -> ainda bloqueia", () => {
    const r = checarDuplicidadeBeneficiario(
      { nome: "Maria Souza", cpf: "12345678901" },
      { nome: "Maria Souza", cpf: "21345678901" },
    );
    expect(r.tipo).toBe("PROVAVEL_ERRO_DIGITACAO");
  });

  it("mesmo nome + CPF com 3+ dígitos diferentes -> homônimos, permite", () => {
    const r = checarDuplicidadeBeneficiario(
      { nome: "Maria Souza", cpf: "12345678901" },
      { nome: "Maria Souza", cpf: "98765432101" },
    );
    expect(r.tipo).toBe("OK");
  });

  it("nomes diferentes e CPFs diferentes -> OK", () => {
    const r = checarDuplicidadeBeneficiario(
      { nome: "Maria Souza", cpf: "12345678901" },
      { nome: "João Pereira", cpf: "98765432100" },
    );
    expect(r.tipo).toBe("OK");
  });
});
