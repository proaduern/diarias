import {
  Paragraph,
  TextRun,
  TableCell,
  Header,
  Footer,
  ImageRun,
  AlignmentType,
  WidthType,
  BorderStyle,
  PageNumber,
} from "docx";
import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

let cachedBrasaoBytes: Buffer | null = null;
let cachedBrasaoBase64: string | null = null;

export function obterBytesBrasaoUern(): Buffer | null {
  if (cachedBrasaoBytes) return cachedBrasaoBytes;
  try {
    const p = path.join(process.cwd(), "public", "brasao-uern.jpg");
    if (fs.existsSync(p)) {
      cachedBrasaoBytes = fs.readFileSync(p);
      return cachedBrasaoBytes;
    }
  } catch (err) {
    console.warn("Aviso ao ler brasao-uern.jpg:", err);
  }
  return null;
}

export function obterBase64BrasaoUern(): string | null {
  if (cachedBrasaoBase64) return cachedBrasaoBase64;
  const buf = obterBytesBrasaoUern();
  if (!buf) return null;
  cachedBrasaoBase64 = `data:image/jpeg;base64,${buf.toString("base64")}`;
  return cachedBrasaoBase64;
}

export const ENDERECO_INSTITUCIONAL_SDHP =
  "Rua Almino Afonso, 478 — Centro, Mossoró/RN, CEP 59610-210 — E-mail: diarias.proad@uern.br — http://portal.uern.br/";

/**
 * Cria o Cabeçalho Institucional Padrão UERN / PROAD / SDHP para arquivos .DOCX
 * (Com Brasão Colorido Oficial da UERN e sem o telefone desatualizado).
 */
export function criarCabecalhoDocxSdhp(subtituloSequencial?: string): Header {
  const brasaoBytes = obterBytesBrasaoUern();
  const children: Paragraph[] = [];

  if (brasaoBytes) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          new ImageRun({
            data: brasaoBytes,
            transformation: {
              width: 52,
              height: 66,
            },
            type: "jpg",
          }),
        ],
      }),
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [
        new TextRun({
          text: "UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE — UERN",
          bold: true,
          size: 19,
          font: "Arial",
          color: "003366",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
      children: [
        new TextRun({
          text: "PRÓ-REITORIA DE ADMINISTRAÇÃO — PROAD • SETOR DE DIÁRIAS, HOSPEDAGENS E PASSAGENS (SDHP)",
          bold: true,
          size: 16,
          font: "Arial",
          color: "333333",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: subtituloSequencial ? 50 : 160 },
      children: [
        new TextRun({
          text: ENDERECO_INSTITUCIONAL_SDHP,
          size: 14,
          font: "Arial",
          color: "666666",
        }),
      ],
    }),
  );

  if (subtituloSequencial) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 140 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: "003366" },
        },
        children: [
          new TextRun({
            text: subtituloSequencial,
            bold: true,
            size: 18,
            font: "Arial",
            color: "003366",
          }),
        ],
      }),
    );
  }

  return new Header({ children });
}

/**
 * Cria o Rodapé Padrão com Verificação de Autenticidade e Paginação para .DOCX
 */
export function criarRodapeDocxSdhp(
  tituloDoc: string,
  codigoVerificador?: string,
): Footer {
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 80 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      },
      children: [
        new TextRun({
          text: `${tituloDoc} — SDHP/PROAD/UERN. `,
          size: 14,
          font: "Arial",
          color: "333333",
          bold: true,
        }),
        ...(codigoVerificador
          ? [
              new TextRun({
                text: `Autenticação Digital (Código Verificador: ${codigoVerificador}). `,
                size: 13,
                font: "Arial",
                color: "003366",
              }),
            ]
          : []),
        new TextRun({
          text: "Pág. ",
          size: 13,
          font: "Arial",
          color: "666666",
        }),
        new TextRun({
          children: [PageNumber.CURRENT],
          size: 13,
          font: "Arial",
          color: "666666",
        }),
        new TextRun({
          text: " de ",
          size: 13,
          font: "Arial",
          color: "666666",
        }),
        new TextRun({
          children: [PageNumber.TOTAL_PAGES],
          size: 13,
          font: "Arial",
          color: "666666",
        }),
      ],
    }),
  ];

  return new Footer({ children });
}

/**
 * Desenha o Cabeçalho Institucional Padrão UERN / PROAD / SDHP em um documento jsPDF (.PDF)
 * Retorna a posição Y (em mm) após o cabeçalho.
 */
export function desenharCabecalhoPdfSdhp(
  doc: jsPDF,
  tituloSequencial: string,
  subtituloProcesso?: string | null,
): number {
  const brasaoDataUrl = obterBase64BrasaoUern();
  let y = 12;

  if (brasaoDataUrl) {
    try {
      doc.addImage(brasaoDataUrl, "JPEG", 96, 8, 18, 22);
      y = 33;
    } catch {
      y = 14;
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 51, 102);
  doc.text("UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE — UERN", 105, y, {
    align: "center",
  });
  y += 4.2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.setTextColor(40, 40, 40);
  doc.text(
    "PRÓ-REITORIA DE ADMINISTRAÇÃO — PROAD • SETOR DE DIÁRIAS, HOSPEDAGENS E PASSAGENS (SDHP)",
    105,
    y,
    { align: "center" },
  );
  y += 3.8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(100, 100, 100);
  doc.text(ENDERECO_INSTITUCIONAL_SDHP, 105, y, { align: "center" });
  y += 3.5;

  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(0.4);
  doc.line(14, y, 196, y);
  y += 5;

  // Faixa do Sequencial Oficial
  doc.setFillColor(240, 245, 252);
  doc.setDrawColor(0, 51, 102);
  doc.roundedRect(14, y - 3.5, 182, subtituloProcesso ? 12 : 8, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(0, 51, 102);
  doc.text(tituloSequencial.toUpperCase(), 105, y + 1.2, { align: "center" });

  if (subtituloProcesso) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.setTextColor(30, 41, 59);
    doc.text(subtituloProcesso, 105, y + 5.8, { align: "center" });
    y += 13;
  } else {
    y += 9;
  }

  return y;
}

/**
 * Desenha o Rodapé Oficial em todas as páginas de um documento jsPDF (.PDF)
 */
export function desenharRodapePdfSdhp(
  doc: jsPDF,
  tituloSequencial: string,
  codigoVerificador: string,
) {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const yFoot = 286;
    doc.setDrawColor(190, 190, 190);
    doc.setLineWidth(0.3);
    doc.line(14, yFoot - 2.5, 196, yFoot - 2.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(0, 51, 102);
    doc.text(`${tituloSequencial} — SDHP / PROAD / UERN`, 14, yFoot + 0.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(80, 80, 80);
    doc.text(
      `Documento Autenticado Digitalmente • Código Verificador: ${codigoVerificador}`,
      14,
      yFoot + 3.8,
    );

    doc.text(`Pág. ${i} de ${totalPages}`, 196, yFoot + 2, { align: "right" });
  }
}

export function criarTituloSecaoDocx(titulo: string): Paragraph {
  return new Paragraph({
    spacing: { before: 180, after: 80 },
    shading: { fill: "003366" },
    children: [
      new TextRun({
        text: `  ${titulo}`,
        bold: true,
        size: 18,
        font: "Arial",
        color: "FFFFFF",
      }),
    ],
  });
}

export function criarParagrafoDocx(
  texto: string,
  opcoes?: {
    bold?: boolean;
    size?: number;
    color?: string;
    alinhamento?: (typeof AlignmentType)[keyof typeof AlignmentType];
    after?: number;
  },
): Paragraph {
  return new Paragraph({
    alignment: opcoes?.alinhamento ?? AlignmentType.JUSTIFIED,
    spacing: { after: opcoes?.after ?? 100, line: 260 },
    children: [
      new TextRun({
        text: texto,
        bold: opcoes?.bold ?? false,
        size: opcoes?.size ?? 18,
        font: "Arial",
        color: opcoes?.color ?? "222222",
      }),
    ],
  });
}

export function celulaTopoDocx(texto: string, widthPct?: number): TableCell {
  return new TableCell({
    ...(widthPct ? { width: { size: widthPct, type: WidthType.PERCENTAGE } } : {}),
    shading: { fill: "E2E8F0" },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: texto,
            bold: true,
            size: 15,
            font: "Arial",
            color: "0F172A",
          }),
        ],
      }),
    ],
  });
}

export function celulaCorpoDocx(
  texto: string,
  alinhamento: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
  bold = false,
): TableCell {
  return new TableCell({
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: alinhamento,
        children: [
          new TextRun({
            text: texto || "—",
            bold,
            size: 15,
            font: "Arial",
            color: "1E293B",
          }),
        ],
      }),
    ],
  });
}

export function criarBlocoAssinaturaDocx(
  nome: string,
  cargo: string,
  subtitulo?: string,
  cidadeDataTexto?: string,
): Paragraph[] {
  const itens: Paragraph[] = [];
  if (cidadeDataTexto) {
    itens.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 200, after: 200 },
        children: [
          new TextRun({
            text: cidadeDataTexto,
            size: 18,
            font: "Arial",
            color: "333333",
          }),
        ],
      }),
    );
  }
  itens.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 30 },
      children: [
        new TextRun({
          text: "_______________________________________________________",
          size: 18,
          font: "Arial",
          color: "555555",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
      children: [
        new TextRun({
          text: nome.toUpperCase(),
          bold: true,
          size: 18,
          font: "Arial",
          color: "003366",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: subtitulo ? 20 : 120 },
      children: [
        new TextRun({
          text: cargo,
          size: 16,
          font: "Arial",
          color: "444444",
        }),
      ],
    }),
  );
  if (subtitulo) {
    itens.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: subtitulo,
            size: 14,
            font: "Arial",
            color: "666666",
            italics: true,
          }),
        ],
      }),
    );
  }
  return itens;
}
