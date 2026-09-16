import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { gerarPortariaDiariaDocx, type DadosPortariaDiaria } from "../portaria-docx";

/**
 * Extrai o texto puro de word/document.xml, concatenando o conteúdo de
 * cada <w:p> (parágrafo) com uma quebra de linha, para comparar contra o
 * texto do modelo real (Portaria nº 3785/2026-GP/FUERN) sem depender de
 * detalhes de marcação OOXML.
 */
async function extrairParagrafos(buffer: Buffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml")!.async("string");
  const paragrafosXml = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [];
  return paragrafosXml.map((p) => {
    const textos = p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) ?? [];
    return textos.map((t) => t.replace(/<[^>]+>/g, "")).join("");
  });
}

// Dados reproduzindo exatamente a Portaria nº 3785/2026-GP/FUERN (caso "servidor com matrícula").
const dadosServidor: DadosPortariaDiaria = {
  portariaNumero: "3785",
  portariaData: new Date(2026, 8, 14),
  numeroProcessoSei: "04410039.001276/2026-07",
  idPropostaConcessao: "44124050",
  numeroPortariaDelegacao: "3674/2025",
  dataPortariaDelegacao: new Date(2025, 9, 2),
  assinante1Nome: "TNS MA. MARIA NILZA BATISTA LUZ",
  assinante1Cargo: "PRÓ-REITORA DE ADMINISTRAÇÃO",
  assinante2Nome: "TNS ME. PEDRO REBOUÇAS DE OLIVEIRA NETO",
  assinante2Cargo: "PRÓ-REITOR ADJUNTO DE ADMINISTRAÇÃO",
  beneficiario: {
    nome: "Josek Alex de Medeiros",
    cpf: "00000000000",
    matricula: "4541-1",
    cargo: "condutor de veículo automotor",
  },
  diarias: 1.5,
  valorUnitarioCentavos: 25000,
  valorTotalCentavos: 37500,
  sedeCidade: "Mossoró",
  sedeEstado: "RN",
  municipioDestino: "Recife",
  destinoEstado: "PE",
  saidaSede: new Date(2026, 8, 18),
  chegadaSede: new Date(2026, 8, 19),
  finalidade:
    "buscar na cidade de Recife-PE o professor Renan Colombo e os alunos Elany Santos e Francisco Juscelino, " +
    "após os mesmos terem apresentado trabalhos no XXXVI Congresso da ANPPOM",
};

describe("gerarPortariaDiariaDocx", () => {
  it("reproduz fielmente o texto do modelo real (caso servidor com matrícula)", async () => {
    const buffer = await gerarPortariaDiariaDocx(dadosServidor);
    const paragrafos = await extrairParagrafos(buffer);
    const texto = paragrafos.join("\n");

    expect(paragrafos).toContain("FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - FUERN");
    expect(paragrafos).toContain("GABINETE DO PRESIDENTE");
    expect(paragrafos).toContain("PORTARIA Nº 3785/2026-GP/FUERN DE 14 DE SETEMBRO DE 2026");
    expect(paragrafos).toContain("Concede diária");

    expect(texto).toContain(
      "CONSIDERANDO os termos do Decreto Estadual n° 29.444, de 7 de janeiro de 2020, que dispõe sobre as " +
        "indenizações previstas no art. 57, I a III, da Lei Complementar n.º 122, de 30 de junho de 1994, e dá outras providências;",
    );
    expect(texto).toContain(
      "CONSIDERANDO os termos da Portaria nº 3674/2025 - GP/Fuern, de 2 de outubro de 2025, que delega poderes para a concessão de diárias;",
    );
    expect(texto).toContain("CONSIDERANDO o que consta nos autos do Processo n° 04410039.001276/2026-07,");
    expect(paragrafos).toContain("R E S O L V E:");

    expect(texto).toContain(
      "Art. 1° Conceder ao servidor condutor de veículo automotor Josek Alex de Medeiros, matrícula n° 4541-1, " +
        "1 e 1/2 (uma e meia) diária(s), no valor unitário de R$ 250,00 (duzentos e cinquenta reais), " +
        "totalizando o valor de R$ 375,00 (trezentos e setenta e cinco reais), " +
        "referente à viagem Mossoró-RN x Recife-PE x Mossoró-RN, no(s) dia(s) 18 a 19/09/2026, " +
        "com a finalidade de buscar na cidade de Recife-PE o professor Renan Colombo e os alunos Elany Santos e " +
        "Francisco Juscelino, após os mesmos terem apresentado trabalhos no XXXVI Congresso da ANPPOM, " +
        "conforme descrito na Proposta de Concessão de Diárias (ID 44124050).",
    );
    expect(paragrafos).toContain("Art. 2° Esta portaria entra em vigor nesta data.");
    expect(paragrafos).toContain("Em 14 de setembro de 2026.");

    expect(paragrafos).toContain("TNS MA. MARIA NILZA BATISTA LUZ");
    expect(paragrafos).toContain("PRÓ-REITORA DE ADMINISTRAÇÃO");
    expect(paragrafos).toContain("TNS ME. PEDRO REBOUÇAS DE OLIVEIRA NETO");
    expect(paragrafos).toContain("PRÓ-REITOR ADJUNTO DE ADMINISTRAÇÃO");

    // O selo/QR/código verificador do SEI nunca é gerado por nós.
    expect(texto).not.toContain("Documento assinado eletronicamente");
    expect(texto).not.toContain("código verificador");
  });

  it("usa a cláusula de Agente Colaborador quando não há matrícula/cargo (externo)", async () => {
    const dadosColaborador: DadosPortariaDiaria = {
      ...dadosServidor,
      beneficiario: {
        nome: "Maria da Silva",
        cpf: "11144477735",
        matricula: null,
        cargo: null,
      },
    };
    const buffer = await gerarPortariaDiariaDocx(dadosColaborador);
    const paragrafos = await extrairParagrafos(buffer);
    const texto = paragrafos.join("\n");

    expect(texto).toContain("Art. 1° Conceder ao Agente Colaborador Maria da Silva, CPF nº 111.444.777-35,");
    expect(texto).not.toContain("matrícula");
  });
});
