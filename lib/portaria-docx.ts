/**
 * Geração do .docx da portaria de concessão de diária, para download pelo
 * admin e posterior tramitação/assinatura no SEI.
 *
 * A estrutura e o texto fixo replicam fielmente o modelo real (Portaria nº
 * 3785/2026-GP/FUERN, processo SEI 04410039.001276/2026-07): cabeçalho,
 * ementa, considerandos, "RESOLVE", Art. 1º/2º e bloco de assinaturas. O
 * bloco de assinatura eletrônica do SEI (selo, QR code, código verificador)
 * NÃO é reproduzido aqui — é o próprio SEI que o adiciona quando o
 * documento é efetivamente assinado; este .docx é o rascunho levado à
 * assinatura, não o documento já assinado.
 *
 * Nenhum valor jurídico é inventado: tudo que varia por pedido/configuração
 * vem de `DadosPortariaDiaria`, preenchido pelo chamador a partir do banco.
 * Escopo: apenas portaria de Diária (ver decisão registrada nas tarefas).
 */
import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx";
import { formatarCpf, formatarDataPorExtenso, formatarMoeda } from "./formato";
import { diariasPorExtenso, valorPorExtenso } from "./numero-extenso";

export interface DadosPortariaDiaria {
  /** Só o número sequencial (ex.: "3785") — digitado manualmente pelo admin, sem contador automático. */
  portariaNumero: string;
  portariaData: Date;

  /** Vem do processo SEI do pedido (digitado manualmente, nunca derivado do id interno). */
  numeroProcessoSei: string;
  /** ID da Proposta de Concessão de Diárias em outro sistema (digitado manualmente). */
  idPropostaConcessao: string;

  /** Ex.: "3674/2025" — número da portaria de delegação de poderes vigente, fixo em Configurações. */
  numeroPortariaDelegacao: string;
  dataPortariaDelegacao: Date;

  assinante1Nome: string;
  assinante1Cargo: string;
  assinante2Nome: string;
  assinante2Cargo: string;

  beneficiario: {
    nome: string;
    cpf: string;
    /** null quando o beneficiário é Agente Colaborador (externo, sem vínculo funcional). */
    matricula: string | null;
    cargo: string | null;
  };

  diarias: number;
  valorUnitarioCentavos: number;
  valorTotalCentavos: number;

  sedeCidade: string;
  sedeEstado: string;
  municipioDestino: string;
  destinoEstado: string;
  saidaSede: Date;
  chegadaSede: Date;

  finalidade: string;
}

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
    return `ao servidor ${b.cargo} ${b.nome}, matrícula n° ${b.matricula}`;
  }
  return `ao Agente Colaborador ${b.nome}, CPF nº ${formatarCpf(b.cpf)}`;
}

function montarArt1(d: DadosPortariaDiaria): string {
  const rota = `${d.sedeCidade}-${d.sedeEstado} x ${d.municipioDestino}-${d.destinoEstado} x ${d.sedeCidade}-${d.sedeEstado}`;
  const periodo = formatarPeriodoDias(d.saidaSede, d.chegadaSede);
  const valorUnitario = `${formatarMoeda(d.valorUnitarioCentavos, "BRL")} (${valorPorExtenso(d.valorUnitarioCentavos)})`;
  const valorTotal = `${formatarMoeda(d.valorTotalCentavos, "BRL")} (${valorPorExtenso(d.valorTotalCentavos)})`;

  return (
    `Art. 1° Conceder ${clausulaBeneficiario(d.beneficiario)}, ${diariasPorExtenso(d.diarias)} diária(s), ` +
    `no valor unitário de ${valorUnitario}, totalizando o valor de ${valorTotal}, ` +
    `referente à viagem ${rota}, no(s) dia(s) ${periodo}, com a finalidade de ${d.finalidade}, ` +
    `conforme descrito na Proposta de Concessão de Diárias (ID ${d.idPropostaConcessao}).`
  );
}

function paragrafo(texto: string, opts?: { negrito?: boolean; alinhamento?: (typeof AlignmentType)[keyof typeof AlignmentType]; espacoDepois?: number }): Paragraph {
  return new Paragraph({
    alignment: opts?.alinhamento ?? AlignmentType.JUSTIFIED,
    spacing: { after: opts?.espacoDepois ?? 200 },
    children: [new TextRun({ text: texto, bold: opts?.negrito ?? false })],
  });
}

export async function gerarPortariaDiariaDocx(d: DadosPortariaDiaria): Promise<Buffer> {
  const anoPortaria = d.portariaData.getFullYear();
  const numeroCompleto = `${d.portariaNumero}/${anoPortaria}-GP/FUERN`;
  const dataPortariaExtensoCaps = formatarDataPorExtenso(d.portariaData).toUpperCase();
  const dataDelegacaoExtenso = formatarDataPorExtenso(d.dataPortariaDelegacao);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Times New Roman", size: 24 },
        },
      },
    },
    sections: [
      {
        children: [
          paragrafo("FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - FUERN", {
            negrito: true,
            alinhamento: AlignmentType.CENTER,
            espacoDepois: 0,
          }),
          paragrafo("GABINETE DO PRESIDENTE", { alinhamento: AlignmentType.CENTER, espacoDepois: 200 }),
          paragrafo(`PORTARIA Nº ${numeroCompleto} DE ${dataPortariaExtensoCaps}`, {
            negrito: true,
            alinhamento: AlignmentType.CENTER,
            espacoDepois: 200,
          }),
          paragrafo("Concede diária", { negrito: true, alinhamento: AlignmentType.RIGHT, espacoDepois: 300 }),

          paragrafo(
            "CONSIDERANDO os termos do Decreto Estadual n° 29.444, de 7 de janeiro de 2020, que dispõe sobre as " +
              "indenizações previstas no art. 57, I a III, da Lei Complementar n.º 122, de 30 de junho de 1994, e dá outras providências;",
          ),
          paragrafo(
            `CONSIDERANDO os termos da Portaria nº ${d.numeroPortariaDelegacao} - GP/Fuern, de ${dataDelegacaoExtenso}, ` +
              "que delega poderes para a concessão de diárias;",
          ),
          paragrafo(`CONSIDERANDO o que consta nos autos do Processo n° ${d.numeroProcessoSei},`, { espacoDepois: 300 }),

          paragrafo("R E S O L V E:", { alinhamento: AlignmentType.CENTER, espacoDepois: 300 }),

          paragrafo(montarArt1(d), { espacoDepois: 200 }),
          paragrafo("Art. 2° Esta portaria entra em vigor nesta data.", { espacoDepois: 400 }),

          paragrafo(`Em ${formatarDataPorExtenso(d.portariaData)}.`, {
            alinhamento: AlignmentType.CENTER,
            espacoDepois: 400,
          }),

          paragrafo(d.assinante1Nome.toUpperCase(), { negrito: true, alinhamento: AlignmentType.CENTER, espacoDepois: 0 }),
          paragrafo(d.assinante1Cargo.toUpperCase(), { alinhamento: AlignmentType.CENTER, espacoDepois: 400 }),

          paragrafo(d.assinante2Nome.toUpperCase(), { negrito: true, alinhamento: AlignmentType.CENTER, espacoDepois: 0 }),
          paragrafo(d.assinante2Cargo.toUpperCase(), { alinhamento: AlignmentType.CENTER, espacoDepois: 0 }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
