/**
 * Rascunho da "Nova solicitação" salvo no navegador (localStorage), por
 * usuário logado — não no servidor. Sobrevive a fechar a aba/navegador no
 * mesmo dispositivo, mas não atravessa dispositivos/navegadores diferentes
 * (decisão consciente: evita o trabalho de persistir rascunho + anexos no
 * servidor, que exigiria subir o arquivo de verdade em vez de só "lembrar"
 * dele). Arquivos (input type="file") nunca são salvos — não são
 * serializáveis e, por segurança do navegador, não podem ser
 * reatribuídos a um <input> programaticamente; o usuário reanexa ao voltar.
 *
 * Tudo aqui é best-effort: localStorage pode lançar em modo privado/
 * cota excedida, e isso nunca deve quebrar o formulário.
 */

function chave(usuarioId: string): string {
  return `diarias:rascunho-pedido:${usuarioId}`;
}

export function salvarRascunho(usuarioId: string, dados: Record<string, string>): void {
  try {
    localStorage.setItem(chave(usuarioId), JSON.stringify(dados));
  } catch {
    // best-effort — modo privado, cota excedida, etc.
  }
}

export function carregarRascunho(usuarioId: string): Record<string, string> | null {
  try {
    const bruto = localStorage.getItem(chave(usuarioId));
    if (!bruto) return null;
    const dados = JSON.parse(bruto);
    if (dados && typeof dados === "object") return dados as Record<string, string>;
    return null;
  } catch {
    return null;
  }
}

export function limparRascunho(usuarioId: string): void {
  try {
    localStorage.removeItem(chave(usuarioId));
  } catch {
    // best-effort
  }
}

/** Converte o FormData atual do formulário num objeto serializável, descartando arquivos. */
export function formDataParaRascunho(formData: FormData): Record<string, string> {
  const dados: Record<string, string> = {};
  for (const [chave, valor] of formData.entries()) {
    if (valor instanceof File) continue;
    dados[chave] = valor;
  }
  return dados;
}
