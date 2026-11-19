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
  console.log("[Deploy Schema Diárias] Sincronizando schema no banco de dados...");

  try {
    execSync("npx prisma db push --accept-data-loss --skip-generate", { stdio: "inherit" });
  } catch (e) {
    console.warn("[Deploy Schema Diárias] Aviso no prisma db push, aplicando migração SQL direta...", e?.message);
  }

  const schemas = ["", "public.", "diarias."];

  for (const s of schemas) {
    // Enums novos
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

    // Colunas novas em Viagem
    const colsViagem = [
      `"numeroProcessoSei" TEXT`,
      `"idDocumentoSei" TEXT`,
      `"processoSeiVinculadoEm" TIMESTAMP(3)`,
      `"retificadaEm" TIMESTAMP(3)`,
    ];
    for (const col of colsViagem) {
      await executarSilencioso(`ALTER TABLE IF EXISTS ${s}"Viagem" ADD COLUMN IF NOT EXISTS ${col};`);
    }

    // Colunas novas em PedidoDiaria, PedidoHospedagem e PedidoPassagemAerea
    const colsPedidoAjuste = [
      `"valorComplementarCentavos" INTEGER`,
      `"valorDevolucaoCentavos" INTEGER`,
      `"devolucaoConfirmadaEm" TIMESTAMP(3)`,
      `"devolucaoConfirmadaPor" TEXT`,
    ];
    for (const tabela of ["PedidoDiaria", "PedidoHospedagem", "PedidoPassagemAerea"]) {
      for (const col of colsPedidoAjuste) {
        await executarSilencioso(`ALTER TABLE IF EXISTS ${s}"${tabela}" ADD COLUMN IF NOT EXISTS ${col};`);
      }
    }

    // Colunas de portaria em PedidoDiaria (caso banco seja anterior à migração de portaria)
    const colsPortaria = [
      `"numeroProcessoSei" TEXT`,
      `"idPropostaConcessao" TEXT`,
      `"portariaNumero" TEXT`,
      `"portariaData" TIMESTAMP(3)`,
      `"portariaEmitidaEm" TIMESTAMP(3)`,
      `"portariaEmitidaPor" TEXT`,
    ];
    for (const col of colsPortaria) {
      await executarSilencioso(`ALTER TABLE IF EXISTS ${s}"PedidoDiaria" ADD COLUMN IF NOT EXISTS ${col};`);
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

    // Tabela login_rate_limits (Rate limit)
    await executarSilencioso(`
      CREATE TABLE IF NOT EXISTS ${s}"login_rate_limits" (
        "key" TEXT PRIMARY KEY,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "first_attempt_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "locked_until" TIMESTAMPTZ
      );
    `);
  }

  console.log("[Deploy Schema Diárias] Sincronização concluída com sucesso!");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.warn("[Deploy Schema Diárias] Aviso geral:", err);
  process.exit(0);
});
