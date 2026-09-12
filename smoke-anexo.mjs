import { chromium } from "playwright";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const context = await browser.newContext();
const page = await context.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push(`pageerror: ${e.message}`));
page.on("console", (msg) => { if (msg.type() === "error") erros.push(`console.error: ${msg.text()}`); });

async function passo(nome, fn) {
  try {
    await fn();
    console.log(`OK   ${nome}`);
  } catch (e) {
    console.log(`FAIL ${nome}: ${e.message}`);
    process.exitCode = 1;
  }
}

const BASE = "http://localhost:3000";
const pedidoId = process.argv[2];
if (!pedidoId) {
  console.log("uso: node smoke-anexo.mjs <pedidoId>");
  process.exit(1);
}

let hrefAnexo = "";

await passo("login como usuario A (dono do pedido) e upload do comprovante", async () => {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', "usuario.a.anexo@uern.br");
  await page.fill('input[name="senha"]', "SenhaTeste123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);

  await page.goto(`${BASE}/pedidos/${pedidoId}`);
  await page.setInputFiles('input[name="arquivo"]', {
    name: "comprovante.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 conteudo de teste"),
  });
  await page.click('button:has-text("Anexar comprovante de autorização")');
  await page.waitForSelector("text=Comprovante de autorização anexado");

  hrefAnexo = await page.getAttribute('a[href^="/api/anexos/"]', "href");
  if (!hrefAnexo) throw new Error("link do anexo não encontrado na página");
});

await passo("dono consegue baixar o proprio anexo (200, application/pdf)", async () => {
  const resp = await context.request.get(`${BASE}${hrefAnexo}`);
  if (resp.status() !== 200) throw new Error(`status ${resp.status()}`);
  if (resp.headers()["content-type"] !== "application/pdf") {
    throw new Error(`content-type inesperado: ${resp.headers()["content-type"]}`);
  }
  const corpo = await resp.body();
  if (corpo.length === 0) throw new Error("corpo do PDF veio vazio");
});

await passo("logout e login como usuario B (outra unidade)", async () => {
  await page.goto(`${BASE}/`);
  await page.click('button:has-text("Sair")');
  await page.waitForURL(`${BASE}/login`);
  await page.fill('input[name="email"]', "usuario.b.anexo@uern.br");
  await page.fill('input[name="senha"]', "SenhaTeste123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
});

await passo("usuario de outra unidade NAO consegue baixar o anexo (403)", async () => {
  const resp = await context.request.get(`${BASE}${hrefAnexo}`);
  if (resp.status() !== 403) throw new Error(`esperava 403, veio ${resp.status()}`);
});

await passo("sem sessao (logout) NAO consegue baixar o anexo (401)", async () => {
  await page.click('button:has-text("Sair")');
  await page.waitForURL(`${BASE}/login`);
  const resp = await context.request.get(`${BASE}${hrefAnexo}`);
  if (resp.status() !== 401) throw new Error(`esperava 401, veio ${resp.status()}`);
});

await passo("login como ADMIN consegue baixar qualquer anexo", async () => {
  await page.fill('input[name="email"]', "adj.proad@uern.br");
  await page.fill('input[name="senha"]', "TrocarEssaSenha123!");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
  const resp = await context.request.get(`${BASE}${hrefAnexo}`);
  if (resp.status() !== 200) throw new Error(`status ${resp.status()}`);
});

console.log("--- erros de console/página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");

await browser.close();
