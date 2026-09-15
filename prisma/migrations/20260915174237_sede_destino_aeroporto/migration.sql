-- AlterTable
ALTER TABLE "PedidoDiaria" ADD COLUMN     "destinoEstado" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "kmAeroportoDestino" INTEGER,
ADD COLUMN     "kmSedeAeroporto" INTEGER,
ADD COLUMN     "kmVoo" INTEGER,
ADD COLUMN     "sedeCidade" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sedeEstado" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "tempoViagemEstimadoMinutos" INTEGER,
ADD COLUMN     "vaiBuscarAeroporto" BOOLEAN NOT NULL DEFAULT false;
