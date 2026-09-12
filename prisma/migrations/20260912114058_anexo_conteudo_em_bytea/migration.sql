-- AlterTable
ALTER TABLE "Anexo" ADD COLUMN     "conteudo" BYTEA,
ALTER COLUMN "caminho" DROP NOT NULL;
