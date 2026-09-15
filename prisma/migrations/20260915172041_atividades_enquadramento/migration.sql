-- CreateEnum
CREATE TYPE "CategoriaAtividade" AS ENUM ('ACADEMICA', 'ADMINISTRATIVA');

-- AlterEnum
ALTER TYPE "StatusPedido" ADD VALUE 'AGUARDANDO_JUSTIFICATIVA_ATIVIDADE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoAnexo" ADD VALUE 'PLANO_AULA';
ALTER TYPE "TipoAnexo" ADD VALUE 'COMPROVANTE_ATIVIDADE';

-- AlterTable
ALTER TABLE "Anexo" ADD COLUMN     "atividadeId" TEXT;

-- AlterTable
ALTER TABLE "PedidoDiaria" ADD COLUMN     "cienciaPrazoAtividade" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "justificativaGestorAceitaPor" TEXT,
ADD COLUMN     "justificativaGestorAtividade" TEXT;

-- CreateTable
CREATE TABLE "EnquadramentoAtividade" (
    "id" TEXT NOT NULL,
    "categoria" "CategoriaAtividade" NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "exigeDetalhamento" BOOLEAN NOT NULL DEFAULT false,
    "exigeAnexo" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnquadramentoAtividade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Atividade" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "enquadramentoId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "detalhamento" TEXT,
    "dataHoraInicio" TIMESTAMP(3) NOT NULL,
    "dataHoraFim" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Atividade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnquadramentoAtividade_categoria_nome_key" ON "EnquadramentoAtividade"("categoria", "nome");

-- CreateIndex
CREATE INDEX "Atividade_pedidoId_idx" ON "Atividade"("pedidoId");

-- AddForeignKey
ALTER TABLE "Atividade" ADD CONSTRAINT "Atividade_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoDiaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atividade" ADD CONSTRAINT "Atividade_enquadramentoId_fkey" FOREIGN KEY ("enquadramentoId") REFERENCES "EnquadramentoAtividade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anexo" ADD CONSTRAINT "Anexo_atividadeId_fkey" FOREIGN KEY ("atividadeId") REFERENCES "Atividade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
