import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const categoria = await prisma.categoriaBeneficiario.findFirstOrThrow();
  const tipoDestino = await prisma.tipoDestino.findFirstOrThrow();
  const valorDiaria = await prisma.valorDiaria.findFirstOrThrow({
    where: { categoriaId: categoria.id, tipoDestinoId: tipoDestino.id },
  });

  const senhaHash = await bcrypt.hash("SenhaTeste123", 12);

  const unidadeA = await prisma.unidade.upsert({
    where: { id: "unidade-teste-anexo-a" },
    update: {},
    create: { id: "unidade-teste-anexo-a", nome: "Unidade Teste Anexo A", email: "unidade.a.anexo@uern.br" },
  });
  const unidadeB = await prisma.unidade.upsert({
    where: { id: "unidade-teste-anexo-b" },
    update: {},
    create: { id: "unidade-teste-anexo-b", nome: "Unidade Teste Anexo B", email: "unidade.b.anexo@uern.br" },
  });

  const usuarioA = await prisma.usuario.upsert({
    where: { email: "usuario.a.anexo@uern.br" },
    update: { senhaHash },
    create: {
      nome: "Usuário A (teste anexo)", email: "usuario.a.anexo@uern.br", cpf: "52998224725",
      senhaHash, perfil: "DEMANDANTE", unidadeId: unidadeA.id,
    },
  });
  await prisma.usuario.upsert({
    where: { email: "usuario.b.anexo@uern.br" },
    update: { senhaHash },
    create: {
      nome: "Usuário B (teste anexo)", email: "usuario.b.anexo@uern.br", cpf: "15350946056",
      senhaHash, perfil: "DEMANDANTE", unidadeId: unidadeB.id,
    },
  });

  const beneficiario = await prisma.beneficiario.upsert({
    where: { cpf: "93541134780" },
    update: {},
    create: {
      nome: "Beneficiario Teste Anexo", nomeNormalizado: "beneficiario teste anexo", cpf: "93541134780",
      banco: "Banco Teste", agencia: "0001", contaCorrente: "00001-0",
      categoriaId: categoria.id, unidadeVinculoId: unidadeA.id,
    },
  });

  // Apaga pedido de teste anterior (idempotência entre execuções).
  await prisma.anexo.deleteMany({ where: { pedido: { finalidade: "TESTE-ANEXO-AUTOMATIZADO" } } });
  await prisma.pedidoDiaria.deleteMany({ where: { finalidade: "TESTE-ANEXO-AUTOMATIZADO" } });

  const agora = new Date();
  const pedido = await prisma.pedidoDiaria.create({
    data: {
      beneficiarioId: beneficiario.id,
      unidadeSolicitanteId: unidadeA.id,
      tipoDestinoId: tipoDestino.id,
      municipioDestino: "Cidade Teste",
      finalidade: "TESTE-ANEXO-AUTOMATIZADO",
      kmDeclarado: 100,
      saidaSede: agora,
      chegadaDestino: agora,
      saidaDestino: agora,
      chegadaSede: agora,
      noites: 0,
      ultimaNoiteQualifica: false,
      diarias: 1,
      valorUnitarioCentavos: valorDiaria.valorCentavos,
      valorTotalCentavos: valorDiaria.valorCentavos,
      status: "AGUARDANDO_DELIBERACAO_LIMITE",
      criadoPorId: usuarioA.id,
    },
  });

  console.log(JSON.stringify({ pedidoId: pedido.id }));
}

main().finally(() => prisma.$disconnect());
