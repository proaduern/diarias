const TAMANHO_MAXIMO_BYTES = 8 * 1024 * 1024; // 8 MB

export async function lerArquivoEnviado(
  arquivo: File,
): Promise<{ nomeArquivo: string; conteudo: Uint8Array }> {
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    throw new Error("O arquivo excede o limite de 8 MB.");
  }
  const conteudo = new Uint8Array(await arquivo.arrayBuffer());
  return { nomeArquivo: arquivo.name, conteudo };
}
