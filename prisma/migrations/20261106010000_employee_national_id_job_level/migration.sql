-- Kultiva employee import format: cédula and "Nivel jerárquico". Additive only.

-- CreateEnum
CREATE TYPE "JobLevel" AS ENUM ('STAFF', 'COORDINATOR', 'LEADER', 'MANAGER', 'DIRECTOR');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "jobLevel" "JobLevel",
ADD COLUMN     "nationalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Employee_companyId_nationalId_key" ON "Employee"("companyId", "nationalId");
