/*
  Warnings:

  - Added the required column `contratoId` to the `PedidoHospedagem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contratoId` to the `PedidoPassagemAerea` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoBeneficioContrato" AS ENUM ('HOSPEDAGEM', 'PASSAGEM_AEREA', 'PASSAGEM_TERRESTRE');

-- AlterTable
ALTER TABLE "PedidoHospedagem" ADD COLUMN     "contratoId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PedidoPassagemAerea" ADD COLUMN     "contratoId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Contrato" (
    "id" TEXT NOT NULL,
    "tipoBeneficio" "TipoBeneficioContrato" NOT NULL,
    "empresaNome" TEXT NOT NULL,
    "empresaCnpj" TEXT NOT NULL,
    "numeroContrato" TEXT NOT NULL,
    "numeroProcessoSei" TEXT NOT NULL,
    "vigenciaInicio" TIMESTAMP(3) NOT NULL,
    "vigenciaFim" TIMESTAMP(3) NOT NULL,
    "valorTotalCentavos" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotaContratoUnidade" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "cotaCentavos" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CotaContratoUnidade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contrato_tipoBeneficio_idx" ON "Contrato"("tipoBeneficio");

-- CreateIndex
CREATE UNIQUE INDEX "CotaContratoUnidade_contratoId_unidadeId_key" ON "CotaContratoUnidade"("contratoId", "unidadeId");

-- AddForeignKey
ALTER TABLE "PedidoHospedagem" ADD CONSTRAINT "PedidoHospedagem_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoPassagemAerea" ADD CONSTRAINT "PedidoPassagemAerea_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotaContratoUnidade" ADD CONSTRAINT "CotaContratoUnidade_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotaContratoUnidade" ADD CONSTRAINT "CotaContratoUnidade_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
