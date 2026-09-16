-- AlterTable
ALTER TABLE "Beneficiario" ADD COLUMN     "cargo" TEXT,
ADD COLUMN     "matricula" TEXT;

-- AlterTable
ALTER TABLE "ConfiguracaoSistema" ADD COLUMN     "assinante1Cargo" TEXT,
ADD COLUMN     "assinante1Nome" TEXT,
ADD COLUMN     "assinante2Cargo" TEXT,
ADD COLUMN     "assinante2Nome" TEXT,
ADD COLUMN     "dataPortariaDelegacao" TIMESTAMP(3),
ADD COLUMN     "numeroPortariaDelegacao" TEXT;

-- AlterTable
ALTER TABLE "PedidoDiaria" ADD COLUMN     "idPropostaConcessao" TEXT,
ADD COLUMN     "numeroProcessoSei" TEXT,
ADD COLUMN     "portariaData" TIMESTAMP(3),
ADD COLUMN     "portariaEmitidaEm" TIMESTAMP(3),
ADD COLUMN     "portariaEmitidaPor" TEXT,
ADD COLUMN     "portariaNumero" TEXT;
