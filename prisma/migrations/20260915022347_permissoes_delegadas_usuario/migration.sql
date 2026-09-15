-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "podeEditarBeneficiarios" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "podeImportarUsuarios" BOOLEAN NOT NULL DEFAULT false;
