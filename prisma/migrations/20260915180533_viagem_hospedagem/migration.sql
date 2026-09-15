/*
  Warnings:

  - You are about to drop the column `pedidoId` on the `Anexo` table. All the data in the column will be lost.
  - You are about to drop the column `pedidoId` on the `Aprovacao` table. All the data in the column will be lost.
  - You are about to drop the column `pedidoId` on the `Atividade` table. All the data in the column will be lost.
  - You are about to drop the column `beneficiarioId` on the `PedidoDiaria` table. All the data in the column will be lost.
  - You are about to drop the column `chegadaDestino` on the `PedidoDiaria` table. All the data in the column will be lost.
  - You are about to drop the column `chegadaSede` on the `PedidoDiaria` table. All the data in the column will be lost.
  - You are about to drop the column `criadoPorId` on the `PedidoDiaria` table. All the data in the column will be lost.
  - You are about to drop the column `destinoEstado` on the `PedidoDiaria` table. All the data in the column will be lost.
  - You are about to drop the column `finalidade` on the `PedidoDiaria` table. All the data in the column will be lost.
  - You are about to drop the column `kmAeroportoDestino` on the `PedidoDiaria` table. All the data in the column will be lost.
  - You are about to drop the column `kmDeclarado` on the `PedidoDiaria` table. All the data in the column will be lost.
  - You are about to drop the column `kmSedeAeroporto` on the `PedidoDiaria` table. All the data in the column will be lost.
  - You are about to drop the column `kmVoo` on the `PedidoDiaria` table. All the data in the column will be lost.
  - You are about to drop the column `municipioDestino` on the `PedidoDiaria` table. All the data in the column will be lost.
  - You are about to drop the column `saidaDestino` on the `PedidoDiaria` table. All the data in the column will be lost.
  - You are about to drop the column `saidaSede` on the `PedidoDiaria` table. All the data in the column will be lost.
  - You are about to drop the column `sedeCidade` on the `PedidoDiaria` table. All the data in the column will be lost.
  - You are about to drop the column `sedeEstado` on the `PedidoDiaria` table. All the data in the column will be lost.
  - You are about to drop the column `tempoViagemEstimadoMinutos` on the `PedidoDiaria` table. All the data in the column will be lost.
  - You are about to drop the column `unidadeSolicitanteId` on the `PedidoDiaria` table. All the data in the column will be lost.
  - You are about to drop the column `vaiBuscarAeroporto` on the `PedidoDiaria` table. All the data in the column will be lost.
  - Added the required column `viagemId` to the `Atividade` table without a default value. This is not possible if the table is not empty.
  - Added the required column `viagemId` to the `PedidoDiaria` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Anexo" DROP CONSTRAINT "Anexo_pedidoId_fkey";

-- DropForeignKey
ALTER TABLE "Aprovacao" DROP CONSTRAINT "Aprovacao_pedidoId_fkey";

-- DropForeignKey
ALTER TABLE "Atividade" DROP CONSTRAINT "Atividade_pedidoId_fkey";

-- DropForeignKey
ALTER TABLE "PedidoDiaria" DROP CONSTRAINT "PedidoDiaria_beneficiarioId_fkey";

-- DropForeignKey
ALTER TABLE "PedidoDiaria" DROP CONSTRAINT "PedidoDiaria_criadoPorId_fkey";

-- DropForeignKey
ALTER TABLE "PedidoDiaria" DROP CONSTRAINT "PedidoDiaria_unidadeSolicitanteId_fkey";

-- DropIndex
DROP INDEX "Atividade_pedidoId_idx";

-- DropIndex
DROP INDEX "PedidoDiaria_beneficiarioId_idx";

-- DropIndex
DROP INDEX "PedidoDiaria_unidadeSolicitanteId_idx";

-- AlterTable
ALTER TABLE "Anexo" DROP COLUMN "pedidoId",
ADD COLUMN     "pedidoDiariaId" TEXT,
ADD COLUMN     "pedidoHospedagemId" TEXT;

-- AlterTable
ALTER TABLE "Aprovacao" DROP COLUMN "pedidoId",
ADD COLUMN     "pedidoDiariaId" TEXT,
ADD COLUMN     "pedidoHospedagemId" TEXT;

-- AlterTable
ALTER TABLE "Atividade" DROP COLUMN "pedidoId",
ADD COLUMN     "viagemId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CategoriaBeneficiario" ADD COLUMN     "elegivelHospedagem" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PedidoDiaria" DROP COLUMN "beneficiarioId",
DROP COLUMN "chegadaDestino",
DROP COLUMN "chegadaSede",
DROP COLUMN "criadoPorId",
DROP COLUMN "destinoEstado",
DROP COLUMN "finalidade",
DROP COLUMN "kmAeroportoDestino",
DROP COLUMN "kmDeclarado",
DROP COLUMN "kmSedeAeroporto",
DROP COLUMN "kmVoo",
DROP COLUMN "municipioDestino",
DROP COLUMN "saidaDestino",
DROP COLUMN "saidaSede",
DROP COLUMN "sedeCidade",
DROP COLUMN "sedeEstado",
DROP COLUMN "tempoViagemEstimadoMinutos",
DROP COLUMN "unidadeSolicitanteId",
DROP COLUMN "vaiBuscarAeroporto",
ADD COLUMN     "viagemId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Viagem" (
    "id" TEXT NOT NULL,
    "beneficiarioId" TEXT NOT NULL,
    "unidadeSolicitanteId" TEXT NOT NULL,
    "finalidade" TEXT NOT NULL,
    "municipioDestino" TEXT NOT NULL,
    "kmDeclarado" INTEGER NOT NULL,
    "sedeCidade" TEXT NOT NULL,
    "sedeEstado" TEXT NOT NULL,
    "destinoEstado" TEXT NOT NULL,
    "vaiBuscarAeroporto" BOOLEAN NOT NULL DEFAULT false,
    "kmSedeAeroporto" INTEGER,
    "kmVoo" INTEGER,
    "kmAeroportoDestino" INTEGER,
    "tempoViagemEstimadoMinutos" INTEGER,
    "saidaSede" TIMESTAMP(3) NOT NULL,
    "chegadaDestino" TIMESTAMP(3) NOT NULL,
    "saidaDestino" TIMESTAMP(3) NOT NULL,
    "chegadaSede" TIMESTAMP(3) NOT NULL,
    "criadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Viagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoHospedagem" (
    "id" TEXT NOT NULL,
    "viagemId" TEXT NOT NULL,
    "status" "StatusPedido" NOT NULL DEFAULT 'AGUARDANDO_DEFERIMENTO',
    "justificativaPrazoCurto" TEXT,
    "justificativaPrazoAceitaPor" TEXT,
    "cienciaPrazoAtividade" BOOLEAN NOT NULL DEFAULT false,
    "justificativaGestorAtividade" TEXT,
    "justificativaGestorAceitaPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PedidoHospedagem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Viagem_beneficiarioId_idx" ON "Viagem"("beneficiarioId");

-- CreateIndex
CREATE INDEX "Viagem_unidadeSolicitanteId_idx" ON "Viagem"("unidadeSolicitanteId");

-- CreateIndex
CREATE INDEX "PedidoHospedagem_viagemId_idx" ON "PedidoHospedagem"("viagemId");

-- CreateIndex
CREATE INDEX "PedidoHospedagem_status_idx" ON "PedidoHospedagem"("status");

-- CreateIndex
CREATE INDEX "Atividade_viagemId_idx" ON "Atividade"("viagemId");

-- CreateIndex
CREATE INDEX "PedidoDiaria_viagemId_idx" ON "PedidoDiaria"("viagemId");

-- AddForeignKey
ALTER TABLE "Viagem" ADD CONSTRAINT "Viagem_beneficiarioId_fkey" FOREIGN KEY ("beneficiarioId") REFERENCES "Beneficiario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viagem" ADD CONSTRAINT "Viagem_unidadeSolicitanteId_fkey" FOREIGN KEY ("unidadeSolicitanteId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viagem" ADD CONSTRAINT "Viagem_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atividade" ADD CONSTRAINT "Atividade_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "Viagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoDiaria" ADD CONSTRAINT "PedidoDiaria_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "Viagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoHospedagem" ADD CONSTRAINT "PedidoHospedagem_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "Viagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anexo" ADD CONSTRAINT "Anexo_pedidoDiariaId_fkey" FOREIGN KEY ("pedidoDiariaId") REFERENCES "PedidoDiaria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anexo" ADD CONSTRAINT "Anexo_pedidoHospedagemId_fkey" FOREIGN KEY ("pedidoHospedagemId") REFERENCES "PedidoHospedagem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aprovacao" ADD CONSTRAINT "Aprovacao_pedidoDiariaId_fkey" FOREIGN KEY ("pedidoDiariaId") REFERENCES "PedidoDiaria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aprovacao" ADD CONSTRAINT "Aprovacao_pedidoHospedagemId_fkey" FOREIGN KEY ("pedidoHospedagemId") REFERENCES "PedidoHospedagem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
