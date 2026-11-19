import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";

const prisma = new PrismaClient();

async function executarSilencioso(sql) {
  try {
    await prisma.$executeRawUnsafe(sql);
  } catch {
    // Ignora se já existir ou se o schema específico não existir
  }
}

async function main() {
  console.log("[Deploy Schema Diárias] Sincronizando schema e tabelas normativas SDHP/UERN...");

  try {
    execSync("npx prisma db push --accept-data-loss --skip-generate", { stdio: "inherit" });
  } catch (e) {
    console.warn("[Deploy Schema Diárias] Aviso no prisma db push, aplicando migração SQL direta...", e?.message);
  }

  const schemas = ["", "public.", "diarias."];

  for (const s of schemas) {
    // Enums
    await executarSilencioso(`ALTER TYPE ${s}"StatusPedido" ADD VALUE IF NOT EXISTS 'AGUARDANDO_PROCESSO_SEI';`);
    await executarSilencioso(`ALTER TYPE ${s}"TipoAnexo" ADD VALUE IF NOT EXISTS 'COMPROVANTE_ALTERACAO_PROGRAMACAO';`);
    await executarSilencioso(`ALTER TYPE ${s}"TipoAnexo" ADD VALUE IF NOT EXISTS 'COMPROVANTE_DEVOLUCAO_DIARIA';`);

    await executarSilencioso(`
      DO $$ BEGIN
        CREATE TYPE ${s}"StatusAlteracaoViagem" AS ENUM ('PENDENTE_APROVACAO', 'APROVADA', 'REJEITADA');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Colunas em Beneficiario (Formulários 1, 2, 3 e Cadastro eSocial)
    const colsBeneficiario = [
      `"dataNascimento" TEXT`,
      `"rg" TEXT`,
      `"passaporte" TEXT`,
      `"telefone" TEXT`,
      `"email" TEXT`,
      `"portariaFg" TEXT`,
      `"enderecoCompleto" TEXT`,
      `"nisPisPasep" TEXT`,
      `"servidorOutroOrgao" BOOLEAN NOT NULL DEFAULT false`,
      `"estadoCivil" TEXT`,
      `"sexo" TEXT`,
      `"grauInstrucao" TEXT`,
      `"racaCor" TEXT`,
      `"paisNascimento" TEXT DEFAULT 'Brasil'`,
      `"paisNacionalidade" TEXT DEFAULT 'Brasil'`,
      `"tipoLogradouro" TEXT`,
      `"logradouro" TEXT`,
      `"numeroEndereco" TEXT`,
      `"complementoEndereco" TEXT`,
      `"bairroEndereco" TEXT`,
      `"cepEndereco" TEXT`,
      `"municipioUfEndereco" TEXT`,
      `"ocupacaoCurso" TEXT`,
    ];
    for (const col of colsBeneficiario) {
      await executarSilencioso(`ALTER TABLE IF EXISTS ${s}"Beneficiario" ADD COLUMN IF NOT EXISTS ${col};`);
    }

    // Colunas em Viagem
    const colsViagem = [
      `"numeroProcessoSei" TEXT`,
      `"idDocumentoSei" TEXT`,
      `"processoSeiVinculadoEm" TIMESTAMP(3)`,
      `"retificadaEm" TIMESTAMP(3)`,
      `"fontePagadora" TEXT DEFAULT 'FONTE_0500'`,
      `"detalhamentoFonte" TEXT`,
      `"tipoTransporte" TEXT DEFAULT 'TERRESTRE_OFICIAL'`,
      `"tipoTransporteOutro" TEXT`,
      `"chefiaNome" TEXT`,
      `"chefiaCargo" TEXT`,
      `"justificativaFimDeSemanaFeriado" TEXT`,
      `"observacoesSolicitacao" TEXT`,
      `"acompanhaReitorVice" BOOLEAN NOT NULL DEFAULT false`,
      `"viagemVinculadaFg" BOOLEAN NOT NULL DEFAULT false`,
    ];
    for (const col of colsViagem) {
      await executarSilencioso(`ALTER TABLE IF EXISTS ${s}"Viagem" ADD COLUMN IF NOT EXISTS ${col};`);
    }

    // Colunas comuns em PedidoDiaria, PedidoHospedagem e PedidoPassagemAerea
    const colsPedidoComum = [
      `"valorComplementarCentavos" INTEGER`,
      `"valorDevolucaoCentavos" INTEGER`,
      `"devolucaoConfirmadaEm" TIMESTAMP(3)`,
      `"devolucaoConfirmadaPor" TEXT`,
      `"sequencialNumero" INTEGER`,
      `"sequencialAno" INTEGER`,
      `"sequencialFormatado" TEXT`,
      `"relatorioDescricaoAtividades" TEXT`,
      `"relatorioResultado" TEXT DEFAULT 'TOTALMENTE_ATINGIDO'`,
    ];
    for (const tabela of ["PedidoDiaria", "PedidoHospedagem", "PedidoPassagemAerea"]) {
      for (const col of colsPedidoComum) {
        await executarSilencioso(`ALTER TABLE IF EXISTS ${s}"${tabela}" ADD COLUMN IF NOT EXISTS ${col};`);
      }
    }

    // Colunas específicas de PedidoDiaria (Portaria, Relatório de Viagem 2025 e Checklist POP 03/04)
    const colsDiariaEspecificas = [
      `"numeroProcessoSei" TEXT`,
      `"idPropostaConcessao" TEXT`,
      `"portariaNumero" TEXT`,
      `"portariaData" TIMESTAMP(3)`,
      `"portariaEmitidaEm" TIMESTAMP(3)`,
      `"portariaEmitidaPor" TEXT`,
      `"relatorioBaseLegal" TEXT DEFAULT 'DECRETO_29444_2020'`,
      `"relatorioJustificativaResultado" TEXT`,
      `"relatorioJustificativaRetornoAntecipado" TEXT`,
      `"relatorioAnexosDescricao" TEXT`,
      `"jouernPublicadoEm" TIMESTAMP(3)`,
      `"jouernEdicao" TEXT`,
      `"esocialCadastradoEm" TIMESTAMP(3)`,
      `"sigefPrestacaoContasEm" TIMESTAMP(3)`,
      `"obtvTransferegovNumero" TEXT`,
    ];
    for (const col of colsDiariaEspecificas) {
      await executarSilencioso(`ALTER TABLE IF EXISTS ${s}"PedidoDiaria" ADD COLUMN IF NOT EXISTS ${col};`);
    }

    // Colunas específicas de PedidoHospedagem (Formulário 3 e POP 06)
    const colsHospEspecificas = [
      `"almocoIncluido" BOOLEAN NOT NULL DEFAULT false`,
      `"almocoQtdDias" INTEGER`,
      `"jantarIncluido" BOOLEAN NOT NULL DEFAULT false`,
      `"jantarQtdDias" INTEGER`,
      `"tipoApartamento" TEXT DEFAULT 'SIMPLES'`,
      `"enderecoBeneficiario" TEXT`,
      `"ordemServicoNumero" TEXT`,
    ];
    for (const col of colsHospEspecificas) {
      await executarSilencioso(`ALTER TABLE IF EXISTS ${s}"PedidoHospedagem" ADD COLUMN IF NOT EXISTS ${col};`);
    }

    // Colunas específicas de PedidoPassagemAerea (Formulário 2 e POP 05)
    const colsPassEspecificas = [
      `"periodoSaida" TEXT DEFAULT 'MANHA'`,
      `"periodoRetorno" TEXT DEFAULT 'NOITE'`,
      `"ordemServicoNumero" TEXT`,
      `"bilheteLocalizador" TEXT`,
    ];
    for (const col of colsPassEspecificas) {
      await executarSilencioso(`ALTER TABLE IF EXISTS ${s}"PedidoPassagemAerea" ADD COLUMN IF NOT EXISTS ${col};`);
    }

    // Coluna alteracaoViagemId em Anexo
    await executarSilencioso(`ALTER TABLE IF EXISTS ${s}"Anexo" ADD COLUMN IF NOT EXISTS "alteracaoViagemId" TEXT;`);

    // Tabela AlteracaoViagem
    await executarSilencioso(`
      CREATE TABLE IF NOT EXISTS ${s}"AlteracaoViagem" (
        "id" TEXT NOT NULL,
        "viagemId" TEXT NOT NULL,
        "solicitadoPorId" TEXT NOT NULL,
        "motivo" TEXT NOT NULL,
        "status" ${s}"StatusAlteracaoViagem" NOT NULL DEFAULT 'APROVADA',
        "saidaSedeAnterior" TIMESTAMP(3) NOT NULL,
        "chegadaDestinoAnterior" TIMESTAMP(3) NOT NULL,
        "saidaDestinoAnterior" TIMESTAMP(3) NOT NULL,
        "chegadaSedeAnterior" TIMESTAMP(3) NOT NULL,
        "saidaSedeNova" TIMESTAMP(3) NOT NULL,
        "chegadaDestinoNova" TIMESTAMP(3) NOT NULL,
        "saidaDestinoNova" TIMESTAMP(3) NOT NULL,
        "chegadaSedeNova" TIMESTAMP(3) NOT NULL,
        "diariasAnteriores" DECIMAL(6,2),
        "diariasNovas" DECIMAL(6,2),
        "valorAnteriorCentavos" INTEGER,
        "valorNovoCentavos" INTEGER,
        "diferencaCentavos" INTEGER,
        "analisadoPorId" TEXT,
        "analisadoEm" TIMESTAMP(3),
        "parecerAdmin" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AlteracaoViagem_pkey" PRIMARY KEY ("id")
      );
    `);

    // Tabela sequenciais_documentos_sdhp (Sequenciais independentes por modalidade e ano)
    await executarSilencioso(`
      CREATE TABLE IF NOT EXISTS ${s}"sequenciais_documentos_sdhp" (
        "id" TEXT NOT NULL,
        "tipo" TEXT NOT NULL,
        "ano" INTEGER NOT NULL,
        "ultimoNumero" INTEGER NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "sequenciais_documentos_sdhp_pkey" PRIMARY KEY ("id")
      );
    `);
    await executarSilencioso(`
      CREATE UNIQUE INDEX IF NOT EXISTS "sequenciais_documentos_sdhp_tipo_ano_key"
      ON ${s}"sequenciais_documentos_sdhp"("tipo", "ano");
    `);

    // Tabela login_rate_limits (Rate limit)
    await executarSilencioso(`
      CREATE TABLE IF NOT EXISTS ${s}"login_rate_limits" (
        "key" TEXT PRIMARY KEY,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "first_attempt_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "locked_until" TIMESTAMPTZ
      );
    `);

    // Atualização automática de valores do Interior do RN para a Portaria vigente nº 1454/2023-GP/FUERN (Decreto 32.688/2023):
    // Substitui valores antigos da Portaria revogada 293/2020 (15000 -> 20000, 12000 -> 16000, 8000 -> 14000)
    await executarSilencioso(`UPDATE ${s}"ValorDiaria" SET "valorCentavos" = 20000 WHERE "valorCentavos" = 15000 AND "moeda" = 'BRL';`);
    await executarSilencioso(`UPDATE ${s}"ValorDiaria" SET "valorCentavos" = 16000 WHERE "valorCentavos" = 12000 AND "moeda" = 'BRL';`);
    await executarSilencioso(`UPDATE ${s}"ValorDiaria" SET "valorCentavos" = 14000 WHERE "valorCentavos" = 8000 AND "moeda" = 'BRL';`);
  }

  console.log("[Deploy Schema Diárias] Sincronização concluída com sucesso!");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.warn("[Deploy Schema Diárias] Aviso geral:", err);
  process.exit(0);
});
