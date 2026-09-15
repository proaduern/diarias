-- AlterTable
ALTER TABLE "Anexo" ADD COLUMN     "pedidoPassagemAereaId" TEXT;

-- AlterTable
ALTER TABLE "Aprovacao" ADD COLUMN     "pedidoPassagemAereaId" TEXT;

-- AlterTable
ALTER TABLE "PedidoHospedagem" ADD COLUMN     "valorCotadoEm" TIMESTAMP(3),
ADD COLUMN     "valorCotadoPor" TEXT,
ADD COLUMN     "valorTotalCentavos" INTEGER;

-- CreateTable
CREATE TABLE "PedidoPassagemAerea" (
    "id" TEXT NOT NULL,
    "viagemId" TEXT NOT NULL,
    "status" "StatusPedido" NOT NULL DEFAULT 'AGUARDANDO_DEFERIMENTO',
    "valorTotalCentavos" INTEGER,
    "valorCotadoPor" TEXT,
    "valorCotadoEm" TIMESTAMP(3),
    "justificativaPrazoCurto" TEXT,
    "justificativaPrazoAceitaPor" TEXT,
    "cienciaPrazoAtividade" BOOLEAN NOT NULL DEFAULT false,
    "justificativaGestorAtividade" TEXT,
    "justificativaGestorAceitaPor" TEXT,
    "relatorioEnviadoEm" TIMESTAMP(3),
    "pendenciaRegularizadaEm" TIMESTAMP(3),
    "pendenciaRegularizadaPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PedidoPassagemAerea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PedidoPassagemAerea_viagemId_idx" ON "PedidoPassagemAerea"("viagemId");

-- CreateIndex
CREATE INDEX "PedidoPassagemAerea_status_idx" ON "PedidoPassagemAerea"("status");

-- AddForeignKey
ALTER TABLE "PedidoPassagemAerea" ADD CONSTRAINT "PedidoPassagemAerea_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "Viagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anexo" ADD CONSTRAINT "Anexo_pedidoPassagemAereaId_fkey" FOREIGN KEY ("pedidoPassagemAereaId") REFERENCES "PedidoPassagemAerea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aprovacao" ADD CONSTRAINT "Aprovacao_pedidoPassagemAereaId_fkey" FOREIGN KEY ("pedidoPassagemAereaId") REFERENCES "PedidoPassagemAerea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
