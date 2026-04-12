/*
  Warnings:

  - Added the required column `registeredMobile` to the `service_accounts` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReadingStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- AlterEnum
ALTER TYPE "BillStatus" ADD VALUE 'PAYMENT_IN_PROGRESS';

-- AlterTable
ALTER TABLE "service_accounts" ADD COLUMN     "registeredMobile" VARCHAR(15);

-- Backfill existing rows using linked citizen mobile
UPDATE "service_accounts" sa
SET "registeredMobile" = c."mobile"
FROM "citizens" c
WHERE sa."citizenId" = c."id";

-- Safety check before enforcing NOT NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "service_accounts"
        WHERE "registeredMobile" IS NULL
    ) THEN
        RAISE EXCEPTION 'Cannot set service_accounts.registeredMobile to NOT NULL: NULL values found after backfill.';
    END IF;
END $$;

ALTER TABLE "service_accounts" ALTER COLUMN "registeredMobile" SET NOT NULL;

-- CreateTable
CREATE TABLE "meter_readings" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "citizenId" TEXT,
    "readingValue" DECIMAL(12,2) NOT NULL,
    "previousReadingValue" DECIMAL(12,2) NOT NULL,
    "unitsConsumed" DECIMAL(12,2) NOT NULL,
    "photoUrl" TEXT,
    "verificationStatus" "ReadingStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "rejectionReason" TEXT,

    CONSTRAINT "meter_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_configs" (
    "id" TEXT NOT NULL,
    "providerName" VARCHAR(100) NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "lateFeeRatePerMonth" DECIMAL(5,4) NOT NULL DEFAULT 0.0150,
    "lateFeGraceDays" INTEGER NOT NULL DEFAULT 0,
    "lateFeeCap" DECIMAL(5,4),
    "paymentTimeoutMin" INTEGER NOT NULL DEFAULT 15,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meter_readings_accountId_idx" ON "meter_readings"("accountId");

-- CreateIndex
CREATE INDEX "meter_readings_citizenId_idx" ON "meter_readings"("citizenId");

-- CreateIndex
CREATE INDEX "meter_readings_verificationStatus_idx" ON "meter_readings"("verificationStatus");

-- CreateIndex
CREATE INDEX "meter_readings_submittedAt_idx" ON "meter_readings"("submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "provider_configs_providerName_key" ON "provider_configs"("providerName");

-- AddForeignKey
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "service_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "citizens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
