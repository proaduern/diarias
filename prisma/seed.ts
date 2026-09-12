import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { normalizarNome } from "../lib/cpf";

const prisma = new PrismaClient();

async function main() {
  console.log("Seed: configuração do sistema...");
  await prisma.configuracaoSistema.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      limiteMensalDiarias: 10,
      prazoMinimoDiasAntecedencia: 5,
      prazoRelatorioDiasUteis: 5,
      prazoDevolucaoDiasCorridos: 30,
      kmMinimoSemPernoite: 40,
      duracaoMinimaHoras: 6,
    },
  });

  console.log("Seed: categorias de beneficiário (Portaria 293/2020-GP/FUERN, Anexo I, nota 1)...");
  const categorias = [
    {
      nome: "Classe I — Reitor e Vice-Reitor",
      descricao: "Reitor e Vice-Reitor",
      limiteAnualDias: 60,
      ordem: 1,
    },
    {
      nome: "Classe II — Chefe de Gabinete, Pró-Reitores e Assessores CC4",
      descricao: "Chefe de Gabinete, Pró-Reitores e Assessores CC4",
      limiteAnualDias: 60,
      ordem: 2,
    },
    {
      nome: "Classe III — Diretores de Unidade e de Campi Avançados",
      descricao: "Diretores de Unidades, Diretores de Campi Avançados",
      limiteAnualDias: 60,
      ordem: 3,
    },
    {
      nome: "Classe IV — Professores, TNS, TNM e Servidores de Apoio",
      descricao:
        "Professores, TNS's, TNM's, Servidores de Apoio do Quadro Geral e demais",
      limiteAnualDias: 60,
      ordem: 4,
    },
  ];

  const categoriaPorNome = new Map<string, string>();
  for (const c of categorias) {
    const criada = await prisma.categoriaBeneficiario.upsert({
      where: { nome: c.nome },
      update: {
        descricao: c.descricao,
        limiteAnualDias: c.limiteAnualDias,
        ordem: c.ordem,
      },
      create: c,
    });
    categoriaPorNome.set(c.nome, criada.id);
  }

  console.log("Seed: tipos de destino...");
  const tiposDestino = [
    { nome: "Interior do RN (exceto Natal e Mossoró)", ordem: 1 },
    {
      nome: "Natal, Mossoró e Outras Cidades do Brasil",
      descricao:
        "Inclui Natal e Mossoró quando não forem a sede/lotação do beneficiário (Portaria 293/2020-GP/FUERN, Anexo I, nota 2)",
      ordem: 2,
    },
    { nome: "São Paulo/SP, Rio de Janeiro/RJ, Brasília/DF", ordem: 3 },
    { nome: "Exterior — América do Sul", ordem: 4 },
    { nome: "Exterior — América do Norte", ordem: 5 },
    { nome: "Exterior — Europa", ordem: 6 },
    { nome: "Exterior — Ásia e Oceania", ordem: 7 },
  ];

  const destinoPorNome = new Map<string, string>();
  for (const d of tiposDestino) {
    const criado = await prisma.tipoDestino.upsert({
      where: { nome: d.nome },
      update: { descricao: d.descricao, ordem: d.ordem },
      create: d,
    });
    destinoPorNome.set(d.nome, criado.id);
  }

  console.log("Seed: matriz de valores (Portaria 293/2020-GP/FUERN, Anexo I)...");
  // Tabela 1 - Território Nacional (em centavos de R$) por Classe (I, II, III, IV)
  const tabela1: Record<string, [number, number, number, number]> = {
    "Interior do RN (exceto Natal e Mossoró)": [15000, 15000, 12000, 8000],
    "Natal, Mossoró e Outras Cidades do Brasil": [40000, 40000, 35000, 25000],
    "São Paulo/SP, Rio de Janeiro/RJ, Brasília/DF": [40000, 40000, 35000, 25000],
  };
  // Tabela 2 - Exterior (em centavos de US$) por Classe (I, II, III, IV)
  const tabela2: Record<string, [number, number, number, number]> = {
    "Exterior — América do Sul": [24000, 24000, 20000, 12000],
    "Exterior — América do Norte": [28000, 28000, 24000, 14000],
    "Exterior — Europa": [32000, 32000, 28000, 20000],
    "Exterior — Ásia e Oceania": [32000, 32000, 28000, 20000],
  };

  const classes = [
    "Classe I — Reitor e Vice-Reitor",
    "Classe II — Chefe de Gabinete, Pró-Reitores e Assessores CC4",
    "Classe III — Diretores de Unidade e de Campi Avançados",
    "Classe IV — Professores, TNS, TNM e Servidores de Apoio",
  ];

  for (const [destinoNome, valores] of Object.entries(tabela1)) {
    for (let i = 0; i < classes.length; i++) {
      await prisma.valorDiaria.upsert({
        where: {
          categoriaId_tipoDestinoId: {
            categoriaId: categoriaPorNome.get(classes[i])!,
            tipoDestinoId: destinoPorNome.get(destinoNome)!,
          },
        },
        update: { valorCentavos: valores[i], moeda: "BRL" },
        create: {
          categoriaId: categoriaPorNome.get(classes[i])!,
          tipoDestinoId: destinoPorNome.get(destinoNome)!,
          valorCentavos: valores[i],
          moeda: "BRL",
        },
      });
    }
  }

  for (const [destinoNome, valores] of Object.entries(tabela2)) {
    for (let i = 0; i < classes.length; i++) {
      await prisma.valorDiaria.upsert({
        where: {
          categoriaId_tipoDestinoId: {
            categoriaId: categoriaPorNome.get(classes[i])!,
            tipoDestinoId: destinoPorNome.get(destinoNome)!,
          },
        },
        update: { valorCentavos: valores[i], moeda: "USD" },
        create: {
          categoriaId: categoriaPorNome.get(classes[i])!,
          tipoDestinoId: destinoPorNome.get(destinoNome)!,
          valorCentavos: valores[i],
          moeda: "USD",
        },
      });
    }
  }

  console.log("Seed: unidade e usuário administrador...");
  const unidadeReitoria = await prisma.unidade.upsert({
    where: { id: "unidade-reitoria-seed" },
    update: {},
    create: {
      id: "unidade-reitoria-seed",
      nome: "Reitoria - FUERN (Mossoró)",
      email: "reitoria@fuern.rn.gov.br",
    },
  });

  const senhaAdminHash = await bcrypt.hash("TrocarEssaSenha123!", 12);
  await prisma.usuario.upsert({
    where: { email: "adj.proad@uern.br" },
    update: {},
    create: {
      nome: "Administrador do Sistema",
      email: "adj.proad@uern.br",
      cpf: "11122233396",
      senhaHash: senhaAdminHash,
      perfil: "ADMIN",
      unidadeId: unidadeReitoria.id,
    },
  });

  console.log("Seed: beneficiário de exemplo...");
  const nomeExemplo = "Professor Exemplo da Silva";
  await prisma.beneficiario.upsert({
    where: { cpf: "11144477735" },
    update: {},
    create: {
      nome: nomeExemplo,
      nomeNormalizado: normalizarNome(nomeExemplo),
      cpf: "11144477735",
      banco: "Banco do Brasil",
      agencia: "1234-5",
      contaCorrente: "12345-6",
      categoriaId: categoriaPorNome.get(classes[3])!,
      unidadeVinculoId: unidadeReitoria.id,
    },
  });

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
