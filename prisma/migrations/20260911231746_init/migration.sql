-- CreateEnum
CREATE TYPE "PerfilUsuario" AS ENUM ('ADMIN', 'DEMANDANTE');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('AGUARDANDO_JUSTIFICATIVA_PRAZO', 'AGUARDANDO_DELIBERACAO_LIMITE', 'AGUARDANDO_DEFERIMENTO', 'DEFERIDO', 'INDEFERIDO');

-- CreateEnum
CREATE TYPE "TipoAnexo" AS ENUM ('AUTORIZACAO_LIMITE', 'RELATORIO_VIAGEM');

-- CreateTable
CREATE TABLE "Unidade" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "PerfilUsuario" NOT NULL DEFAULT 'DEMANDANTE',
    "unidadeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoriaBeneficiario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "limiteAnualDias" INTEGER NOT NULL DEFAULT 60,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoriaBeneficiario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoDestino" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipoDestino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValorDiaria" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "tipoDestinoId" TEXT NOT NULL,
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "valorCentavos" INTEGER NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValorDiaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Beneficiario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeNormalizado" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "banco" TEXT NOT NULL,
    "agencia" TEXT NOT NULL,
    "contaCorrente" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "unidadeVinculoId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Beneficiario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoDiaria" (
    "id" TEXT NOT NULL,
    "beneficiarioId" TEXT NOT NULL,
    "unidadeSolicitanteId" TEXT NOT NULL,
    "tipoDestinoId" TEXT NOT NULL,
    "municipioDestino" TEXT NOT NULL,
    "finalidade" TEXT NOT NULL,
    "kmDeclarado" INTEGER NOT NULL,
    "saidaSede" TIMESTAMP(3) NOT NULL,
    "chegadaDestino" TIMESTAMP(3) NOT NULL,
    "saidaDestino" TIMESTAMP(3) NOT NULL,
    "chegadaSede" TIMESTAMP(3) NOT NULL,
    "noites" INTEGER,
    "ultimaNoiteQualifica" BOOLEAN,
    "diarias" DECIMAL(6,2),
    "valorUnitarioCentavos" INTEGER,
    "valorTotalCentavos" INTEGER,
    "status" "StatusPedido" NOT NULL DEFAULT 'AGUARDANDO_DEFERIMENTO',
    "justificativaPrazoCurto" TEXT,
    "justificativaPrazoAceitaPor" TEXT,
    "relatorioEnviadoEm" TIMESTAMP(3),
    "pendenciaRegularizadaEm" TIMESTAMP(3),
    "pendenciaRegularizadaPor" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PedidoDiaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anexo" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "tipo" "TipoAnexo" NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "enviadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Anexo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aprovacao" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "aprovadorId" TEXT NOT NULL,
    "decisao" TEXT NOT NULL,
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aprovacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrcamentoUnidade" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "valorTotalCentavos" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrcamentoUnidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracaoSistema" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "limiteMensalDiarias" INTEGER NOT NULL DEFAULT 10,
    "prazoMinimoDiasAntecedencia" INTEGER NOT NULL DEFAULT 5,
    "prazoRelatorioDiasUteis" INTEGER NOT NULL DEFAULT 5,
    "prazoDevolucaoDiasCorridos" INTEGER NOT NULL DEFAULT 30,
    "kmMinimoSemPernoite" INTEGER NOT NULL DEFAULT 40,
    "duracaoMinimaHoras" INTEGER NOT NULL DEFAULT 6,

    CONSTRAINT "ConfiguracaoSistema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_cpf_key" ON "Usuario"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaBeneficiario_nome_key" ON "CategoriaBeneficiario"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "TipoDestino_nome_key" ON "TipoDestino"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "ValorDiaria_categoriaId_tipoDestinoId_key" ON "ValorDiaria"("categoriaId", "tipoDestinoId");

-- CreateIndex
CREATE UNIQUE INDEX "Beneficiario_cpf_key" ON "Beneficiario"("cpf");

-- CreateIndex
CREATE INDEX "PedidoDiaria_beneficiarioId_idx" ON "PedidoDiaria"("beneficiarioId");

-- CreateIndex
CREATE INDEX "PedidoDiaria_unidadeSolicitanteId_idx" ON "PedidoDiaria"("unidadeSolicitanteId");

-- CreateIndex
CREATE INDEX "PedidoDiaria_status_idx" ON "PedidoDiaria"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OrcamentoUnidade_unidadeId_ano_key" ON "OrcamentoUnidade"("unidadeId", "ano");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValorDiaria" ADD CONSTRAINT "ValorDiaria_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaBeneficiario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValorDiaria" ADD CONSTRAINT "ValorDiaria_tipoDestinoId_fkey" FOREIGN KEY ("tipoDestinoId") REFERENCES "TipoDestino"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beneficiario" ADD CONSTRAINT "Beneficiario_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaBeneficiario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beneficiario" ADD CONSTRAINT "Beneficiario_unidadeVinculoId_fkey" FOREIGN KEY ("unidadeVinculoId") REFERENCES "Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoDiaria" ADD CONSTRAINT "PedidoDiaria_beneficiarioId_fkey" FOREIGN KEY ("beneficiarioId") REFERENCES "Beneficiario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoDiaria" ADD CONSTRAINT "PedidoDiaria_unidadeSolicitanteId_fkey" FOREIGN KEY ("unidadeSolicitanteId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoDiaria" ADD CONSTRAINT "PedidoDiaria_tipoDestinoId_fkey" FOREIGN KEY ("tipoDestinoId") REFERENCES "TipoDestino"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoDiaria" ADD CONSTRAINT "PedidoDiaria_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anexo" ADD CONSTRAINT "Anexo_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoDiaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aprovacao" ADD CONSTRAINT "Aprovacao_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoDiaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aprovacao" ADD CONSTRAINT "Aprovacao_aprovadorId_fkey" FOREIGN KEY ("aprovadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoUnidade" ADD CONSTRAINT "OrcamentoUnidade_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
