import { jsPDF } from "jspdf";
import { DadosPortariaDiaria } from "./portaria-docx";
import { formatarCpf, formatarDataPorExtenso, formatarMoeda } from "./formato";
import { diariasPorExtenso, valorPorExtenso } from "./numero-extenso";

function formatarPeriodoDias(inicio: Date, fim: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const d1 = inicio.getDate();
  const m1 = inicio.getMonth();
  const y1 = inicio.getFullYear();
  const d2 = fim.getDate();
  const m2 = fim.getMonth();
  const y2 = fim.getFullYear();

  if (d1 === d2 && m1 === m2 && y1 === y2) {
    return `${pad(d1)}/${pad(m1 + 1)}/${y1}`;
  }
  if (m1 === m2 && y1 === y2) {
    return `${pad(d1)} a ${pad(d2)}/${pad(m1 + 1)}/${y1}`;
  }
  return `${pad(d1)}/${pad(m1 + 1)}/${y1} a ${pad(d2)}/${pad(m2 + 1)}/${y2}`;
}

function clausulaBeneficiario(b: DadosPortariaDiaria["beneficiario"]): string {
  if (b.matricula != null && b.cargo != null) {
    return `ao servidor ${b.cargo} ${b.nome}, matrícula nº ${b.matricula}`;
  }
  return `ao Agente Colaborador ${b.nome}, CPF nº ${formatarCpf(b.cpf)}`;
}

export function gerarPortariaDiariaPdf(d: DadosPortariaDiaria): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const anoPortaria = d.portariaData.getFullYear();
  const numeroCompleto = `${d.portariaNumero}/${anoPortaria}-GP/FUERN`;
  const dataPortariaExtensoCaps = formatarDataPorExtenso(d.portariaData).toUpperCase();
  const dataDelegacaoExtenso = formatarDataPorExtenso(d.dataPortariaDelegacao);

  // Cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - FUERN", 105, 20, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("GABINETE DO PRESIDENTE", 105, 25, { align: "center" });

  doc.setDrawColor(180, 180, 180);
  doc.line(20, 29, 190, 29);

  // Título da Portaria
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`PORTARIA Nº ${numeroCompleto} DE ${dataPortariaExtensoCaps}`, 105, 37, { align: "center" });

  // Ementa
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(9.5);
  doc.text("Concede diária.", 190, 47, { align: "right" });

  // Considerandos
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  let y = 56;
  const c1 = "CONSIDERANDO os termos do Decreto Estadual nº 29.444, de 7 de janeiro de 2020, que dispõe sobre as indenizações previstas no art. 57, I a III, da Lei Complementar nº 122, de 30 de junho de 1994, e dá outras providências;";
  const splitC1 = doc.splitTextToSize(c1, 170);
  doc.text(splitC1, 20, y, { align: "justify" });
  y += splitC1.length * 4.5 + 3;

  const c2 = `CONSIDERANDO os termos da Portaria nº ${d.numeroPortariaDelegacao} - GP/Fuern, de ${dataDelegacaoExtenso}, que delega poderes para a concessão de diárias;`;
  const splitC2 = doc.splitTextToSize(c2, 170);
  doc.text(splitC2, 20, y, { align: "justify" });
  y += splitC2.length * 4.5 + 3;

  const c3 = `CONSIDERANDO o que consta nos autos do Processo nº ${d.numeroProcessoSei},`;
  doc.text(c3, 20, y);
  y += 10;

  // RESOLVE
  doc.setFont("helvetica", "bold");
  doc.text("R E S O L V E:", 105, y, { align: "center" });
  y += 8;

  // Art. 1º
  doc.setFont("helvetica", "normal");
  const rota = `${d.sedeCidade}-${d.sedeEstado} x ${d.municipioDestino}-${d.destinoEstado} x ${d.sedeCidade}-${d.sedeEstado}`;
  const periodo = formatarPeriodoDias(d.saidaSede, d.chegadaSede);
  const valorUnitario = `${formatarMoeda(d.valorUnitarioCentavos, "BRL")} (${valorPorExtenso(d.valorUnitarioCentavos)})`;
  const valorTotal = `${formatarMoeda(d.valorTotalCentavos, "BRL")} (${valorPorExtenso(d.valorTotalCentavos)})`;

  const art1 = `Art. 1º Conceder ${clausulaBeneficiario(d.beneficiario)}, ${diariasPorExtenso(d.diarias)} diária(s), no valor unitário de ${valorUnitario}, totalizando o valor de ${valorTotal}, referente à viagem ${rota}, no(s) dia(s) ${periodo}, com a finalidade de ${d.finalidade}, conforme descrito na Proposta de Concessão de Diárias (ID ${d.idPropostaConcessao}).`;
  const splitArt1 = doc.splitTextToSize(art1, 170);
  doc.text(splitArt1, 20, y, { align: "justify" });
  y += splitArt1.length * 4.5 + 4;

  // Art. 2º
  const art2 = "Art. 2º Esta portaria entra em vigor nesta data.";
  doc.text(art2, 20, y);
  y += 10;

  doc.text(`Em ${formatarDataPorExtenso(d.portariaData)}.`, 105, y, { align: "center" });
  y += 18;

  // Assinantes
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(d.assinante1Nome.toUpperCase(), 105, y, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(d.assinante1Cargo, 105, y + 4, { align: "center" });
  y += 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(d.assinante2Nome.toUpperCase(), 105, y, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(d.assinante2Cargo, 105, y + 4, { align: "center" });

  // Rodapé de Autenticação Digital Oficial PROAD
  const pageHeight = 297;
  const yFoot = pageHeight - 12;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(15, yFoot - 2, 195, yFoot - 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text("DOCUMENTO AUTENTICADO DIGITALMENTE — ECOSSISTEMA PROAD / UERN", 15, yFoot + 1);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  doc.text("Confira a autenticidade deste documento público em: https://pca-uern.vercel.app/verificar/", 15, yFoot + 4.5);

  doc.text(`HASH: SHA256-DIARIA-${d.portariaNumero}-${anoPortaria} • Pág. 1 de 1`, 195, yFoot + 4.5, { align: "right" });

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
