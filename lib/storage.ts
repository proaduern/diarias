const TAMANHO_MAXIMO_BYTES = 8 * 1024 * 1024; // 8 MB
const EXTENSOES_PERMITIDAS = ['.pdf', '.png', '.jpg', '.jpeg'];

export async function lerArquivoEnviado(
  arquivo: File,
): Promise<{ nomeArquivo: string; conteudo: Uint8Array }> {
  if (!arquivo || arquivo.size === 0) {
    throw new Error("Arquivo vazio ou inválido.");
  }

  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    throw new Error("O arquivo excede o limite de 8 MB.");
  }

  const nome = arquivo.name.toLowerCase();
  const extensaoValida = EXTENSOES_PERMITIDAS.some((ext) => nome.endsWith(ext));
  if (!extensaoValida) {
    throw new Error("Formato de arquivo não suportado. Envie apenas arquivos PDF ou imagens (PNG/JPG).");
  }

  const conteudo = new Uint8Array(await arquivo.arrayBuffer());
  return { nomeArquivo: arquivo.name, conteudo };
}
