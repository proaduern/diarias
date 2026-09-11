import { describe, expect, it } from "vitest";
import {
  avaliarPrestacaoContas,
  somarDiasUteis,
  temPendenciaBloqueante,
} from "../prestacao-contas";

describe("somarDiasUteis", () => {
  it("pula fim de semana ao somar dias úteis", () => {
    // sexta-feira 13/03/2026 + 5 dias úteis = sexta 20/03/2026
    const r = somarDiasUteis(new Date("2026-03-13T00:00:00"), 5);
    expect(r.toISOString().slice(0, 10)).toBe("2026-03-20");
  });
});

describe("avaliarPrestacaoContas", () => {
  it("antes do retorno -> em viagem", () => {
    const r = avaliarPrestacaoContas(
      { chegadaSede: new Date("2026-03-20"), relatorioEnviadoEm: null },
      new Date("2026-03-15"),
      5,
      30,
    );
    expect(r.situacao).toBe("EM_VIAGEM");
  });

  it("relatório enviado -> concluído, independente da data", () => {
    const r = avaliarPrestacaoContas(
      {
        chegadaSede: new Date("2026-03-01"),
        relatorioEnviadoEm: new Date("2026-06-01"),
      },
      new Date("2026-07-01"),
      5,
      30,
    );
    expect(r.situacao).toBe("CONCLUIDO");
  });

  it("dentro do prazo de dias úteis -> aguardando, sem bloqueio", () => {
    const chegada = new Date("2026-03-13T00:00:00"); // sexta
    const r = avaliarPrestacaoContas(
      { chegadaSede: chegada, relatorioEnviadoEm: null },
      new Date("2026-03-16T00:00:00"), // segunda seguinte, ainda dentro
      5,
      30,
    );
    expect(r.situacao).toBe("AGUARDANDO_RELATORIO_NO_PRAZO");
    expect(temPendenciaBloqueante(r)).toBe(false);
  });

  it("passou do prazo de dias úteis mas não de 30 dias corridos -> atrasado, bloqueia", () => {
    const chegada = new Date("2026-03-13T00:00:00"); // sexta
    const r = avaliarPrestacaoContas(
      { chegadaSede: chegada, relatorioEnviadoEm: null },
      new Date("2026-03-25T00:00:00"), // depois de 20/03, antes de 30 dias corridos
      5,
      30,
    );
    expect(r.situacao).toBe("RELATORIO_ATRASADO");
    expect(temPendenciaBloqueante(r)).toBe(true);
  });

  it("passou de 30 dias corridos sem relatório -> devolução pendente, bloqueia", () => {
    const chegada = new Date("2026-03-01T00:00:00");
    const r = avaliarPrestacaoContas(
      { chegadaSede: chegada, relatorioEnviadoEm: null },
      new Date("2026-04-05T00:00:00"),
      5,
      30,
    );
    expect(r.situacao).toBe("DEVOLUCAO_PENDENTE");
    expect(temPendenciaBloqueante(r)).toBe(true);
  });
});
