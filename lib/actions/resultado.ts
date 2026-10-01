/**
 * Em produção, o Next.js oculta a mensagem de qualquer erro lançado (throw)
 * dentro de uma Server Action, substituindo-a por uma mensagem genérica
 * ("Minified React error #441") — a mensagem real só aparece no log do
 * servidor. Isso é intencional (evita vazar detalhes internos) e não tem
 * como ser desligado por configuração.
 *
 * Para que mensagens de validação/negócio cheguem ao usuário, a action não
 * pode lançar o erro para fora — precisa devolvê-lo como dado. Este helper
 * envolve o corpo de uma action (que continua usando `throw new Error(...)`
 * normalmente) e converte a exceção em um `ResultadoAction` comum,
 * preservando a mensagem original.
 */
export type ResultadoAction = { ok: true } | { ok: false; erro: string };

export async function comTratamentoDeErro(fn: () => Promise<void>): Promise<ResultadoAction> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro inesperado." };
  }
}

/**
 * Usado no lado do cliente: desembrulha um ResultadoAction, lançando um erro
 * comum (capturável por try/catch) quando a action reportou falha. Mantém o
 * mesmo formato de `try { ... } catch (err) { setErro(err.message) }` já
 * usado em todos os formulários, só trocando `await action(...)` por
 * `desempacotar(await action(...))`.
 */
export function desempacotar(resultado: ResultadoAction): void {
  if (!resultado.ok) throw new Error(resultado.erro);
}
