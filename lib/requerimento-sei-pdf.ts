import { jsPDF } from "jspdf";
import { formatarCpf, formatarDataHora, formatarDiarias, formatarMoeda } from "./formato";

export interface DadosRequerimentoViagemSei {
  viagemId: string;
  numeroProcessoSei: string | null;
  idDocumentoSei: string | null;
  criadoEm: Date;
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
    tempoViagemEstimadoMinutos: number | null;
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
    tipoDestinoNome: string;
    noites: number | null;
    ultimaNoiteQualifica: boolean | null;
    diarias: number | null;
    valorUnitarioCentavos: number | null;
    valorTotalCentavos: number | null;
    justificativaPrazoCurto: string | null;
    justificativaGestorAtividade: string | null;
  } | null;
  pedidoHospedagem: {
    id: string;
    empresaNome: string;
    numeroContrato: string;
    valorTotalCentavos: number | null;
    justificativaPrazoCurto: string | null;
  } | null;
  pedidoPassagemAerea: {
    id: string;
    empresaNome: string;
    numeroContrato: string;
    valorTotalCentavos: number | null;
    justificativaPrazoCurto: string | null;
  } | null;
}

export function obterBeneficiosSolicitadosLabel(d: DadosRequerimentoViagemSei): string {
  const tipos: string[] = [];
  if (d.pedidoDiaria) tipos.push("Diárias");
  if (d.pedidoHospedagem) tipos.push("Hospedagem");
  if (d.pedidoPassagemAerea) tipos.push("Passagem Aérea");
  return tipos.join(", ") || "Viagem a Serviço";
}

export function gerarTextoCopiavelParaSei(d: DadosRequerimentoViagemSei): string {
  const beneficios = obterBeneficiosSolicitadosLabel(d);
  const linhas: string[] = [
    "FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - FUERN",
    "PRÓ-REITORIA DE ADMINISTRAÇÃO - PROAD",
    "SETOR DE DIÁRIAS, PASSAGENS E HOSPEDAGENS",
    "==========================================================================",
    `REQUERIMENTO E PROPOSTA DE CONCESSÃO (${beneficios.toUpperCase()})`,
    "==========================================================================",
    `Processo SEI nº: ${d.numeroProcessoSei || "[Informar no SEI]"}`,
    `Unidade Solicitante: ${d.unidadeSolicitante.nome} (${d.unidadeSolicitante.email})`,
    `Código de Registro no Sistema de Diárias/UERN: ${d.viagemId}`,
    "",
    "1. IDENTIFICAÇÃO DO BENEFICIÁRIO E DADOS BANCÁRIOS",
    `- Nome Completo: ${d.beneficiario.nome}`,
    `- CPF: ${formatarCpf(d.beneficiario.cpf)}`,
    `- Matrícula / Vínculo: ${d.beneficiario.matricula || "Colaborador Externo / Sem matrícula"}`,
    `- Cargo / Função: ${d.beneficiario.cargo || "Não aplicável"}`,
    `- Categoria: ${d.beneficiario.categoriaNome}`,
    `- Dados Bancários: Banco ${d.beneficiario.banco} | Agência ${d.beneficiario.agencia} | Conta ${d.beneficiario.contaCorrente}`,
    "",
    "2. ROTEIRO, PERÍODO E FINALIDADE DA VIAGEM",
    `- Finalidade Institucional: ${d.roteiro.finalidade}`,
    `- Origem (Sede): ${d.roteiro.sedeCidade}/${d.roteiro.sedeEstado}`,
    `- Destino: ${d.roteiro.municipioDestino}/${d.roteiro.destinoEstado}`,
    `- Distância Terrestre Declarada: ${d.roteiro.kmDeclarado} km`,
  ];

  if (d.roteiro.vaiBuscarAeroporto) {
    linhas.push(
      `- Deslocamento Aéreo/Intermodal: Sede-Aeroporto: ${d.roteiro.kmSedeAeroporto ?? 0} km | Voo: ${d.roteiro.kmVoo ?? 0} km | Aeroporto-Destino: ${d.roteiro.kmAeroportoDestino ?? 0} km`,
    );
  }

  linhas.push(
    `- Saída da Sede: ${formatarDataHora(d.roteiro.saidaSede)}`,
    `- Chegada ao Destino: ${formatarDataHora(d.roteiro.chegadaDestino)}`,
    `- Saída do Destino (Retorno): ${formatarDataHora(d.roteiro.saidaDestino)}`,
    `- Chegada à Sede: ${formatarDataHora(d.roteiro.chegadaSede)}`,
    "",
    "3. PROGRAMAÇÃO DETALHADA DAS ATIVIDADES",
  );

  d.atividades.forEach((a, idx) => {
    linhas.push(
      `  3.${idx + 1}. [${a.categoria}] ${a.enquadramentoNome}`,
      `       Descrição: ${a.descricao}`,
      ...(a.detalhamento ? [`       Detalhamento: ${a.detalhamento}`] : []),
      `       Período: ${formatarDataHora(a.dataHoraInicio)} até ${formatarDataHora(a.dataHoraFim)}`,
      ...(a.anexosNomes.length > 0 ? [`       Comprovante(s) Anexado(s): ${a.anexosNomes.join(", ")}`] : []),
    );
  });

  linhas.push("", "4. BENEFÍCIOS SOLICITADOS E MEMÓRIA DE CÁLCULO");

  if (d.pedidoDiaria) {
    linhas.push(
      `  [X] DIÁRIAS (ID Pedido: ${d.pedidoDiaria.id})`,
      `      - Tipo de Destino: ${d.pedidoDiaria.tipoDestinoNome}`,
      `      - Quantidade de Diárias Calculadas: ${formatarDiarias(d.pedidoDiaria.diarias)} (Pernoites: ${d.pedidoDiaria.noites ?? 0})`,
      `      - Valor Unitário: ${d.pedidoDiaria.valorUnitarioCentavos != null ? formatarMoeda(d.pedidoDiaria.valorUnitarioCentavos, "BRL") : "-"}`,
      `      - Valor Total Estimado: ${d.pedidoDiaria.valorTotalCentavos != null ? formatarMoeda(d.pedidoDiaria.valorTotalCentavos, "BRL") : "-"}`,
    );
  }

  if (d.pedidoHospedagem) {
    linhas.push(
      `  [X] HOSPEDAGEM (ID Pedido: ${d.pedidoHospedagem.id})`,
      `      - Contrato Vinculado: ${d.pedidoHospedagem.empresaNome} (Contrato nº ${d.pedidoHospedagem.numeroContrato})`,
      `      - Valor Cotado: ${d.pedidoHospedagem.valorTotalCentavos != null ? formatarMoeda(d.pedidoHospedagem.valorTotalCentavos, "BRL") : "A cotar pelo setor competente"}`,
    );
  }

  if (d.pedidoPassagemAerea) {
    linhas.push(
      `  [X] PASSAGEM AÉREA (ID Pedido: ${d.pedidoPassagemAerea.id})`,
      `      - Contrato Vinculado: ${d.pedidoPassagemAerea.empresaNome} (Contrato nº ${d.pedidoPassagemAerea.numeroContrato})`,
      `      - Valor Cotado: ${d.pedidoPassagemAerea.valorTotalCentavos != null ? formatarMoeda(d.pedidoPassagemAerea.valorTotalCentavos, "BRL") : "A cotar pelo setor competente"}`,
    );
  }

  const justPrazo =
    d.pedidoDiaria?.justificativaPrazoCurto ||
    d.pedidoHospedagem?.justificativaPrazoCurto ||
    d.pedidoPassagemAerea?.justificativaPrazoCurto;

  if (justPrazo) {
    linhas.push("", "5. JUSTIFICATIVA DE EXCEPCIONALIDADE DE PRAZO", `  ${justPrazo}`);
  }

  linhas.push(
    "",
    "6. ENCAMINHAMENTO AO SETOR DE DIÁRIAS, PASSAGENS E HOSPEDAGENS (PROAD)",
    "Encaminha-se a presente solicitação, devidamente registrada e validada no Sistema Institucional de Diárias, Passagens e Hospedagens da UERN, acompanhada dos respectivos comprovantes de atividade, para análise e prosseguimento junto ao Setor de Diárias, Passagens e Hospedagens / PROAD.",
  );

  return linhas.join("\n");
}

export function gerarRequerimentoViagemSeiPdf(d: DadosRequerimentoViagemSei): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const beneficios = obterBeneficiosSolicitadosLabel(d);

  // Cabeçalho Institucional
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE - FUERN", 105, 16, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("PRÓ-REITORIA DE ADMINISTRAÇÃO (PROAD) • SETOR DE DIÁRIAS, PASSAGENS E HOSPEDAGENS", 105, 21, {
    align: "center",
  });

  doc.setDrawColor(180, 180, 180);
  doc.line(15, 24, 195, 24);

  // Título Principal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(0, 51, 102);
  doc.text(`REQUERIMENTO E PROPOSTA DE CONCESSÃO (${beneficios.toUpperCase()})`, 105, 31, {
    align: "center",
  });

  // Quadro de Identificação do Processo SEI e Código da Viagem
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(15, 34, 180, 14, 2, 2, "FD");

  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text("Processo SEI nº:", 18, 39.5);
  doc.setFont("helvetica", "normal");
  doc.text(d.numeroProcessoSei || "A vincular na abertura do processo SEI pela Unidade", 46, 39.5);

  doc.setFont("helvetica", "bold");
  doc.text("Protocolo Sistema:", 125, 39.5);
  doc.setFont("helvetica", "normal");
  doc.text(d.viagemId, 155, 39.5);

  doc.setFont("helvetica", "bold");
  doc.text("Unidade Solicitante:", 18, 45);
  doc.setFont("helvetica", "normal");
  doc.text(`${d.unidadeSolicitante.nome} (${d.unidadeSolicitante.email})`, 50, 45);

  let y = 55;

  const ensureSpace = (needed: number) => {
    if (y + needed > 272) {
      doc.addPage();
      y = 20;
    }
  };

  const renderSecaoTitulo = (titulo: string) => {
    ensureSpace(10);
    doc.setFillColor(0, 51, 102);
    doc.rect(15, y - 4, 180, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(titulo, 18, y);
    y += 6;
    doc.setTextColor(30, 41, 59);
  };

  const renderLinha = (rotulo: string, valor: string) => {
    const linhasValor = doc.splitTextToSize(valor || "-", 135);
    ensureSpace(linhasValor.length * 4.5 + 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(rotulo, 16, y);
    doc.setFont("helvetica", "normal");
    doc.text(linhasValor, 56, y);
    y += linhasValor.length * 4.2 + 1.5;
  };

  // Seção 1: Beneficiário
  renderSecaoTitulo("1. IDENTIFICAÇÃO DO BENEFICIÁRIO E DADOS BANCÁRIOS");
  renderLinha("Nome Completo:", d.beneficiario.nome);
  renderLinha("CPF:", formatarCpf(d.beneficiario.cpf));
  renderLinha(
    "Matrícula / Cargo:",
    `${d.beneficiario.matricula || "Colaborador Externo"} • ${d.beneficiario.cargo || "Sem cargo vinculado"}`,
  );
  renderLinha("Categoria:", d.beneficiario.categoriaNome);
  renderLinha(
    "Dados Bancários:",
    `Banco: ${d.beneficiario.banco} | Agência: ${d.beneficiario.agencia} | Conta Corrente: ${d.beneficiario.contaCorrente}`,
  );
  y += 2;

  // Seção 2: Roteiro
  renderSecaoTitulo("2. ROTEIRO DE VIAGEM, PERÍODO E FINALIDADE");
  renderLinha("Finalidade:", d.roteiro.finalidade);
  renderLinha(
    "Trecho:",
    `Origem: ${d.roteiro.sedeCidade}/${d.roteiro.sedeEstado}  ➔  Destino: ${d.roteiro.municipioDestino}/${d.roteiro.destinoEstado} (${d.roteiro.kmDeclarado} km)`,
  );
  if (d.roteiro.vaiBuscarAeroporto) {
    renderLinha(
      "Trecho Aéreo:",
      `Sede-Aeroporto: ${d.roteiro.kmSedeAeroporto ?? 0} km | Voo: ${d.roteiro.kmVoo ?? 0} km | Aeroporto-Destino: ${d.roteiro.kmAeroportoDestino ?? 0} km`,
    );
  }
  renderLinha(
    "Ida (Saída / Chegada):",
    `Saída da Sede: ${formatarDataHora(d.roteiro.saidaSede)}  |  Chegada ao Destino: ${formatarDataHora(d.roteiro.chegadaDestino)}`,
  );
  renderLinha(
    "Retorno (Saída / Chegada):",
    `Saída do Destino: ${formatarDataHora(d.roteiro.saidaDestino)}  |  Chegada à Sede: ${formatarDataHora(d.roteiro.chegadaSede)}`,
  );
  y += 2;

  // Seção 3: Programação de Atividades
  renderSecaoTitulo("3. PROGRAMAÇÃO DETALHADA DE ATIVIDADES VINCULADAS");
  d.atividades.forEach((a, idx) => {
    ensureSpace(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(
      `Atividade ${idx + 1}: [${a.categoria === "ACADEMICA" ? "Acadêmica" : "Administrativa"}] ${a.enquadramentoNome}`,
      16,
      y,
    );
    y += 4.5;
    renderLinha("Descrição:", a.descricao + (a.detalhamento ? ` — ${a.detalhamento}` : ""));
    renderLinha("Janela Horária:", `${formatarDataHora(a.dataHoraInicio)} até ${formatarDataHora(a.dataHoraFim)}`);
    if (a.anexosNomes.length > 0) {
      renderLinha("Anexo(s):", a.anexosNomes.join(", "));
    }
    y += 1;
  });
  y += 2;

  // Seção 4: Benefícios e Memória de Cálculo
  renderSecaoTitulo("4. BENEFÍCIOS SOLICITADOS E MEMÓRIA DE CÁLCULO");
  if (d.pedidoDiaria) {
    renderLinha("Modalidade 1:", `Concessão de Diárias (ID Proposta/Pedido: ${d.pedidoDiaria.id})`);
    renderLinha("Tipo de Destino:", d.pedidoDiaria.tipoDestinoNome);
    renderLinha(
      "Cálculo Automático:",
      `${formatarDiarias(d.pedidoDiaria.diarias)} diária(s) | Pernoites: ${d.pedidoDiaria.noites ?? 0} | Valor Unitário: ${
        d.pedidoDiaria.valorUnitarioCentavos != null
          ? formatarMoeda(d.pedidoDiaria.valorUnitarioCentavos, "BRL")
          : "-"
      }`,
    );
    renderLinha(
      "Valor Total de Diárias:",
      d.pedidoDiaria.valorTotalCentavos != null ? formatarMoeda(d.pedidoDiaria.valorTotalCentavos, "BRL") : "-",
    );
  }

  if (d.pedidoHospedagem) {
    renderLinha("Modalidade 2:", `Hospedagem (ID Pedido: ${d.pedidoHospedagem.id})`);
    renderLinha(
      "Contrato de Hospedagem:",
      `${d.pedidoHospedagem.empresaNome} — Contrato nº ${d.pedidoHospedagem.numeroContrato}`,
    );
    renderLinha(
      "Valor de Hospedagem:",
      d.pedidoHospedagem.valorTotalCentavos != null
        ? formatarMoeda(d.pedidoHospedagem.valorTotalCentavos, "BRL")
        : "A ser cotado/informado pelo Setor de Diárias e Hospedagens",
    );
  }

  if (d.pedidoPassagemAerea) {
    renderLinha("Modalidade 3:", `Passagem Aérea (ID Pedido: ${d.pedidoPassagemAerea.id})`);
    renderLinha(
      "Contrato de Passagens:",
      `${d.pedidoPassagemAerea.empresaNome} — Contrato nº ${d.pedidoPassagemAerea.numeroContrato}`,
    );
    renderLinha(
      "Valor de Passagem:",
      d.pedidoPassagemAerea.valorTotalCentavos != null
        ? formatarMoeda(d.pedidoPassagemAerea.valorTotalCentavos, "BRL")
        : "A ser cotado/informado pelo Setor de Passagens",
    );
  }

  const justPrazo =
    d.pedidoDiaria?.justificativaPrazoCurto ||
    d.pedidoHospedagem?.justificativaPrazoCurto ||
    d.pedidoPassagemAerea?.justificativaPrazoCurto;
  if (justPrazo) {
    y += 2;
    renderSecaoTitulo("5. JUSTIFICATIVA DE EXCEPCIONALIDADE DE PRAZO");
    renderLinha("Justificativa:", justPrazo);
  }

  // Termo de Encaminhamento SEI
  ensureSpace(28);
  y += 3;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(148, 163, 184);
  doc.roundedRect(15, y, 180, 20, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("INSTRUÇÃO E ENCAMINHAMENTO AO SETOR DE DIÁRIAS, PASSAGENS E HOSPEDAGENS (PROAD/UERN)", 18, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const textoDespacho =
    "Documento gerado eletronicamente pelo Sistema Institucional de Diárias, Passagens e Hospedagens da UERN para instrução do Processo SEI aberto pela Unidade Solicitante e remessa ao Setor de Diárias, Passagens e Hospedagens / PROAD.";
  doc.text(doc.splitTextToSize(textoDespacho, 174), 18, y + 10);

  // Rodapé Oficial
  const pageHeight = 297;
  const yFoot = pageHeight - 12;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(15, yFoot - 2, 195, yFoot - 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text("DOCUMENTO GERADO PELO SISTEMA DE DIÁRIAS, PASSAGENS E HOSPEDAGENS — PROAD / UERN", 15, yFoot + 1);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Emitido em ${formatarDataHora(new Date())} • Protocolo Viagem: ${d.viagemId} • SEI: ${d.numeroProcessoSei || "Pendente"}`,
    15,
    yFoot + 4.5,
  );

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
