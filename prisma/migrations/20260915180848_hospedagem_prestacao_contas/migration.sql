-- AlterTable
ALTER TABLE "PedidoHospedagem" ADD COLUMN     "pendenciaRegularizadaEm" TIMESTAMP(3),
ADD COLUMN     "pendenciaRegularizadaPor" TEXT,
ADD COLUMN     "relatorioEnviadoEm" TIMESTAMP(3);
