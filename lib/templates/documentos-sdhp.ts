import {
  Document,
  Table,
  TableRow,
  AlignmentType,
  WidthType,
  Packer,
} from "docx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  criarCabecalhoDocxSdhp,
  criarRodapeDocxSdhp,
  desenharCabecalhoPdfSdhp,
  desenharRodapePdfSdhp,
  criarTituloSecaoDocx,
  criarParagrafoDocx,
  celulaTopoDocx,
  celulaCorpoDocx,
  criarBlocoAssinaturaDocx,
} from "./cabecalho-uern";
import {
  formatarCpf,
  formatarDataHora,
  formatarDataPorExtenso,
  formatarDiarias,
  formatarMoeda,
} from "../formato";

export interface DadosCompletosViagemSdhp {
  viagemId: string;
  numeroProcessoSei: string | null;
  idDocumentoSei: string | null;
  criadoEm: Date;
  retificadaEm: Date | null;

  fontePagadora: string;
  detalhamentoFonte: string | null;
  tipoTransporte: string;
  tipoTransporteOutro: string | null;
  chefiaNome: string;
  chefiaCargo: string;
  justificativaFimDeSemanaFeriado: string | null;
  observacoesSolicitacao: string | null;
  acompanhaReitorVice: boolean;
  viagemVinculadaFg: boolean;

  unidadeSolicitante: {
    nome: string;
    email: string;
  };

  beneficiario: {
    nome: string;
    cpf: string;
    matricula: string | null;
    cargo: string | null;
    categoriaNome: string;
    banco: string;
    agencia: string;
    contaCorrente: string;
    dataNascimento: string | null;
    rg: string | null;
    passaporte: string | null;
    telefone: string | null;
    email: string | null;
    portariaFg: string | null;
    enderecoCompleto: string | null;
    // eSocial
    nisPisPasep: string | null;
    servidorOutroOrgao: boolean;
    estadoCivil: string | null;
    sexo: string | null;
    grauInstrucao: string | null;
    racaCor: string | null;
    paisNascimento: string | null;
    paisNacionalidade: string | null;
    tipoLogradouro: string | null;
    logradouro: string | null;
    numeroEndereco: string | null;
    complementoEndereco: string | null;
    bairroEndereco: string | null;
    cepEndereco: string | null;
    municipioUfEndereco: string | null;
    ocupacaoCurso: string | null;
  };

  roteiro: {
    sedeCidade: string;
    sedeEstado: string;
    municipioDestino: string;
    destinoEstado: string;
    kmDeclarado: number;
    vaiBuscarAeroporto: boolean;
    kmSedeAeroporto: number | null;
    kmVoo: number | null;
    kmAeroportoDestino: number | null;
    saidaSede: Date;
    chegadaDestino: Date;
    saidaDestino: Date;
    chegadaSede: Date;
    finalidade: string;
  };

  atividades: Array<{
    categoria: string;
    enquadramentoNome: string;
    descricao: string;
    detalhamento: string | null;
    dataHoraInicio: Date;
    dataHoraFim: Date;
    anexosNomes: string[];
  }>;

  pedidoDiaria: {
    id: string;
    sequencialFormatado: string;
    sequencialNumero: number;
    sequencialAno: number;
    tipoDestinoNome: string;
    noites: number | null;
    diarias: number | null;
    valorUnitarioCentavos: number | null;
    valorTotalCentavos: number | null;
    valorComplementarCentavos: number | null;
    valorDevolucaoCentavos: number | null;
    justificativaPrazoCurto: string | null;
    justificativaGestorAtividade: string | null;
    portariaNumero: string | null;
    portariaData: Date | null;
    idPropostaConcessao: string | null;
    relatorioBaseLegal: string | null;
    relatorioDescricaoAtividades: string | null;
    relatorioResultado: string | null;
    relatorioJustificativaResultado: string | null;
    relatorioJustificativaRetornoAntecipado: string | null;
    relatorioAnexosDescricao: string | null;
  } | null;

  pedidoPassagemAerea: {
    id: string;
    sequencialFormatado: string;
    sequencialNumero: number;
    sequencialAno: number;
    empresaNome: string;
    numeroContrato: string;
    valorTotalCentavos: number | null;
    justificativaPrazoCurto: string | null;
    periodoSaida: string;
    periodoRetorno: string;
    ordemServicoNumero: string | null;
    bilheteLocalizador: string | null;
    relatorioDescricaoAtividades: string | null;
    relatorioResultado: string | null;
  } | null;

  pedidoHospedagem: {
    id: string;
    sequencialFormatado: string;
    sequencialNumero: number;
    sequencialAno: number;
    empresaNome: string;
    numeroContrato: string;
    valorTotalCentavos: number | null;
    justificativaPrazoCurto: string | null;
    almocoIncluido: boolean;
    almocoQtdDias: number | null;
    jantarIncluido: boolean;
    jantarQtdDias: number | null;
    tipoApartamento: string;
    enderecoBeneficiario: string | null;
    ordemServicoNumero: string | null;
    relatorioDescricaoAtividades: string | null;
    relatorioResultado: string | null;
  } | null;

  ultimaAlteracao: {
    id: string;
    motivo: string;
    createdAt: Date;
    solicitadoPorNome: string;
    saidaSedeAnterior: Date;
    chegadaDestinoAnterior: Date;
    saidaDestinoAnterior: Date;
    chegadaSedeAnterior: Date;
    saidaSedeNova: Date;
    chegadaDestinoNova: Date;
    saidaDestinoNova: Date;
    chegadaSedeNova: Date;
    diariasAnteriores: number | null;
    diariasNovas: number | null;
    valorAnteriorCentavos: number | null;
    valorNovoCentavos: number | null;
    diferencaCentavos: number | null;
  } | null;
}

function formatarDataCurta(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatarHoraCurta(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}h`;
}

export function formatarFontePagadoraTexto(
  fonte: string,
  detalhamento?: string | null,
): string {
  const mapa: Record<string, string> = {
    FONTE_0500: "Fonte 0.500 — Recursos Ordinários do Tesouro",
    ORCAMENTO_PARTICIPATIVO:
      "Orçamento Participativo (OP) — Com ciência e anuência da Direção da Unidade",
    FONTE_0501:
      "Fonte 0.501 — Recursos Próprios Diretamente Arrecadados",
    CONVENIO_FEDERAL:
      "Convênio Federal — Decreto Federal nº 5.992/2006 c/c Decreto nº 11.872/2023 (POP 04)",
    DISPENSADO_GESTAO:
      "Unidade da Gestão Superior (Reitoria, Pró-Reitoria, Diretoria ou Assessoria — Dispensada de indicar fonte)",
    OUTROS: "Outra Fonte Orçamentária",
  };
  const rotulo = mapa[fonte] || fonte || "Fonte 0.500 — Recursos Ordinários";
  return detalhamento ? `${rotulo} (${detalhamento})` : rotulo;
}

function montarObservacoesol(d: DadosCompletosViagemSdhp): string {
  const partes: string[] = [];
  if (d.justificativaFimDeSemanaFeriado) {
    partes.push(
      `[Justificativa Sexta-Feira / Fim de Semana / Feriado - Art. 6º, VIII e Art. 17, § 1º Decreto nº 29.444/2020]: ${d.justificativaFimDeSemanaFeriado}`,
    );
  }
  const justPrazo =
    d.pedidoDiaria?.justificativaPrazoCurto ||
    d.pedidoPassagemAerea?.justificativaPrazoCurto ||
    d.pedidoHospedagem?.justificativaPrazoCurto;
  if (justPrazo) {
    partes.push(
      `[Justificativa de Solicitação Fora do Prazo Mínimo - Art. 6º, IX Decreto nº 29.444/2020]: ${justPrazo}`,
    );
  }
  if (d.pedidoDiaria?.justificativaGestorAtividade) {
    partes.push(
      `[Justificativa do Gestor para Folga de Atividade]: ${d.pedidoDiaria.justificativaGestorAtividade}`,
    );
  }
  if (d.acompanhaReitorVice) {
    partes.push(
      "[Enquadramento Especial - Nota 3 da Portaria nº 1454/2023-GP/FUERN]: Servidor formalmente designado para acompanhar Reitor(a) ou Vice-Reitor(a), fazendo jus a diária de Classe I.",
    );
  }
  if (d.observacoesSolicitacao) {
    partes.push(d.observacoesSolicitacao);
  }
  return partes.join("\n") || "Sem observações adicionais.";
}

export function obterSequenciaisOriginaisLista(d: DadosCompletosViagemSdhp): string[] {
  const lista: string[] = [];
  if (d.pedidoDiaria?.sequencialFormatado) lista.push(d.pedidoDiaria.sequencialFormatado);
  if (d.pedidoPassagemAerea?.sequencialFormatado)
    lista.push(d.pedidoPassagemAerea.sequencialFormatado);
  if (d.pedidoHospedagem?.sequencialFormatado) lista.push(d.pedidoHospedagem.sequencialFormatado);
  return lista;
}

// ============================================================================
// TEMPLATE 1: FORMULÁRIO DE SOLICITAÇÃO DE DIÁRIAS (2023) — .DOCX e .PDF
// ============================================================================

export async function gerarFormularioSolicitacaoDiariaDocx(
  d: DadosCompletosViagemSdhp,
): Promise<Buffer> {
  const seqTexto =
    d.pedidoDiaria?.sequencialFormatado ||
    `Solicitação de Diárias nº 001/${d.criadoEm.getFullYear()} - SDHP/PROAD/UERN`;
  const codVerif = `SDHP-SD-${d.pedidoDiaria?.sequencialAno ?? d.criadoEm.getFullYear()}-${String(d.pedidoDiaria?.sequencialNumero ?? 1).padStart(3, "0")}`;
  const percurso = `${d.roteiro.sedeCidade}-${d.roteiro.sedeEstado} x ${d.roteiro.municipioDestino}-${d.roteiro.destinoEstado} x ${d.roteiro.sedeCidade}-${d.roteiro.sedeEstado}`;
  const resumoAtiv =
    d.atividades.map((a) => `${a.enquadramentoNome}: ${a.descricao}`).join("; ") ||
    d.roteiro.finalidade;
  const qtdValor = d.pedidoDiaria
    ? `${formatarDiarias(d.pedidoDiaria.diarias)} (${d.pedidoDiaria.valorTotalCentavos != null ? formatarMoeda(d.pedidoDiaria.valorTotalCentavos, "BRL") : "—"})`
    : "—";

  const tabelaDadosPessoais = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          celulaTopoDocx("Nº", 4),
          celulaTopoDocx("NOME COMPLETO", 20),
          celulaTopoDocx("MAT.", 9),
          celulaTopoDocx("DATA DE NASCIM.", 10),
          celulaTopoDocx("CARGO / FUNÇÃO / LOTAÇÃO", 17),
          celulaTopoDocx("PORTARIA FG", 10),
          celulaTopoDocx("CPF", 12),
          celulaTopoDocx("DOMICÍLIO BANCÁRIO (BANCO | AGÊNCIA c/ dígito | C/C)", 18),
        ],
      }),
      new TableRow({
        children: [
          celulaCorpoDocx("1", AlignmentType.CENTER, true),
          celulaCorpoDocx(d.beneficiario.nome, AlignmentType.LEFT, true),
          celulaCorpoDocx(d.beneficiario.matricula || "Externo", AlignmentType.CENTER),
          celulaCorpoDocx(d.beneficiario.dataNascimento || "—", AlignmentType.CENTER),
          celulaCorpoDocx(
            `${d.beneficiario.cargo || d.beneficiario.categoriaNome} / ${d.unidadeSolicitante.nome}`,
          ),
          celulaCorpoDocx(d.beneficiario.portariaFg || "—", AlignmentType.CENTER),
          celulaCorpoDocx(formatarCpf(d.beneficiario.cpf), AlignmentType.CENTER),
          celulaCorpoDocx(
            `${d.beneficiario.banco} | Ag. ${d.beneficiario.agencia} | C/C ${d.beneficiario.contaCorrente}`,
          ),
        ],
      }),
    ],
  });

  const tabelaViagem = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          celulaTopoDocx("Nº", 4),
          celulaTopoDocx("DESTINO (Locais: Saída / Destino / Retorno)", 24),
          celulaTopoDocx("RESUMO DA ATIVIDADE", 26),
          celulaTopoDocx("DATA DE SAÍDA", 10),
          celulaTopoDocx("HORÁRIO DE SAÍDA", 9),
          celulaTopoDocx("DATA DE RETORNO", 10),
          celulaTopoDocx("HORÁRIO DE CHEGADA (Previsão)", 9),
          celulaTopoDocx("QUANTIDADE DE DIÁRIAS", 8),
        ],
      }),
      new TableRow({
        children: [
          celulaCorpoDocx("1", AlignmentType.CENTER, true),
          celulaCorpoDocx(percurso, AlignmentType.LEFT, true),
          celulaCorpoDocx(resumoAtiv),
          celulaCorpoDocx(formatarDataCurta(d.roteiro.saidaSede), AlignmentType.CENTER),
          celulaCorpoDocx(formatarHoraCurta(d.roteiro.saidaSede), AlignmentType.CENTER),
          celulaCorpoDocx(formatarDataCurta(d.roteiro.chegadaSede), AlignmentType.CENTER),
          celulaCorpoDocx(formatarHoraCurta(d.roteiro.chegadaSede), AlignmentType.CENTER),
          celulaCorpoDocx(qtdValor, AlignmentType.CENTER, true),
        ],
      }),
    ],
  });

  const tabelaContato = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          celulaTopoDocx("Nº", 6),
          celulaTopoDocx("NOME", 44),
          celulaTopoDocx("TELEFONE / WHATSAPP", 25),
          celulaTopoDocx("E-MAIL", 25),
        ],
      }),
      new TableRow({
        children: [
          celulaCorpoDocx("1", AlignmentType.CENTER, true),
          celulaCorpoDocx(d.beneficiario.nome),
          celulaCorpoDocx(d.beneficiario.telefone || "—", AlignmentType.CENTER),
          celulaCorpoDocx(d.beneficiario.email || d.unidadeSolicitante.email),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        headers: { default: criarCabecalhoDocxSdhp(seqTexto) },
        footers: { default: criarRodapeDocxSdhp(seqTexto, codVerif) },
        children: [
          criarParagrafoDocx(
            `Processo Administrativo SEI nº: ${d.numeroProcessoSei || "A vincular na abertura do processo SEI"}   •   Unidade Solicitante: ${d.unidadeSolicitante.nome}`,
            { bold: true, size: 17, color: "003366" },
          ),
          criarParagrafoDocx(
            "Ao Setor de Diárias, Hospedagens e Passagens - SDHP/DAS/PROAD/UERN\nSr(a). Chefe do SDHP,",
            { bold: true },
          ),
          criarParagrafoDocx(
            "Solicitamos a V.Sa. autorizar a emissão da Proposta de Concessão de Diária - PCD para o(a)(s) servidor(a)(s) abaixo identificado(a)(s), objetivando a realização de serviço/participação em evento fora do local de trabalho, conforme informamos a seguir:",
          ),
          criarTituloSecaoDocx("1. DADOS PESSOAIS DO(A)(S) BENEFICIÁRIO(A)(S)"),
          tabelaDadosPessoais,
          criarTituloSecaoDocx("2. INFORMAÇÕES SOBRE A VIAGEM"),
          tabelaViagem,
          criarTituloSecaoDocx("3. INFORMAÇÕES PARA CONTATO"),
          tabelaContato,
          criarTituloSecaoDocx("4. FONTE PAGADORA DA DESPESA"),
          criarParagrafoDocx(formatarFontePagadoraTexto(d.fontePagadora, d.detalhamentoFonte)),
          criarTituloSecaoDocx(
            "5. OBSERVAÇÃO (Justificar viagem iniciando em sexta-feira, feriado ou final de semana, pedido fora do prazo, outros)",
          ),
          criarParagrafoDocx(montarObservacoesol(d)),
          criarParagrafoDocx("Atenciosamente,", { after: 40 }),
          ...criarBlocoAssinaturaDocx(
            d.chefiaNome || `Chefia Imediata — ${d.unidadeSolicitante.nome}`,
            d.chefiaCargo || `Chefia Imediata / Responsável pela Unidade (${d.unidadeSolicitante.nome})`,
            "Assinatura digital do(a) chefe imediato(a) — Vedada a auto-solicitação pelo próprio beneficiário",
            `${d.roteiro.sedeCidade}-${d.roteiro.sedeEstado}, ${formatarDataPorExtenso(d.criadoEm)} (datado eletronicamente).`,
          ),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

export function gerarFormularioSolicitacaoDiariaPdf(
  d: DadosCompletosViagemSdhp,
): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const seqTexto =
    d.pedidoDiaria?.sequencialFormatado ||
    `Solicitação de Diárias nº 001/${d.criadoEm.getFullYear()} - SDHP/PROAD/UERN`;
  const codVerif = `SDHP-SD-${d.pedidoDiaria?.sequencialAno ?? d.criadoEm.getFullYear()}-${String(d.pedidoDiaria?.sequencialNumero ?? 1).padStart(3, "0")}`;

  let y = desenharCabecalhoPdfSdhp(
    doc,
    seqTexto,
    `Processo SEI nº: ${d.numeroProcessoSei || "A vincular"} • Unidade Demandante: ${d.unidadeSolicitante.nome}`,
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Ao Setor de Diárias, Hospedagens e Passagens - SDHP/DAS/PROAD/UERN", 14, y);
  y += 4;
  doc.text("Sr(a). Chefe do SDHP,", 14, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  const intro = doc.splitTextToSize(
    "Solicitamos a V.Sa. autorizar a emissão da Proposta de Concessão de Diária - PCD para o(a)(s) servidor(a)(s) abaixo identificado(a)(s), objetivando a realização de serviço/participação em evento fora do local de trabalho, conforme informamos a seguir:",
    182,
  );
  doc.text(intro, 14, y);
  y += intro.length * 4 + 2;

  // Tabela 1: Dados Pessoais
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [
      [
        "Nº",
        "NOME COMPLETO",
        "MAT.",
        "DATA NASC.",
        "CARGO / FUNÇÃO / LOTAÇÃO",
        "PORTARIA FG",
        "CPF",
        "DOMICÍLIO BANCÁRIO\n(BANCO | AG. c/ díg. | C/C)",
      ],
    ],
    body: [
      [
        "1",
        d.beneficiario.nome,
        d.beneficiario.matricula || "Externo",
        d.beneficiario.dataNascimento || "—",
        `${d.beneficiario.cargo || d.beneficiario.categoriaNome}\n(${d.unidadeSolicitante.nome})`,
        d.beneficiario.portariaFg || "—",
        formatarCpf(d.beneficiario.cpf),
        `${d.beneficiario.banco}\nAg: ${d.beneficiario.agencia}\nC/C: ${d.beneficiario.contaCorrente}`,
      ],
    ],
    styles: { fontSize: 7, cellPadding: 2, valign: "middle" },
    headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold", halign: "center" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 5;

  const percurso = `${d.roteiro.sedeCidade}-${d.roteiro.sedeEstado} x ${d.roteiro.municipioDestino}-${d.roteiro.destinoEstado} x ${d.roteiro.sedeCidade}-${d.roteiro.sedeEstado}`;
  const resumoAtiv =
    d.atividades.map((a) => `${a.enquadramentoNome}: ${a.descricao}`).join("; ") ||
    d.roteiro.finalidade;
  const qtdValor = d.pedidoDiaria
    ? `${formatarDiarias(d.pedidoDiaria.diarias)}\n(${d.pedidoDiaria.valorTotalCentavos != null ? formatarMoeda(d.pedidoDiaria.valorTotalCentavos, "BRL") : "—"})`
    : "—";

  // Tabela 2: Informações sobre a viagem
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [
      [
        "Nº",
        "DESTINO\n(Locais: Saída / Destino / Retorno)",
        "RESUMO DA ATIVIDADE",
        "DATA DE SAÍDA",
        "HORÁRIO DE SAÍDA",
        "DATA DE RETORNO",
        "HORÁRIO DE CHEGADA (Prev.)",
        "QTD. DE DIÁRIAS",
      ],
    ],
    body: [
      [
        "1",
        `${percurso}\n(${d.roteiro.kmDeclarado} km)`,
        resumoAtiv,
        formatarDataCurta(d.roteiro.saidaSede),
        formatarHoraCurta(d.roteiro.saidaSede),
        formatarDataCurta(d.roteiro.chegadaSede),
        formatarHoraCurta(d.roteiro.chegadaSede),
        qtdValor,
      ],
    ],
    styles: { fontSize: 7.2, cellPadding: 2, valign: "middle" },
    headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold", halign: "center" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 5;

  // Tabela 3: Informações para contato
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Nº", "NOME DO BENEFICIÁRIO", "TELEFONE / WHATSAPP", "E-MAIL PARA CONTATO"]],
    body: [
      [
        "1",
        d.beneficiario.nome,
        d.beneficiario.telefone || "—",
        d.beneficiario.email || d.unidadeSolicitante.email,
      ],
    ],
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 5;

  // Fonte Pagadora e Observação
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["FONTE PAGADORA DA DESPESA (Fonte 0.500, Orçamento Participativo, Fonte 0.501, Convênio, outros)"]],
    body: [[formatarFontePagadoraTexto(d.fontePagadora, d.detalhamentoFonte)]],
    styles: { fontSize: 7.8, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 4;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [
      [
        "OBSERVAÇÃO (Justificar viagem iniciando em sexta-feira, feriado ou final de semana, pedido fora do prazo, outros)",
      ],
    ],
    body: [[montarObservacoesol(d)]],
    styles: { fontSize: 7.8, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  if (y > 250) {
    doc.addPage();
    y = 25;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("Atenciosamente,", 14, y);
  doc.text(
    `${d.roteiro.sedeCidade}-${d.roteiro.sedeEstado}, ${formatarDataPorExtenso(d.criadoEm)} (datado eletronicamente).`,
    196,
    y,
    { align: "right" },
  );
  y += 14;

  doc.setDrawColor(100, 100, 100);
  doc.line(60, y, 150, y);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text(
    (d.chefiaNome || `Chefia Imediata — ${d.unidadeSolicitante.nome}`).toUpperCase(),
    105,
    y,
    { align: "center" },
  );
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.text(
    d.chefiaCargo || `Chefia Imediata / Responsável pela Unidade (${d.unidadeSolicitante.nome})`,
    105,
    y,
    { align: "center" },
  );

  desenharRodapePdfSdhp(doc, seqTexto, codVerif);
  return Buffer.from(doc.output("arraybuffer"));
}

// ============================================================================
// TEMPLATE 2: FORMULÁRIO DE SOLICITAÇÃO DE PASSAGENS AÉREAS (2025) — .DOCX e .PDF
// ============================================================================

const PERIODO_VOO_LABEL: Record<string, string> = {
  MADRUGADA: "Madrugada (00h às 06h)",
  MANHA: "Manhã (06h às 12h)",
  TARDE: "Tarde (12h às 18h)",
  NOITE: "Noite (18h às 24h)",
};

export async function gerarFormularioSolicitacaoPassagemDocx(
  d: DadosCompletosViagemSdhp,
): Promise<Buffer> {
  const seqTexto =
    d.pedidoPassagemAerea?.sequencialFormatado ||
    `Solicitação de Passagens Aéreas nº 001/${d.criadoEm.getFullYear()} - SDHP/PROAD/UERN`;
  const codVerif = `SDHP-SPA-${d.pedidoPassagemAerea?.sequencialAno ?? d.criadoEm.getFullYear()}-${String(d.pedidoPassagemAerea?.sequencialNumero ?? 1).padStart(3, "0")}`;
  const percurso = `${d.roteiro.sedeCidade}-${d.roteiro.sedeEstado} / ${d.roteiro.municipioDestino}-${d.roteiro.destinoEstado} / ${d.roteiro.sedeCidade}-${d.roteiro.sedeEstado}`;

  const tabelaPassageiro = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          celulaTopoDocx("Nº", 4),
          celulaTopoDocx("NOME COMPLETO", 22),
          celulaTopoDocx("MATRÍCULA (Servidor UERN)", 11),
          celulaTopoDocx("DATA DE NASCIMENTO", 11),
          celulaTopoDocx("R.G.", 10),
          celulaTopoDocx("C.P.F.", 12),
          celulaTopoDocx("PASSAPORTE (caso possua)", 10),
          celulaTopoDocx("E-MAIL(S) PARA CONTATO", 10),
          celulaTopoDocx("TELEFONE(S) PARA CONTATO", 10),
        ],
      }),
      new TableRow({
        children: [
          celulaCorpoDocx("1", AlignmentType.CENTER, true),
          celulaCorpoDocx(d.beneficiario.nome, AlignmentType.LEFT, true),
          celulaCorpoDocx(d.beneficiario.matricula || "Colaborador", AlignmentType.CENTER),
          celulaCorpoDocx(d.beneficiario.dataNascimento || "—", AlignmentType.CENTER),
          celulaCorpoDocx(d.beneficiario.rg || "—", AlignmentType.CENTER),
          celulaCorpoDocx(formatarCpf(d.beneficiario.cpf), AlignmentType.CENTER),
          celulaCorpoDocx(d.beneficiario.passaporte || "—", AlignmentType.CENTER),
          celulaCorpoDocx(d.beneficiario.email || d.unidadeSolicitante.email),
          celulaCorpoDocx(d.beneficiario.telefone || "—", AlignmentType.CENTER),
        ],
      }),
    ],
  });

  const pSaida = d.pedidoPassagemAerea?.periodoSaida || "MANHA";
  const pRetorno = d.pedidoPassagemAerea?.periodoRetorno || "NOITE";

  const tabelaTrechos = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          celulaTopoDocx("Nº", 5),
          celulaTopoDocx("ORIGEM / DESTINO (Local de Saída / Destino / Retorno)", 35),
          celulaTopoDocx("DATA DE SAÍDA", 14),
          celulaTopoDocx("PERÍODO DE SAÍDA (Madrugada / Manhã / Tarde / Noite)", 16),
          celulaTopoDocx("DATA DE RETORNO", 14),
          celulaTopoDocx("PERÍODO DE RETORNO (Madrugada / Manhã / Tarde / Noite)", 16),
        ],
      }),
      new TableRow({
        children: [
          celulaCorpoDocx("1", AlignmentType.CENTER, true),
          celulaCorpoDocx(percurso, AlignmentType.LEFT, true),
          celulaCorpoDocx(formatarDataCurta(d.roteiro.saidaSede), AlignmentType.CENTER),
          celulaCorpoDocx(PERIODO_VOO_LABEL[pSaida] || pSaida, AlignmentType.CENTER),
          celulaCorpoDocx(formatarDataCurta(d.roteiro.saidaDestino), AlignmentType.CENTER),
          celulaCorpoDocx(PERIODO_VOO_LABEL[pRetorno] || pRetorno, AlignmentType.CENTER),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        headers: { default: criarCabecalhoDocxSdhp(seqTexto) },
        footers: { default: criarRodapeDocxSdhp(seqTexto, codVerif) },
        children: [
          criarParagrafoDocx(
            `${d.roteiro.sedeCidade}-${d.roteiro.sedeEstado}, ${formatarDataPorExtenso(d.criadoEm)}.`,
            { alinhamento: AlignmentType.RIGHT },
          ),
          criarParagrafoDocx(
            `ASSUNTO: Solicitação de Passagem Aérea — ${seqTexto}\nE-mail do setor demandante: ${d.unidadeSolicitante.email}\nProcesso SEI nº: ${d.numeroProcessoSei || "A vincular"}`,
            { bold: true },
          ),
          criarTituloSecaoDocx("1. COMPRA DE PASSAGEM(S) AÉREA(S) — DADOS DO(A) PASSAGEIRO(A)"),
          tabelaPassageiro,
          criarTituloSecaoDocx("2. TRECHOS, DATAS E PERÍODOS DE VOO"),
          tabelaTrechos,
          criarTituloSecaoDocx("3. JUSTIFICATIVA DA VIAGEM"),
          criarParagrafoDocx(
            `${d.roteiro.finalidade}. Atividades programadas: ${d.atividades.map((a) => `${a.enquadramentoNome} (${a.descricao})`).join("; ")}.`,
          ),
          criarTituloSecaoDocx("4. FONTE PAGADORA DA DESPESA"),
          criarParagrafoDocx(
            `${formatarFontePagadoraTexto(d.fontePagadora, d.detalhamentoFonte)}${d.pedidoPassagemAerea ? ` • Contrato Vinculado: ${d.pedidoPassagemAerea.empresaNome} (Contrato nº ${d.pedidoPassagemAerea.numeroContrato})` : ""}`,
          ),
          criarTituloSecaoDocx("5. OBSERVAÇÃO"),
          criarParagrafoDocx(
            `${montarObservacoesol(d)}${d.pedidoDiaria ? `\nVinculado também à ${d.pedidoDiaria.sequencialFormatado}.` : ""}`,
          ),
          ...criarBlocoAssinaturaDocx(
            d.chefiaNome || `Chefia Imediata — ${d.unidadeSolicitante.nome}`,
            d.chefiaCargo || `Chefia Imediata / Responsável pela Unidade (${d.unidadeSolicitante.nome})`,
            "Assinatura digital da chefia imediata",
          ),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

export function gerarFormularioSolicitacaoPassagemPdf(
  d: DadosCompletosViagemSdhp,
): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const seqTexto =
    d.pedidoPassagemAerea?.sequencialFormatado ||
    `Solicitação de Passagens Aéreas nº 001/${d.criadoEm.getFullYear()} - SDHP/PROAD/UERN`;
  const codVerif = `SDHP-SPA-${d.pedidoPassagemAerea?.sequencialAno ?? d.criadoEm.getFullYear()}-${String(d.pedidoPassagemAerea?.sequencialNumero ?? 1).padStart(3, "0")}`;

  let y = desenharCabecalhoPdfSdhp(
    doc,
    seqTexto,
    `Processo SEI nº: ${d.numeroProcessoSei || "A vincular"} • E-mail do Setor Demandante: ${d.unidadeSolicitante.email}`,
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`ASSUNTO: Solicitação de Passagem Aérea (${seqTexto})`, 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${d.roteiro.sedeCidade}-${d.roteiro.sedeEstado}, ${formatarDataPorExtenso(d.criadoEm)}.`,
    196,
    y,
    { align: "right" },
  );
  y += 5;

  // Tabela 1: Passageiro
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [
      [
        "Nº",
        "NOME COMPLETO",
        "MATRÍCULA\n(p/ servidor UERN)",
        "DATA DE NASC.",
        "R.G.",
        "C.P.F.",
        "PASSAPORTE\n(caso possua)",
        "E-MAIL(S) PARA CONTATO",
        "TELEFONE(S)",
      ],
    ],
    body: [
      [
        "1",
        d.beneficiario.nome,
        d.beneficiario.matricula || "Externo",
        d.beneficiario.dataNascimento || "—",
        d.beneficiario.rg || "—",
        formatarCpf(d.beneficiario.cpf),
        d.beneficiario.passaporte || "—",
        d.beneficiario.email || d.unidadeSolicitante.email,
        d.beneficiario.telefone || "—",
      ],
    ],
    styles: { fontSize: 7, cellPadding: 2, valign: "middle" },
    headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold", halign: "center" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 5;

  const percurso = `${d.roteiro.sedeCidade}-${d.roteiro.sedeEstado} / ${d.roteiro.municipioDestino}-${d.roteiro.destinoEstado} / ${d.roteiro.sedeCidade}-${d.roteiro.sedeEstado}`;
  const pSaida = d.pedidoPassagemAerea?.periodoSaida || "MANHA";
  const pRetorno = d.pedidoPassagemAerea?.periodoRetorno || "NOITE";

  // Tabela 2: Trechos e Períodos
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [
      [
        "Nº",
        "ORIGEM / DESTINO\n(Local de Saída / Local de Destino / Local de Retorno)",
        "DATA DE SAÍDA",
        "PERÍODO DE SAÍDA\n(Madrugada/Manhã/Tarde/Noite)",
        "DATA DE RETORNO",
        "PERÍODO DE RETORNO\n(Madrugada/Manhã/Tarde/Noite)",
      ],
    ],
    body: [
      [
        "1",
        percurso,
        formatarDataCurta(d.roteiro.saidaSede),
        PERIODO_VOO_LABEL[pSaida] || pSaida,
        formatarDataCurta(d.roteiro.saidaDestino),
        PERIODO_VOO_LABEL[pRetorno] || pRetorno,
      ],
    ],
    styles: { fontSize: 7.5, cellPadding: 2.5, valign: "middle" },
    headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold", halign: "center" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 5;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["JUSTIFICATIVA DA VIAGEM"]],
    body: [
      [
        `${d.roteiro.finalidade}.\nAtividades programadas: ${d.atividades.map((a) => `${a.enquadramentoNome} (${a.descricao} — ${formatarDataHora(a.dataHoraInicio)} a ${formatarDataHora(a.dataHoraFim)})`).join("; ")}.`,
      ],
    ],
    styles: { fontSize: 7.8, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 4;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["FONTE PAGADORA DA DESPESA"]],
    body: [
      [
        `${formatarFontePagadoraTexto(d.fontePagadora, d.detalhamentoFonte)}${d.pedidoPassagemAerea ? ` • Contrato Vinculado: ${d.pedidoPassagemAerea.empresaNome} (Contrato nº ${d.pedidoPassagemAerea.numeroContrato})` : ""}`,
      ],
    ],
    styles: { fontSize: 7.8, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 4;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["OBSERVAÇÃO"]],
    body: [
      [
        `${montarObservacoesol(d)}${d.pedidoDiaria ? `\nDemanda vinculada também à ${d.pedidoDiaria.sequencialFormatado}.` : ""}`,
      ],
    ],
    styles: { fontSize: 7.8, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 14;

  doc.setDrawColor(100, 100, 100);
  doc.line(60, y, 150, y);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(
    (d.chefiaNome || `Chefia Imediata — ${d.unidadeSolicitante.nome}`).toUpperCase(),
    105,
    y,
    { align: "center" },
  );
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.text(
    d.chefiaCargo || `Assinatura digital da chefia imediata (${d.unidadeSolicitante.nome})`,
    105,
    y,
    { align: "center" },
  );

  desenharRodapePdfSdhp(doc, seqTexto, codVerif);
  return Buffer.from(doc.output("arraybuffer"));
}

// ============================================================================
// TEMPLATE 3: FORMULÁRIO DE SOLICITAÇÃO DE HOSPEDAGEM (2023) — .DOCX e .PDF
// ============================================================================

export async function gerarFormularioSolicitacaoHospedagemDocx(
  d: DadosCompletosViagemSdhp,
): Promise<Buffer> {
  const seqTexto =
    d.pedidoHospedagem?.sequencialFormatado ||
    `Solicitação de Hospedagem nº 001/${d.criadoEm.getFullYear()} - SDHP/PROAD/UERN`;
  const codVerif = `SDHP-SH-${d.pedidoHospedagem?.sequencialAno ?? d.criadoEm.getFullYear()}-${String(d.pedidoHospedagem?.sequencialNumero ?? 1).padStart(3, "0")}`;

  const tabelaHospede = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          celulaTopoDocx("Nº", 5),
          celulaTopoDocx("NOME COMPLETO", 30),
          celulaTopoDocx("MATRÍCULA (se for da UERN)", 15),
          celulaTopoDocx("C.P.F. (ou Doc. Equivalente)", 16),
          celulaTopoDocx("E-MAIL(S) PARA CONTATO", 18),
          celulaTopoDocx("TELEFONE(S) PARA CONTATO", 16),
        ],
      }),
      new TableRow({
        children: [
          celulaCorpoDocx("1", AlignmentType.CENTER, true),
          celulaCorpoDocx(d.beneficiario.nome, AlignmentType.LEFT, true),
          celulaCorpoDocx(d.beneficiario.matricula || "Colaborador Externo", AlignmentType.CENTER),
          celulaCorpoDocx(formatarCpf(d.beneficiario.cpf), AlignmentType.CENTER),
          celulaCorpoDocx(d.beneficiario.email || d.unidadeSolicitante.email),
          celulaCorpoDocx(d.beneficiario.telefone || "—", AlignmentType.CENTER),
        ],
      }),
    ],
  });

  const tabelaCheckin = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          celulaTopoDocx("Nº", 5),
          celulaTopoDocx("ATIVIDADE A DESENVOLVER / JUSTIFICATIVA", 33),
          celulaTopoDocx("CIDADE / ESTADO PARA HOSPEDAGEM", 22),
          celulaTopoDocx("DATA CHECK-IN", 10),
          celulaTopoDocx("HORÁRIO CHECK-IN", 10),
          celulaTopoDocx("DATA CHECK-OUT", 10),
          celulaTopoDocx("HORÁRIO CHECK-OUT", 10),
        ],
      }),
      new TableRow({
        children: [
          celulaCorpoDocx("1", AlignmentType.CENTER, true),
          celulaCorpoDocx(d.roteiro.finalidade),
          celulaCorpoDocx(
            `${d.roteiro.municipioDestino} / ${d.roteiro.destinoEstado}`,
            AlignmentType.CENTER,
            true,
          ),
          celulaCorpoDocx(formatarDataCurta(d.roteiro.chegadaDestino), AlignmentType.CENTER),
          celulaCorpoDocx(formatarHoraCurta(d.roteiro.chegadaDestino), AlignmentType.CENTER),
          celulaCorpoDocx(formatarDataCurta(d.roteiro.saidaDestino), AlignmentType.CENTER),
          celulaCorpoDocx(formatarHoraCurta(d.roteiro.saidaDestino), AlignmentType.CENTER),
        ],
      }),
    ],
  });

  const almocoSim = d.pedidoHospedagem?.almocoIncluido ?? false;
  const jantarSim = d.pedidoHospedagem?.jantarIncluido ?? false;
  const tipoApto = d.pedidoHospedagem?.tipoApartamento || "SIMPLES";

  const tabelaAlimentacao = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          celulaTopoDocx("ALIMENTAÇÃO", 25),
          celulaTopoDocx("SIM", 15),
          celulaTopoDocx("NÃO", 15),
          celulaTopoDocx("QTDADE (DIAS)", 20),
          celulaTopoDocx("TIPO DE APARTAMENTO(S)", 25),
        ],
      }),
      new TableRow({
        children: [
          celulaCorpoDocx("Almoço", AlignmentType.LEFT, true),
          celulaCorpoDocx(almocoSim ? "( X )" : "(   )", AlignmentType.CENTER),
          celulaCorpoDocx(!almocoSim ? "( X )" : "(   )", AlignmentType.CENTER),
          celulaCorpoDocx(
            almocoSim && d.pedidoHospedagem?.almocoQtdDias
              ? `${d.pedidoHospedagem.almocoQtdDias} dia(s)`
              : "—",
            AlignmentType.CENTER,
          ),
          celulaCorpoDocx(
            `${tipoApto === "SIMPLES" ? "[X]" : "[ ]"} SIMPLES   ${tipoApto === "DUPLO" ? "[X]" : "[ ]"} DUPLO   ${tipoApto === "TRIPLO" ? "[X]" : "[ ]"} TRIPLO`,
            AlignmentType.CENTER,
            true,
          ),
        ],
      }),
      new TableRow({
        children: [
          celulaCorpoDocx("Jantar", AlignmentType.LEFT, true),
          celulaCorpoDocx(jantarSim ? "( X )" : "(   )", AlignmentType.CENTER),
          celulaCorpoDocx(!jantarSim ? "( X )" : "(   )", AlignmentType.CENTER),
          celulaCorpoDocx(
            jantarSim && d.pedidoHospedagem?.jantarQtdDias
              ? `${d.pedidoHospedagem.jantarQtdDias} dia(s)`
              : "—",
            AlignmentType.CENTER,
          ),
          celulaCorpoDocx(
            d.pedidoHospedagem
              ? `Contrato: ${d.pedidoHospedagem.empresaNome} (${d.pedidoHospedagem.numeroContrato})`
              : "—",
            AlignmentType.CENTER,
          ),
        ],
      }),
    ],
  });

  const enderecoBenef =
    d.pedidoHospedagem?.enderecoBeneficiario ||
    d.beneficiario.enderecoCompleto ||
    `${d.roteiro.sedeCidade}/${d.roteiro.sedeEstado}`;

  const doc = new Document({
    sections: [
      {
        headers: { default: criarCabecalhoDocxSdhp(seqTexto) },
        footers: { default: criarRodapeDocxSdhp(seqTexto, codVerif) },
        children: [
          criarParagrafoDocx(
            `${d.roteiro.sedeCidade}-RN, ${formatarDataPorExtenso(d.criadoEm)}.`,
            { alinhamento: AlignmentType.RIGHT },
          ),
          criarParagrafoDocx(`ASSUNTO: Solicitação de Hospedagem — ${seqTexto}`, { bold: true }),
          criarParagrafoDocx(
            "Sr.(a) Pró-Reitor(a),\nSolicitamos a Vossa Senhoria, a Concessão de Hospedagem(ens) para a(s) pessoa(s) especificada(s) a seguir:",
          ),
          criarTituloSecaoDocx("1. DADOS DO(A)(S) BENEFICIÁRIO(A)(S)"),
          tabelaHospede,
          criarTituloSecaoDocx("2. DADOS DA HOSPEDAGEM (CHECK-IN / CHECK-OUT)"),
          tabelaCheckin,
          criarTituloSecaoDocx("3. FONTE PAGADORA DA DESPESA"),
          criarParagrafoDocx(formatarFontePagadoraTexto(d.fontePagadora, d.detalhamentoFonte)),
          criarTituloSecaoDocx("4. ALIMENTAÇÃO E TIPO DE APARTAMENTO"),
          tabelaAlimentacao,
          criarTituloSecaoDocx("5. ENDEREÇO DO(A) BENEFICIÁRIO(A) (POP 06 — Comprovante de residência)"),
          criarParagrafoDocx(enderecoBenef),
          criarTituloSecaoDocx("6. OBSERVAÇÃO"),
          criarParagrafoDocx(montarObservacoesol(d)),
          criarParagrafoDocx("Atenciosamente,", { after: 40 }),
          ...criarBlocoAssinaturaDocx(
            d.chefiaNome || `Chefia Imediata — ${d.unidadeSolicitante.nome}`,
            d.chefiaCargo || `Assinatura digital do chefe imediato (${d.unidadeSolicitante.nome})`,
          ),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

export function gerarFormularioSolicitacaoHospedagemPdf(
  d: DadosCompletosViagemSdhp,
): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const seqTexto =
    d.pedidoHospedagem?.sequencialFormatado ||
    `Solicitação de Hospedagem nº 001/${d.criadoEm.getFullYear()} - SDHP/PROAD/UERN`;
  const codVerif = `SDHP-SH-${d.pedidoHospedagem?.sequencialAno ?? d.criadoEm.getFullYear()}-${String(d.pedidoHospedagem?.sequencialNumero ?? 1).padStart(3, "0")}`;

  let y = desenharCabecalhoPdfSdhp(
    doc,
    seqTexto,
    `Processo SEI nº: ${d.numeroProcessoSei || "A vincular"} • Unidade Demandante: ${d.unidadeSolicitante.nome}`,
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`ASSUNTO: Solicitação de Hospedagem (${seqTexto}).`, 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${d.roteiro.sedeCidade}-${d.roteiro.sedeEstado}, ${formatarDataPorExtenso(d.criadoEm)}.`,
    196,
    y,
    { align: "right" },
  );
  y += 5;

  doc.text(
    "Sr.(a) Pró-Reitor(a), Solicitamos a Vossa Senhoria a Concessão de Hospedagem(ens) para a(s) pessoa(s) especificada(s) a seguir:",
    14,
    y,
  );
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [
      [
        "Nº",
        "NOME COMPLETO",
        "MATRÍCULA\n(se for da UERN)",
        "C.P.F.\n(ou Doc. Equivalente)",
        "E-MAIL(S) PARA CONTATO",
        "TELEFONE(S) PARA CONTATO",
      ],
    ],
    body: [
      [
        "1",
        d.beneficiario.nome,
        d.beneficiario.matricula || "Colaborador Externo",
        formatarCpf(d.beneficiario.cpf),
        d.beneficiario.email || d.unidadeSolicitante.email,
        d.beneficiario.telefone || "—",
      ],
    ],
    styles: { fontSize: 7.5, cellPadding: 2, valign: "middle" },
    headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold", halign: "center" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 5;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [
      [
        "Nº",
        "ATIVIDADE A DESENVOLVER / JUSTIFICATIVA",
        "CIDADE / ESTADO PARA HOSPEDAGEM",
        "DATA CHECK-IN",
        "HORÁRIO CHECK-IN",
        "DATA CHECK-OUT",
        "HORÁRIO CHECK-OUT",
      ],
    ],
    body: [
      [
        "1",
        d.roteiro.finalidade,
        `${d.roteiro.municipioDestino} / ${d.roteiro.destinoEstado}`,
        formatarDataCurta(d.roteiro.chegadaDestino),
        formatarHoraCurta(d.roteiro.chegadaDestino),
        formatarDataCurta(d.roteiro.saidaDestino),
        formatarHoraCurta(d.roteiro.saidaDestino),
      ],
    ],
    styles: { fontSize: 7.5, cellPadding: 2, valign: "middle" },
    headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold", halign: "center" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 5;

  const almocoSim = d.pedidoHospedagem?.almocoIncluido ?? false;
  const jantarSim = d.pedidoHospedagem?.jantarIncluido ?? false;
  const tipoApto = d.pedidoHospedagem?.tipoApartamento || "SIMPLES";

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["ALIMENTAÇÃO", "SIM", "NÃO", "QTDADE (DIAS)", "TIPO DE APARTAMENTO(S)"]],
    body: [
      [
        "Almoço",
        almocoSim ? "( X )" : "(   )",
        !almocoSim ? "( X )" : "(   )",
        almocoSim && d.pedidoHospedagem?.almocoQtdDias
          ? `${d.pedidoHospedagem.almocoQtdDias} dia(s)`
          : "—",
        `${tipoApto === "SIMPLES" ? "[X]" : "[ ]"} SIMPLES   ${tipoApto === "DUPLO" ? "[X]" : "[ ]"} DUPLO   ${tipoApto === "TRIPLO" ? "[X]" : "[ ]"} TRIPLO`,
      ],
      [
        "Jantar",
        jantarSim ? "( X )" : "(   )",
        !jantarSim ? "( X )" : "(   )",
        jantarSim && d.pedidoHospedagem?.jantarQtdDias
          ? `${d.pedidoHospedagem.jantarQtdDias} dia(s)`
          : "—",
        d.pedidoHospedagem
          ? `Contrato: ${d.pedidoHospedagem.empresaNome} (${d.pedidoHospedagem.numeroContrato})`
          : "—",
      ],
    ],
    styles: { fontSize: 7.5, cellPadding: 2, halign: "center" },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 4;

  const enderecoBenef =
    d.pedidoHospedagem?.enderecoBeneficiario ||
    d.beneficiario.enderecoCompleto ||
    `${d.roteiro.sedeCidade}/${d.roteiro.sedeEstado}`;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["FONTE PAGADORA DA DESPESA E ENDEREÇO DO(A) BENEFICIÁRIO(A) (POP 06)"]],
    body: [
      [
        `• Fonte Pagadora: ${formatarFontePagadoraTexto(d.fontePagadora, d.detalhamentoFonte)}\n• Endereço Residencial do Beneficiário(a): ${enderecoBenef}`,
      ],
    ],
    styles: { fontSize: 7.8, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 4;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["OBSERVAÇÃO"]],
    body: [[montarObservacoesol(d)]],
    styles: { fontSize: 7.8, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 14;

  doc.setDrawColor(100, 100, 100);
  doc.line(60, y, 150, y);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(
    (d.chefiaNome || `Chefia Imediata — ${d.unidadeSolicitante.nome}`).toUpperCase(),
    105,
    y,
    { align: "center" },
  );
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.text(
    d.chefiaCargo || `Assinatura digital do chefe imediato (${d.unidadeSolicitante.nome})`,
    105,
    y,
    { align: "center" },
  );

  desenharRodapePdfSdhp(doc, seqTexto, codVerif);
  return Buffer.from(doc.output("arraybuffer"));
}

// ============================================================================
// TEMPLATE 4: RELATÓRIO DE VIAGEM E PRESTAÇÃO DE CONTAS (2025) — .DOCX e .PDF
// (Sempre menciona expressamente o sequencial do formulário de solicitação original!)
// ============================================================================

export async function gerarRelatorioViagemDocx(
  d: DadosCompletosViagemSdhp,
): Promise<Buffer> {
  const sequenciaisOriginais = obterSequenciaisOriginaisLista(d);
  const seqPrincipal =
    sequenciaisOriginais[0] ||
    `Solicitação nº 001/${d.criadoEm.getFullYear()} - SDHP/PROAD/UERN`;
  const tituloHeader = `RELATÓRIO DE VIAGEM — REF. ${seqPrincipal.toUpperCase()}`;
  const codVerif = `SDHP-RV-${d.criadoEm.getFullYear()}-${String(d.pedidoDiaria?.sequencialNumero ?? d.pedidoPassagemAerea?.sequencialNumero ?? d.pedidoHospedagem?.sequencialNumero ?? 1).padStart(3, "0")}`;

  const percurso = `${d.roteiro.sedeCidade}-${d.roteiro.sedeEstado} x ${d.roteiro.municipioDestino}-${d.roteiro.destinoEstado} x ${d.roteiro.sedeCidade}-${d.roteiro.sedeEstado}`;
  const ehAereo = d.tipoTransporte === "AEREO" || d.roteiro.vaiBuscarAeroporto || Boolean(d.pedidoPassagemAerea);
  const ehTerrestre = d.tipoTransporte === "TERRESTRE_OFICIAL" && !ehAereo;
  const ehOutro = !ehAereo && !ehTerrestre;

  const resultado =
    d.pedidoDiaria?.relatorioResultado ||
    d.pedidoPassagemAerea?.relatorioResultado ||
    d.pedidoHospedagem?.relatorioResultado ||
    "TOTALMENTE_ATINGIDO";

  const relatoAtividades =
    d.pedidoDiaria?.relatorioDescricaoAtividades ||
    d.pedidoPassagemAerea?.relatorioDescricaoAtividades ||
    d.pedidoHospedagem?.relatorioDescricaoAtividades ||
    d.atividades
      .map(
        (a, i) =>
          `${i + 1}. [${formatarDataHora(a.dataHoraInicio)} a ${formatarDataHora(a.dataHoraFim)}] ${a.enquadramentoNome}: ${a.descricao}${a.detalhamento ? ` (${a.detalhamento})` : ""}`,
      )
      .join("\n");

  const anexosListados =
    d.pedidoDiaria?.relatorioAnexosDescricao ||
    d.atividades.flatMap((a) => a.anexosNomes).join(", ") ||
    "Comprovantes de atividade, certificado/declaração de participação e/ou bilhetes de embarque juntados ao Processo SEI.";

  const tabelaVinculoOriginal = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          celulaTopoDocx("FORMULÁRIO(S) DE SOLICITAÇÃO DE ORIGEM (VÍNCULO AUTOMÁTICO SDHP)", 55),
          celulaTopoDocx("PROCESSO SEI Nº", 25),
          celulaTopoDocx("PORTARIA / PCD", 20),
        ],
      }),
      new TableRow({
        children: [
          celulaCorpoDocx(sequenciaisOriginais.join(" | ") || seqPrincipal, AlignmentType.LEFT, true),
          celulaCorpoDocx(d.numeroProcessoSei || "Informado nos autos", AlignmentType.CENTER, true),
          celulaCorpoDocx(
            d.pedidoDiaria?.portariaNumero
              ? `Portaria nº ${d.pedidoDiaria.portariaNumero}/${d.criadoEm.getFullYear()}-GP`
              : d.pedidoDiaria?.idPropostaConcessao
                ? `PCD ${d.pedidoDiaria.idPropostaConcessao}`
                : "Conforme autos",
            AlignmentType.CENTER,
          ),
        ],
      }),
    ],
  });

  const tabelaPeriodo = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          celulaTopoDocx("SAÍDA — DATA", 25),
          celulaTopoDocx("SAÍDA — HORA", 25),
          celulaTopoDocx("CHEGADA (RETORNO) — DATA", 25),
          celulaTopoDocx("CHEGADA (RETORNO) — HORA", 25),
        ],
      }),
      new TableRow({
        children: [
          celulaCorpoDocx(formatarDataCurta(d.roteiro.saidaSede), AlignmentType.CENTER, true),
          celulaCorpoDocx(formatarHoraCurta(d.roteiro.saidaSede), AlignmentType.CENTER),
          celulaCorpoDocx(formatarDataCurta(d.roteiro.chegadaSede), AlignmentType.CENTER, true),
          celulaCorpoDocx(formatarHoraCurta(d.roteiro.chegadaSede), AlignmentType.CENTER),
        ],
      }),
    ],
  });

  const ehConvenio =
    d.fontePagadora === "CONVENIO_FEDERAL" ||
    d.pedidoDiaria?.relatorioBaseLegal === "DECRETO_5992_2006";

  const doc = new Document({
    sections: [
      {
        headers: { default: criarCabecalhoDocxSdhp(tituloHeader) },
        footers: { default: criarRodapeDocxSdhp(tituloHeader, codVerif) },
        children: [
          criarTituloSecaoDocx("0. VINCULAÇÃO AO FORMULÁRIO DE SOLICITAÇÃO ORIGINAL"),
          tabelaVinculoOriginal,
          criarTituloSecaoDocx("1. BASE LEGAL"),
          criarParagrafoDocx(
            `(${!ehConvenio ? " X " : "   "}) Decreto Estadual nº 29.444 de 07 de janeiro de 2020 (Recursos estaduais)\n(${ehConvenio ? " X " : "   "}) Decreto Federal nº 5.992 de 19 de dezembro de 2006 (Recursos federais / Convênios)`,
          ),
          criarTituloSecaoDocx("2. IDENTIFICAÇÃO DO BENEFICIÁRIO"),
          criarParagrafoDocx(
            `• Nome: ${d.beneficiario.nome}\n• Cargo/Função: ${d.beneficiario.cargo || d.beneficiario.categoriaNome} (${d.unidadeSolicitante.nome})\n• Matrícula: ${d.beneficiario.matricula || "Colaborador Externo"}\n• CPF: ${formatarCpf(d.beneficiario.cpf)}\n• Contato (e-mail/telefone): ${d.beneficiario.email || d.unidadeSolicitante.email} | ${d.beneficiario.telefone || "—"}`,
          ),
          criarTituloSecaoDocx("3. DESLOCAMENTO REALIZADO (Percurso: local de saída x destino x local de retorno)"),
          criarParagrafoDocx(percurso, { bold: true }),
          criarTituloSecaoDocx("4. TIPO DE TRANSPORTE"),
          criarParagrafoDocx(
            `(${ehAereo ? " X " : "   "}) Aéreo          (${ehTerrestre ? " X " : "   "}) Terrestre Oficial          (${ehOutro ? " X " : "   "}) Outro (Especificar: ${d.tipoTransporteOutro || "—"})`,
          ),
          criarTituloSecaoDocx("5. PERÍODO DE AFASTAMENTO"),
          tabelaPeriodo,
          criarTituloSecaoDocx(
            "6. DESCRIÇÃO SUCINTA E CLARA DA VIAGEM (Relato resumido das atividades desenvolvidas durante a viagem e respectivas datas)",
          ),
          criarParagrafoDocx(`Finalidade Institucional: ${d.roteiro.finalidade}\n${relatoAtividades}`),
          criarTituloSecaoDocx("7. RESULTADO DA VIAGEM"),
          criarParagrafoDocx(
            `(${resultado === "TOTALMENTE_ATINGIDO" ? " X " : "   "}) Objetivo totalmente atingido\n(${resultado === "PARCIALMENTE_ATINGIDO" ? " X " : "   "}) Objetivo parcialmente atingido\n(${resultado === "NAO_ATINGIDO" ? " X " : "   "}) Objetivo não atingido`,
          ),
          criarTituloSecaoDocx("8. JUSTIFICATIVAS"),
          criarParagrafoDocx(
            `(${resultado === "NAO_ATINGIDO" ? " X " : "   "}) Objetivo não atingido — Justificar: ${d.pedidoDiaria?.relatorioJustificativaResultado || "Não se aplica."}\n(${d.pedidoDiaria?.valorDevolucaoCentavos && d.pedidoDiaria.valorDevolucaoCentavos > 0 ? " X " : "   "}) Retorno antecipado antes da data prevista na portaria de concessão de diárias — Justificar: ${d.pedidoDiaria?.relatorioJustificativaRetornoAntecipado || (d.pedidoDiaria?.valorDevolucaoCentavos ? `Retorno antecipado com restituição apurada de ${formatarMoeda(d.pedidoDiaria.valorDevolucaoCentavos, "BRL")}.` : "Não houve retorno antecipado.")}`,
          ),
          criarTituloSecaoDocx("9. ANEXOS COMPROBATÓRIOS"),
          criarParagrafoDocx(anexosListados),
          ...criarBlocoAssinaturaDocx(
            d.beneficiario.nome,
            `${d.beneficiario.cargo || d.beneficiario.categoriaNome} — CPF: ${formatarCpf(d.beneficiario.cpf)}`,
            `Assinatura do(a) beneficiário(a) — Prestação de Contas referente à ${seqPrincipal}`,
            `${d.roteiro.sedeCidade}-${d.roteiro.sedeEstado}, ${formatarDataPorExtenso(new Date())}.`,
          ),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

export function gerarRelatorioViagemPdf(d: DadosCompletosViagemSdhp): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const sequenciaisOriginais = obterSequenciaisOriginaisLista(d);
  const seqPrincipal =
    sequenciaisOriginais[0] ||
    `Solicitação nº 001/${d.criadoEm.getFullYear()} - SDHP/PROAD/UERN`;
  const tituloHeader = `RELATÓRIO DE VIAGEM — REF. ${seqPrincipal}`;
  const codVerif = `SDHP-RV-${d.criadoEm.getFullYear()}-${String(d.pedidoDiaria?.sequencialNumero ?? d.pedidoPassagemAerea?.sequencialNumero ?? d.pedidoHospedagem?.sequencialNumero ?? 1).padStart(3, "0")}`;

  let y = desenharCabecalhoPdfSdhp(
    doc,
    "RELATÓRIO DE VIAGEM E PRESTAÇÃO DE CONTAS",
    `Referência Obrigatória: ${sequenciaisOriginais.join(" | ") || seqPrincipal}`,
  );

  // Quadro 0: Vinculação à Solicitação Original
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [
      [
        "0. VINCULAÇÃO AO FORMULÁRIO DE SOLICITAÇÃO ORIGINAL",
        "PROCESSO SEI Nº",
        "PORTARIA / PCD",
      ],
    ],
    body: [
      [
        sequenciaisOriginais.join("\n") || seqPrincipal,
        d.numeroProcessoSei || "Informado nos autos",
        d.pedidoDiaria?.portariaNumero
          ? `Portaria nº ${d.pedidoDiaria.portariaNumero}/${d.criadoEm.getFullYear()}-GP`
          : d.pedidoDiaria?.idPropostaConcessao
            ? `PCD ${d.pedidoDiaria.idPropostaConcessao}`
            : "Conforme autos",
      ],
    ],
    styles: { fontSize: 7.5, cellPadding: 2, fontStyle: "bold" },
    headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 4;

  const ehConvenio =
    d.fontePagadora === "CONVENIO_FEDERAL" ||
    d.pedidoDiaria?.relatorioBaseLegal === "DECRETO_5992_2006";

  const percurso = `${d.roteiro.sedeCidade}-${d.roteiro.sedeEstado} x ${d.roteiro.municipioDestino}-${d.roteiro.destinoEstado} x ${d.roteiro.sedeCidade}-${d.roteiro.sedeEstado}`;
  const ehAereo = d.tipoTransporte === "AEREO" || d.roteiro.vaiBuscarAeroporto || Boolean(d.pedidoPassagemAerea);
  const ehTerrestre = d.tipoTransporte === "TERRESTRE_OFICIAL" && !ehAereo;
  const ehOutro = !ehAereo && !ehTerrestre;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["1. BASE LEGAL E 2. IDENTIFICAÇÃO DO BENEFICIÁRIO"]],
    body: [
      [
        `1. BASE LEGAL:\n(${!ehConvenio ? " X " : "   "}) Decreto Estadual nº 29.444 de 07 de janeiro de 2020 (Recursos estaduais)\n(${ehConvenio ? " X " : "   "}) Decreto Federal nº 5.992 de 19 de dezembro de 2006 (Recursos federais / Convênios)\n\n2. IDENTIFICAÇÃO DO BENEFICIÁRIO:\n• Nome: ${d.beneficiario.nome}   |   CPF: ${formatarCpf(d.beneficiario.cpf)}   |   Matrícula: ${d.beneficiario.matricula || "Colaborador Externo"}\n• Cargo/Função/Lotação: ${d.beneficiario.cargo || d.beneficiario.categoriaNome} — ${d.unidadeSolicitante.nome}\n• Contato (e-mail/telefone): ${d.beneficiario.email || d.unidadeSolicitante.email} | ${d.beneficiario.telefone || "—"}`,
      ],
    ],
    styles: { fontSize: 7.8, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 4;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["3. DESLOCAMENTO REALIZADO (Percurso)", "4. TIPO DE TRANSPORTE"]],
    body: [
      [
        percurso,
        `(${ehAereo ? " X " : "   "}) Aéreo   (${ehTerrestre ? " X " : "   "}) Terrestre Oficial   (${ehOutro ? " X " : "   "}) Outro: ${d.tipoTransporteOutro || "—"}`,
      ],
    ],
    styles: { fontSize: 7.8, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 4;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [
      [
        "5. PERÍODO DE AFASTAMENTO — SAÍDA (DATA)",
        "SAÍDA (HORA)",
        "CHEGADA / RETORNO (DATA)",
        "CHEGADA / RETORNO (HORA)",
      ],
    ],
    body: [
      [
        formatarDataCurta(d.roteiro.saidaSede),
        formatarHoraCurta(d.roteiro.saidaSede),
        formatarDataCurta(d.roteiro.chegadaSede),
        formatarHoraCurta(d.roteiro.chegadaSede),
      ],
    ],
    styles: { fontSize: 7.8, cellPadding: 2, halign: "center", fontStyle: "bold" },
    headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 4;

  const resultado =
    d.pedidoDiaria?.relatorioResultado ||
    d.pedidoPassagemAerea?.relatorioResultado ||
    d.pedidoHospedagem?.relatorioResultado ||
    "TOTALMENTE_ATINGIDO";

  const relatoAtividades =
    d.pedidoDiaria?.relatorioDescricaoAtividades ||
    d.pedidoPassagemAerea?.relatorioDescricaoAtividades ||
    d.pedidoHospedagem?.relatorioDescricaoAtividades ||
    d.atividades
      .map(
        (a, i) =>
          `${i + 1}. [${formatarDataHora(a.dataHoraInicio)} a ${formatarDataHora(a.dataHoraFim)}] ${a.enquadramentoNome}: ${a.descricao}${a.detalhamento ? ` (${a.detalhamento})` : ""}`,
      )
      .join("\n");

  const anexosListados =
    d.pedidoDiaria?.relatorioAnexosDescricao ||
    d.atividades.flatMap((a) => a.anexosNomes).join(", ") ||
    "Comprovantes de atividade, certificado/declaração de participação e/ou bilhetes de embarque juntados ao Processo SEI.";

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [
      [
        "6. DESCRIÇÃO SUCINTA E CLARA DA VIAGEM (Relato resumido das atividades desenvolvidas e respectivas datas)",
      ],
    ],
    body: [[`Finalidade: ${d.roteiro.finalidade}\n${relatoAtividades}`]],
    styles: { fontSize: 7.8, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 4;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["7. RESULTADO DA VIAGEM", "8. JUSTIFICATIVAS E 9. ANEXOS"]],
    body: [
      [
        `(${resultado === "TOTALMENTE_ATINGIDO" ? " X " : "   "}) Objetivo totalmente atingido\n(${resultado === "PARCIALMENTE_ATINGIDO" ? " X " : "   "}) Objetivo parcialmente atingido\n(${resultado === "NAO_ATINGIDO" ? " X " : "   "}) Objetivo não atingido`,
        `8. Justificativas:\n• Objetivo não atingido: ${d.pedidoDiaria?.relatorioJustificativaResultado || "Não se aplica."}\n• Retorno antecipado: ${d.pedidoDiaria?.relatorioJustificativaRetornoAntecipado || "Não houve."}\n\n9. Anexos: ${anexosListados}`,
      ],
    ],
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 12;

  if (y > 258) {
    doc.addPage();
    y = 25;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.text(
    `${d.roteiro.sedeCidade}-${d.roteiro.sedeEstado}, ${formatarDataPorExtenso(new Date())}.`,
    196,
    y,
    { align: "right" },
  );
  y += 12;

  doc.setDrawColor(100, 100, 100);
  doc.line(60, y, 150, y);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(d.beneficiario.nome.toUpperCase(), 105, y, { align: "center" });
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(
    `Assinatura do(a) Beneficiário(a) • CPF ${formatarCpf(d.beneficiario.cpf)} • Ref. ${seqPrincipal}`,
    105,
    y,
    { align: "center" },
  );

  desenharRodapePdfSdhp(doc, tituloHeader, codVerif);
  return Buffer.from(doc.output("arraybuffer"));
}

// ============================================================================
// TEMPLATE 5: FORMULÁRIO DE CADASTRO eSocial (AGENTE COLABORADOR / EVENTUAL)
// ============================================================================

export async function gerarFormularioEsocialDocx(
  d: DadosCompletosViagemSdhp,
): Promise<Buffer> {
  const seqRef =
    obterSequenciaisOriginaisLista(d)[0] ||
    `Solicitação nº 001/${d.criadoEm.getFullYear()} - SDHP/PROAD/UERN`;
  const tituloHeader = `FORMULÁRIO DE CADASTRO - eSocial (Ref. ${seqRef})`;
  const codVerif = `SDHP-ES-${d.criadoEm.getFullYear()}-${String(d.pedidoDiaria?.sequencialNumero ?? 1).padStart(3, "0")}`;
  const b = d.beneficiario;

  const tabelaEsocial = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          celulaTopoDocx("Nome Completo", 30),
          celulaCorpoDocx(b.nome, AlignmentType.LEFT, true),
        ],
      }),
      new TableRow({
        children: [
          celulaTopoDocx("CPF", 30),
          celulaCorpoDocx(formatarCpf(b.cpf)),
        ],
      }),
      new TableRow({
        children: [
          celulaTopoDocx("NIS ou PIS/PASEP", 30),
          celulaCorpoDocx(b.nisPisPasep || "—"),
        ],
      }),
      new TableRow({
        children: [
          celulaTopoDocx("Data de Nascimento", 30),
          celulaCorpoDocx(b.dataNascimento || "—"),
        ],
      }),
      new TableRow({
        children: [
          celulaTopoDocx("Servidor(a) Público(a) de Outro Órgão?", 30),
          celulaCorpoDocx(
            `Sim (${b.servidorOutroOrgao ? " X " : "   "})   Não (${!b.servidorOutroOrgao ? " X " : "   "})   |   Matrícula: ${b.matricula || "—"}`,
            AlignmentType.LEFT,
            true,
          ),
        ],
      }),
      new TableRow({
        children: [
          celulaTopoDocx("Estado Civil / Sexo", 30),
          celulaCorpoDocx(`Estado Civil: ${b.estadoCivil || "—"}   |   Sexo: ${b.sexo || "—"}`),
        ],
      }),
      new TableRow({
        children: [
          celulaTopoDocx("Grau de Instrução / Raça ou Cor", 30),
          celulaCorpoDocx(
            `Grau de Instrução: ${b.grauInstrucao || "—"}   |   Raça/Cor: ${b.racaCor || "—"}`,
          ),
        ],
      }),
      new TableRow({
        children: [
          celulaTopoDocx("País de Nascimento / Nacionalidade", 30),
          celulaCorpoDocx(
            `Nascimento: ${b.paisNascimento || "Brasil"}   |   Nacionalidade: ${b.paisNacionalidade || "Brasil"}`,
          ),
        ],
      }),
      new TableRow({
        children: [
          celulaTopoDocx("Endereço Completo (Logradouro, Nº, Bairro, CEP, Município/UF)", 30),
          celulaCorpoDocx(
            b.logradouro
              ? `${b.tipoLogradouro || "Rua"} ${b.logradouro}, nº ${b.numeroEndereco || "S/N"}${b.complementoEndereco ? ` (${b.complementoEndereco})` : ""}, Bairro ${b.bairroEndereco || "—"}, CEP ${b.cepEndereco || "—"}, ${b.municipioUfEndereco || `${d.roteiro.sedeCidade}/${d.roteiro.sedeEstado}`}`
              : b.enderecoCompleto || `${d.roteiro.sedeCidade}/${d.roteiro.sedeEstado}`,
          ),
        ],
      }),
      new TableRow({
        children: [
          celulaTopoDocx("Setor da UERN Solicitante", 30),
          celulaCorpoDocx(d.unidadeSolicitante.nome, AlignmentType.LEFT, true),
        ],
      }),
      new TableRow({
        children: [
          celulaTopoDocx("Ocupação / Curso (tutor, instrutor, professor, palestrante, etc.)", 30),
          celulaCorpoDocx(b.ocupacaoCurso || b.cargo || b.categoriaNome),
        ],
      }),
      new TableRow({
        children: [
          celulaTopoDocx("Solicitação Vinculada / Processo SEI", 30),
          celulaCorpoDocx(
            `${seqRef}   •   Processo SEI: ${d.numeroProcessoSei || "A vincular"}`,
            AlignmentType.LEFT,
            true,
          ),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        headers: { default: criarCabecalhoDocxSdhp(tituloHeader) },
        footers: { default: criarRodapeDocxSdhp(tituloHeader, codVerif) },
        children: [
          criarParagrafoDocx(
            "FORMULÁRIO DE CADASTRO — eSocial\nAGENTE COLABORADOR(A) / COLABORADOR(A) EVENTUAL\n(Preencher obrigatoriamente todos os campos — POP 03 e POP 04 SDHP/PROAD/UERN)",
            { bold: true, alinhamento: AlignmentType.CENTER },
          ),
          tabelaEsocial,
          ...criarBlocoAssinaturaDocx(
            b.nome,
            `Agente Colaborador(a) / Colaborador(a) Eventual — CPF ${formatarCpf(b.cpf)}`,
            `Anexo obrigatório à ${seqRef}`,
            `${d.roteiro.sedeCidade}-${d.roteiro.sedeEstado}, ${formatarDataPorExtenso(d.criadoEm)}.`,
          ),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

export function gerarFormularioEsocialPdf(d: DadosCompletosViagemSdhp): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const seqRef =
    obterSequenciaisOriginaisLista(d)[0] ||
    `Solicitação nº 001/${d.criadoEm.getFullYear()} - SDHP/PROAD/UERN`;
  const tituloHeader = `FORMULÁRIO DE CADASTRO - eSocial (Ref. ${seqRef})`;
  const codVerif = `SDHP-ES-${d.criadoEm.getFullYear()}-${String(d.pedidoDiaria?.sequencialNumero ?? 1).padStart(3, "0")}`;
  const b = d.beneficiario;

  let y = desenharCabecalhoPdfSdhp(
    doc,
    "FORMULÁRIO DE CADASTRO - eSocial (AGENTE COLABORADOR / EVENTUAL)",
    `Anexo Vinculado à ${seqRef} • Processo SEI nº: ${d.numeroProcessoSei || "A vincular"}`,
  );

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["CAMPO OBRIGATÓRIO eSocial (POP 03 e POP 04 SDHP/PROAD)", "INFORMAÇÃO DECLARADA"]],
    body: [
      ["Nome Completo", b.nome],
      ["CPF", formatarCpf(b.cpf)],
      ["NIS ou PIS/PASEP", b.nisPisPasep || "—"],
      ["Data de Nascimento", b.dataNascimento || "—"],
      [
        "Servidor(a) Público(a) de Outro Órgão?",
        `Sim (${b.servidorOutroOrgao ? " X " : "   "})   Não (${!b.servidorOutroOrgao ? " X " : "   "})   |   Matrícula: ${b.matricula || "—"}`,
      ],
      ["Estado Civil", b.estadoCivil || "—"],
      ["Sexo", b.sexo || "—"],
      ["Grau de Instrução", b.grauInstrucao || "—"],
      ["Raça / Cor", b.racaCor || "—"],
      ["País de Nascimento", b.paisNascimento || "Brasil"],
      ["País de Nacionalidade", b.paisNacionalidade || "Brasil"],
      ["Tipo de Logradouro (Av., Rua, Tv., etc.)", b.tipoLogradouro || "—"],
      ["Logradouro / Número / Complemento", `${b.logradouro || b.enderecoCompleto || "—"}, Nº ${b.numeroEndereco || "S/N"} ${b.complementoEndereco || ""}`],
      ["Bairro / CEP", `${b.bairroEndereco || "—"} | CEP: ${b.cepEndereco || "—"}`],
      ["Município / UF", b.municipioUfEndereco || `${d.roteiro.sedeCidade}/${d.roteiro.sedeEstado}`],
      ["Setor da UERN Solicitante", d.unidadeSolicitante.nome],
      ["Ocupação / Curso (tutor, instrutor, professor, etc.)", b.ocupacaoCurso || b.cargo || b.categoriaNome],
      ["Solicitação Original Vinculada", seqRef],
    ],
    styles: { fontSize: 8, cellPadding: 2.3 },
    headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 72 } },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 16;

  doc.setDrawColor(100, 100, 100);
  doc.line(60, y, 150, y);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(b.nome.toUpperCase(), 105, y, { align: "center" });
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.text("Assinatura do(a) Agente Colaborador(a) / Colaborador(a) Eventual", 105, y, {
    align: "center",
  });

  desenharRodapePdfSdhp(doc, tituloHeader, codVerif);
  return Buffer.from(doc.output("arraybuffer"));
}

// ============================================================================
// TEMPLATE 6: TERMO DE RETIFICAÇÃO DE VIAGEM / DIÁRIAS — .DOCX e .PDF
// ============================================================================

export async function gerarTermoRetificacaoDocx(
  d: DadosCompletosViagemSdhp,
): Promise<Buffer> {
  const seqRef =
    obterSequenciaisOriginaisLista(d)[0] ||
    `Solicitação de Diárias nº 001/${d.criadoEm.getFullYear()} - SDHP/PROAD/UERN`;
  const tituloHeader = `TERMO DE RETIFICAÇÃO — REF. ${seqRef.toUpperCase()}`;
  const codVerif = `SDHP-TR-${d.criadoEm.getFullYear()}-${String(d.pedidoDiaria?.sequencialNumero ?? 1).padStart(3, "0")}`;
  const alt = d.ultimaAlteracao;

  const tabelaComparativa = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          celulaTopoDocx("PARÂMETRO DO CRONOGRAMA", 26),
          celulaTopoDocx("PROGRAMAÇÃO ANTERIOR", 37),
          celulaTopoDocx("NOVA PROGRAMAÇÃO RETIFICADA", 37),
        ],
      }),
      new TableRow({
        children: [
          celulaCorpoDocx("Saída da Sede", AlignmentType.LEFT, true),
          celulaCorpoDocx(
            alt ? formatarDataHora(alt.saidaSedeAnterior) : formatarDataHora(d.roteiro.saidaSede),
            AlignmentType.CENTER,
          ),
          celulaCorpoDocx(
            alt ? formatarDataHora(alt.saidaSedeNova) : formatarDataHora(d.roteiro.saidaSede),
            AlignmentType.CENTER,
            true,
          ),
        ],
      }),
      new TableRow({
        children: [
          celulaCorpoDocx("Chegada ao Destino", AlignmentType.LEFT, true),
          celulaCorpoDocx(
            alt
              ? formatarDataHora(alt.chegadaDestinoAnterior)
              : formatarDataHora(d.roteiro.chegadaDestino),
            AlignmentType.CENTER,
          ),
          celulaCorpoDocx(
            alt
              ? formatarDataHora(alt.chegadaDestinoNova)
              : formatarDataHora(d.roteiro.chegadaDestino),
            AlignmentType.CENTER,
            true,
          ),
        ],
      }),
      new TableRow({
        children: [
          celulaCorpoDocx("Saída do Destino", AlignmentType.LEFT, true),
          celulaCorpoDocx(
            alt
              ? formatarDataHora(alt.saidaDestinoAnterior)
              : formatarDataHora(d.roteiro.saidaDestino),
            AlignmentType.CENTER,
          ),
          celulaCorpoDocx(
            alt
              ? formatarDataHora(alt.saidaDestinoNova)
              : formatarDataHora(d.roteiro.saidaDestino),
            AlignmentType.CENTER,
            true,
          ),
        ],
      }),
      new TableRow({
        children: [
          celulaCorpoDocx("Chegada à Sede (Retorno)", AlignmentType.LEFT, true),
          celulaCorpoDocx(
            alt
              ? formatarDataHora(alt.chegadaSedeAnterior)
              : formatarDataHora(d.roteiro.chegadaSede),
            AlignmentType.CENTER,
          ),
          celulaCorpoDocx(
            alt ? formatarDataHora(alt.chegadaSedeNova) : formatarDataHora(d.roteiro.chegadaSede),
            AlignmentType.CENTER,
            true,
          ),
        ],
      }),
      new TableRow({
        children: [
          celulaCorpoDocx("Quantidade e Valor de Diárias", AlignmentType.LEFT, true),
          celulaCorpoDocx(
            alt && alt.diariasAnteriores != null
              ? `${formatarDiarias(alt.diariasAnteriores)} (${alt.valorAnteriorCentavos != null ? formatarMoeda(alt.valorAnteriorCentavos, "BRL") : "—"})`
              : "—",
            AlignmentType.CENTER,
          ),
          celulaCorpoDocx(
            alt && alt.diariasNovas != null
              ? `${formatarDiarias(alt.diariasNovas)} (${alt.valorNovoCentavos != null ? formatarMoeda(alt.valorNovoCentavos, "BRL") : "—"})`
              : d.pedidoDiaria
                ? `${formatarDiarias(d.pedidoDiaria.diarias)} (${d.pedidoDiaria.valorTotalCentavos != null ? formatarMoeda(d.pedidoDiaria.valorTotalCentavos, "BRL") : "—"})`
                : "—",
            AlignmentType.CENTER,
            true,
          ),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        headers: { default: criarCabecalhoDocxSdhp(tituloHeader) },
        footers: { default: criarRodapeDocxSdhp(tituloHeader, codVerif) },
        children: [
          criarTituloSecaoDocx("1. IDENTIFICAÇÃO DA SOLICITAÇÃO ORIGINAL E DO PROCESSO SEI"),
          criarParagrafoDocx(
            `• Formulário de Solicitação Retificado: ${seqRef}\n• Processo Administrativo SEI nº: ${d.numeroProcessoSei || "Informado nos autos"}\n• Beneficiário(a): ${d.beneficiario.nome} (CPF: ${formatarCpf(d.beneficiario.cpf)} | Matrícula: ${d.beneficiario.matricula || "Externo"})\n• Unidade Solicitante: ${d.unidadeSolicitante.nome}`,
          ),
          criarTituloSecaoDocx("2. QUADRO COMPARATIVO DE RETIFICAÇÃO DE DATAS E HORÁRIOS"),
          tabelaComparativa,
          criarTituloSecaoDocx("3. MOTIVO / JUSTIFICATIVA DA RETIFICAÇÃO DE PERCURSO"),
          criarParagrafoDocx(
            alt?.motivo ||
              "Ajuste de programação e datas da viagem no interesse da Administração.",
          ),
          criarTituloSecaoDocx("4. IMPACTO FINANCEIRO APURADO"),
          criarParagrafoDocx(
            alt?.diferencaCentavos && alt.diferencaCentavos > 0
              ? `Diária Complementar Apurada (Prorrogação de Percurso): + ${formatarMoeda(alt.diferencaCentavos, "BRL")}.`
              : alt?.diferencaCentavos && alt.diferencaCentavos < 0
                ? `Devolução ao Erário Necessária (Retorno Antecipado - Art. 33 a 39 do Decreto nº 29.444/2020): - ${formatarMoeda(Math.abs(alt.diferencaCentavos), "BRL")}.`
                : "Sem alteração no valor total das diárias concedidas.",
            { bold: true },
          ),
          ...criarBlocoAssinaturaDocx(
            d.chefiaNome || alt?.solicitadoPorNome || d.beneficiario.nome,
            d.chefiaCargo || `Responsável pela Solicitação (${d.unidadeSolicitante.nome})`,
            `Termo de Retificação vinculado à ${seqRef}`,
            `${d.roteiro.sedeCidade}-${d.roteiro.sedeEstado}, ${formatarDataPorExtenso(alt?.createdAt || new Date())}.`,
          ),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

export function gerarTermoRetificacaoPdf(d: DadosCompletosViagemSdhp): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const seqRef =
    obterSequenciaisOriginaisLista(d)[0] ||
    `Solicitação de Diárias nº 001/${d.criadoEm.getFullYear()} - SDHP/PROAD/UERN`;
  const tituloHeader = `TERMO DE RETIFICAÇÃO — REF. ${seqRef}`;
  const codVerif = `SDHP-TR-${d.criadoEm.getFullYear()}-${String(d.pedidoDiaria?.sequencialNumero ?? 1).padStart(3, "0")}`;
  const alt = d.ultimaAlteracao;

  let y = desenharCabecalhoPdfSdhp(
    doc,
    "TERMO DE RETIFICAÇÃO DE PROGRAMAÇÃO DE VIAGEM / DIÁRIAS",
    `Referente à ${seqRef} • Processo SEI nº: ${d.numeroProcessoSei || "Informado nos autos"}`,
  );

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["1. IDENTIFICAÇÃO DA SOLICITAÇÃO ORIGINAL E DO BENEFICIÁRIO"]],
    body: [
      [
        `• Formulário Original Retificado: ${seqRef}\n• Processo Administrativo SEI nº: ${d.numeroProcessoSei || "Informado nos autos"}\n• Beneficiário(a): ${d.beneficiario.nome} (CPF: ${formatarCpf(d.beneficiario.cpf)} | Matrícula: ${d.beneficiario.matricula || "Externo"})\n• Unidade Demandante: ${d.unidadeSolicitante.nome}`,
      ],
    ],
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 5;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [
      [
        "2. PARÂMETRO DO CRONOGRAMA",
        "PROGRAMAÇÃO ANTERIOR",
        "NOVA PROGRAMAÇÃO RETIFICADA",
      ],
    ],
    body: [
      [
        "Saída da Sede",
        alt ? formatarDataHora(alt.saidaSedeAnterior) : formatarDataHora(d.roteiro.saidaSede),
        alt ? formatarDataHora(alt.saidaSedeNova) : formatarDataHora(d.roteiro.saidaSede),
      ],
      [
        "Chegada ao Destino",
        alt
          ? formatarDataHora(alt.chegadaDestinoAnterior)
          : formatarDataHora(d.roteiro.chegadaDestino),
        alt
          ? formatarDataHora(alt.chegadaDestinoNova)
          : formatarDataHora(d.roteiro.chegadaDestino),
      ],
      [
        "Saída do Destino",
        alt
          ? formatarDataHora(alt.saidaDestinoAnterior)
          : formatarDataHora(d.roteiro.saidaDestino),
        alt ? formatarDataHora(alt.saidaDestinoNova) : formatarDataHora(d.roteiro.saidaDestino),
      ],
      [
        "Chegada à Sede (Retorno)",
        alt
          ? formatarDataHora(alt.chegadaSedeAnterior)
          : formatarDataHora(d.roteiro.chegadaSede),
        alt ? formatarDataHora(alt.chegadaSedeNova) : formatarDataHora(d.roteiro.chegadaSede),
      ],
      [
        "Quantidade e Valor de Diárias",
        alt && alt.diariasAnteriores != null
          ? `${formatarDiarias(alt.diariasAnteriores)} (${alt.valorAnteriorCentavos != null ? formatarMoeda(alt.valorAnteriorCentavos, "BRL") : "—"})`
          : "—",
        alt && alt.diariasNovas != null
          ? `${formatarDiarias(alt.diariasNovas)} (${alt.valorNovoCentavos != null ? formatarMoeda(alt.valorNovoCentavos, "BRL") : "—"})`
          : d.pedidoDiaria
            ? `${formatarDiarias(d.pedidoDiaria.diarias)} (${d.pedidoDiaria.valorTotalCentavos != null ? formatarMoeda(d.pedidoDiaria.valorTotalCentavos, "BRL") : "—"})`
            : "—",
      ],
    ],
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { fontStyle: "bold" }, 2: { fontStyle: "bold" } },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 5;

  const impactoTexto =
    alt?.diferencaCentavos && alt.diferencaCentavos > 0
      ? `Diária Complementar Apurada (Prorrogação de Percurso): + ${formatarMoeda(alt.diferencaCentavos, "BRL")}.`
      : alt?.diferencaCentavos && alt.diferencaCentavos < 0
        ? `Devolução ao Erário Necessária (Retorno Antecipado - Art. 33 a 39 do Decreto nº 29.444/2020): - ${formatarMoeda(Math.abs(alt.diferencaCentavos), "BRL")}.`
        : "Sem alteração no valor total das diárias concedidas.";

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["3. MOTIVO / JUSTIFICATIVA DA RETIFICAÇÃO E 4. IMPACTO FINANCEIRO"]],
    body: [
      [
        `• Justificativa: ${alt?.motivo || "Ajuste de datas/horários da viagem no interesse institucional."}\n• Apuração Financeira: ${impactoTexto}`,
      ],
    ],
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 16;

  doc.setDrawColor(100, 100, 100);
  doc.line(60, y, 150, y);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(
    (d.chefiaNome || alt?.solicitadoPorNome || d.beneficiario.nome).toUpperCase(),
    105,
    y,
    { align: "center" },
  );
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.text(`Responsável pela Retificação • Ref. ${seqRef}`, 105, y, { align: "center" });

  desenharRodapePdfSdhp(doc, tituloHeader, codVerif);
  return Buffer.from(doc.output("arraybuffer"));
}
