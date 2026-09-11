import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const UPLOADS_ROOT = path.join(process.cwd(), "storage", "uploads");

export async function salvarArquivoEnviado(
  pedidoId: string,
  arquivo: File,
): Promise<{ nomeArquivo: string; caminho: string }> {
  const dir = path.join(UPLOADS_ROOT, pedidoId);
  await mkdir(dir, { recursive: true });

  const extensao = path.extname(arquivo.name) || ".pdf";
  const nomeSeguro = `${Date.now()}-${crypto.randomUUID()}${extensao}`;
  const caminhoAbsoluto = path.join(dir, nomeSeguro);

  const buffer = Buffer.from(await arquivo.arrayBuffer());
  await writeFile(caminhoAbsoluto, buffer);

  return {
    nomeArquivo: arquivo.name,
    caminho: path.join(pedidoId, nomeSeguro),
  };
}

export function caminhoAbsolutoAnexo(caminhoRelativo: string): string {
  return path.join(UPLOADS_ROOT, caminhoRelativo);
}
