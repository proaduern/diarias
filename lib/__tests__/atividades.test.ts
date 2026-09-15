import { describe, expect, it } from "vitest";
import { avaliarHorarioAtividade, limitesDasAtividades } from "../atividades";

describe("limitesDasAtividades", () => {
  it("calcula o início mínimo e o fim máximo entre várias atividades", () => {
    const r = limitesDasAtividades([
      { dataHoraInicio: new Date("2026-03-11T08:00:00"), dataHoraFim: new Date("2026-03-11T12:00:00") },
      { dataHoraInicio: new Date("2026-03-10T14:00:00"), dataHoraFim: new Date("2026-03-12T18:00:00") },
    ]);
    expect(r.inicioMinimo).toEqual(new Date("2026-03-10T14:00:00"));
    expect(r.fimMaximo).toEqual(new Date("2026-03-12T18:00:00"));
  });

  it("lança erro se não houver nenhuma atividade", () => {
    expect(() => limitesDasAtividades([])).toThrow();
  });
});

describe("avaliarHorarioAtividade", () => {
  const atividade = {
    dataHoraInicio: new Date("2026-03-11T08:00:00"),
    dataHoraFim: new Date("2026-03-11T18:00:00"),
  };

  it("chegada exatamente no início da atividade e saída exatamente no fim -> OK", () => {
    const r = avaliarHorarioAtividade(
      { chegadaDestino: new Date("2026-03-11T08:00:00"), saidaDestino: new Date("2026-03-11T18:00:00") },
      [atividade],
    );
    expect(r.situacao).toBe("OK");
  });

  it("chegada depois do início da atividade -> bloqueado total, sem exceção", () => {
    const r = avaliarHorarioAtividade(
      { chegadaDestino: new Date("2026-03-11T08:01:00"), saidaDestino: new Date("2026-03-11T18:00:00") },
      [atividade],
    );
    expect(r.situacao).toBe("BLOQUEADO_CHEGADA_APOS_INICIO");
  });

  it("saída antes do fim da atividade -> bloqueado total, sem exceção (trava espelhada)", () => {
    const r = avaliarHorarioAtividade(
      { chegadaDestino: new Date("2026-03-11T08:00:00"), saidaDestino: new Date("2026-03-11T17:59:00") },
      [atividade],
    );
    expect(r.situacao).toBe("BLOQUEADO_SAIDA_ANTES_FIM");
  });

  it("chegada adiantada em relação ao início -> exige justificativa de folga", () => {
    const r = avaliarHorarioAtividade(
      { chegadaDestino: new Date("2026-03-10T20:00:00"), saidaDestino: new Date("2026-03-11T18:00:00") },
      [atividade],
    );
    expect(r.situacao).toBe("REQUER_JUSTIFICATIVA_FOLGA");
  });

  it("saída atrasada em relação ao fim -> exige justificativa de folga", () => {
    const r = avaliarHorarioAtividade(
      { chegadaDestino: new Date("2026-03-11T08:00:00"), saidaDestino: new Date("2026-03-12T08:00:00") },
      [atividade],
    );
    expect(r.situacao).toBe("REQUER_JUSTIFICATIVA_FOLGA");
  });

  it("com várias atividades, usa o início mínimo e o fim máximo entre todas", () => {
    const atividades = [
      atividade,
      { dataHoraInicio: new Date("2026-03-12T08:00:00"), dataHoraFim: new Date("2026-03-12T12:00:00") },
    ];
    const okExato = avaliarHorarioAtividade(
      { chegadaDestino: new Date("2026-03-11T08:00:00"), saidaDestino: new Date("2026-03-12T12:00:00") },
      atividades,
    );
    expect(okExato.situacao).toBe("OK");

    const bloqueado = avaliarHorarioAtividade(
      { chegadaDestino: new Date("2026-03-11T08:00:00"), saidaDestino: new Date("2026-03-12T11:00:00") },
      atividades,
    );
    expect(bloqueado.situacao).toBe("BLOQUEADO_SAIDA_ANTES_FIM");
  });
});
