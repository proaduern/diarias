import { describe, expect, it } from "vitest";
import { avaliarSaldoContrato } from "../saldo-contrato";

describe("avaliarSaldoContrato", () => {
  it("dentro do saldo do contrato, sem cota própria da unidade -> OK", () => {
    const r = avaliarSaldoContrato({
      novoValorCentavos: 50000,
      valorTotalContratoCentavos: 1000000,
      consumidoContratoCentavos: 200000,
      cotaUnidadeCentavos: 0,
      consumidoUnidadeCentavos: 0,
    });
    expect(r.situacao).toBe("DENTRO_DO_SALDO");
    if (r.situacao === "DENTRO_DO_SALDO") {
      expect(r.saldoContratoDisponivel).toBe(800000);
      expect(r.cotaUnidadeDisponivel).toBeNull();
    }
  });

  it("estoura o saldo global do contrato -> bloqueado, mesmo sem cota própria", () => {
    const r = avaliarSaldoContrato({
      novoValorCentavos: 900000,
      valorTotalContratoCentavos: 1000000,
      consumidoContratoCentavos: 800000,
      cotaUnidadeCentavos: 0,
      consumidoUnidadeCentavos: 0,
    });
    expect(r.situacao).toBe("EXCEDE_SALDO_CONTRATO");
  });

  it("exatamente no limite do saldo do contrato -> permitido (limiar inclusivo)", () => {
    const r = avaliarSaldoContrato({
      novoValorCentavos: 200000,
      valorTotalContratoCentavos: 1000000,
      consumidoContratoCentavos: 800000,
      cotaUnidadeCentavos: 0,
      consumidoUnidadeCentavos: 0,
    });
    expect(r.situacao).toBe("DENTRO_DO_SALDO");
  });

  it("unidade com cota própria dentro do limite -> OK mesmo com saldo do contrato maior", () => {
    const r = avaliarSaldoContrato({
      novoValorCentavos: 30000,
      valorTotalContratoCentavos: 1000000,
      consumidoContratoCentavos: 100000,
      cotaUnidadeCentavos: 50000,
      consumidoUnidadeCentavos: 10000,
    });
    expect(r.situacao).toBe("DENTRO_DO_SALDO");
    if (r.situacao === "DENTRO_DO_SALDO") {
      expect(r.cotaUnidadeDisponivel).toBe(40000);
    }
  });

  it("estoura a cota própria da unidade, mesmo com saldo de sobra no contrato", () => {
    const r = avaliarSaldoContrato({
      novoValorCentavos: 45000,
      valorTotalContratoCentavos: 1000000,
      consumidoContratoCentavos: 100000,
      cotaUnidadeCentavos: 50000,
      consumidoUnidadeCentavos: 10000,
    });
    expect(r.situacao).toBe("EXCEDE_COTA_UNIDADE");
  });

  it("cota da unidade OK mas estoura o saldo global do contrato -> bloqueado", () => {
    const r = avaliarSaldoContrato({
      novoValorCentavos: 40000,
      valorTotalContratoCentavos: 100000,
      consumidoContratoCentavos: 90000,
      cotaUnidadeCentavos: 500000,
      consumidoUnidadeCentavos: 0,
    });
    expect(r.situacao).toBe("EXCEDE_SALDO_CONTRATO");
  });
});
