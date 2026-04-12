-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "account_verification_requests" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "consumerNo" VARCHAR(30) NOT NULL,
    "accountHolderName" VARCHAR(100) NOT NULL,
    "registeredMobile" VARCHAR(15) NOT NULL,
    "address" TEXT NOT NULL,
    "proofDocUrl" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "refNo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_verification_requests_refNo_key" ON "account_verification_requests"("refNo");

-- CreateIndex
CREATE INDEX "account_verification_requests_citizenId_idx" ON "account_verification_requests"("citizenId");

-- CreateIndex
CREATE INDEX "account_verification_requests_consumerNo_idx" ON "account_verification_requests"("consumerNo");

-- CreateIndex
CREATE INDEX "account_verification_requests_status_idx" ON "account_verification_requests"("status");

-- CreateIndex
CREATE INDEX "account_verification_requests_serviceType_idx" ON "account_verification_requests"("serviceType");

-- AddForeignKey
ALTER TABLE "account_verification_requests" ADD CONSTRAINT "account_verification_requests_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "citizens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
