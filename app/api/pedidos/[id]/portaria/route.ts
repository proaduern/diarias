import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { gerarPortariaDiariaDocx } from "@/lib/portaria-docx";

/**
 * Gera e serve o .docx da portaria, sempre a partir dos dados já persistidos
 * pelo `emitirPortariaAction` — nunca aceita dados por querystring/body, para
 * que o documento baixado seja sempre exatamente o que foi auditado no pedido.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await obterSessao();
  if (!sessao || sessao.perfil !== "ADMIN") {
    return NextResponse.json({ erro: "Acesso restrito ao administrador." }, { status: 403 });
  }

  const { id } = await params;
  const pedido = await prisma.pedidoDiaria.findUnique({
    where: { id },
    include: { viagem: { include: { beneficiario: true } } },
  });
  if (!pedido) {
    return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });
  }

  if (
    !pedido.portariaNumero ||
    !pedido.portariaData ||
    !pedido.numeroProcessoSei ||
    !pedido.idPropostaConcessao ||
    pedido.valorUnitarioCentavos == null ||
    pedido.valorTotalCentavos == null ||
    pedido.diarias == null
  ) {
    return NextResponse.json(
      { erro: "Portaria ainda não emitida para este pedido." },
      { status: 400 },
    );
  }

  const config = await prisma.configuracaoSistema.findUniqueOrThrow({ where: { id: 1 } });
  if (
    !config.numeroPortariaDelegacao ||
    !config.dataPortariaDelegacao ||
    !config.assinante1Nome ||
    !config.assinante1Cargo ||
    !config.assinante2Nome ||
    !config.assinante2Cargo
  ) {
    return NextResponse.json(
      { erro: "Configuração de delegação/assinantes incompleta." },
      { status: 400 },
    );
  }

  const beneficiario = pedido.viagem.beneficiario;

  const buffer = await gerarPortariaDiariaDocx({
    portariaNumero: pedido.portariaNumero,
    portariaData: pedido.portariaData,
    numeroProcessoSei: pedido.numeroProcessoSei,
    idPropostaConcessao: pedido.idPropostaConcessao,
    numeroPortariaDelegacao: config.numeroPortariaDelegacao,
    dataPortariaDelegacao: config.dataPortariaDelegacao,
    assinante1Nome: config.assinante1Nome,
    assinante1Cargo: config.assinante1Cargo,
    assinante2Nome: config.assinante2Nome,
    assinante2Cargo: config.assinante2Cargo,
    beneficiario: {
      nome: beneficiario.nome,
      cpf: beneficiario.cpf,
      matricula: beneficiario.matricula,
      cargo: beneficiario.cargo,
    },
    diarias: Number(pedido.diarias),
    valorUnitarioCentavos: pedido.valorUnitarioCentavos,
    valorTotalCentavos: pedido.valorTotalCentavos,
    sedeCidade: pedido.viagem.sedeCidade,
    sedeEstado: pedido.viagem.sedeEstado,
    municipioDestino: pedido.viagem.municipioDestino,
    destinoEstado: pedido.viagem.destinoEstado,
    saidaSede: pedido.viagem.saidaSede,
    chegadaSede: pedido.viagem.chegadaSede,
    finalidade: pedido.viagem.finalidade,
  });

  const nomeArquivo = `portaria-${pedido.portariaNumero}-${pedido.portariaData.getFullYear()}.docx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(nomeArquivo)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
