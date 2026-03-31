-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('ELECTRICITY', 'GAS', 'WATER');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'PARTIALLY_PAID');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('INITIATED', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "citizens" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "mobile" VARCHAR(15) NOT NULL,
    "aadhaarHash" VARCHAR(64),
    "aadhaarDocUrl" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "preferredLang" VARCHAR(5) NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "citizens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "kioskId" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "passwordHash" VARCHAR(100) NOT NULL,
    "role" "AdminRole" NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_accounts" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "accountNo" VARCHAR(30) NOT NULL,
    "providerName" VARCHAR(100) NOT NULL,
    "address" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bills" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "billNo" VARCHAR(30) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" DATE NOT NULL,
    "period" VARCHAR(20) NOT NULL,
    "unitsConsumed" DECIMAL(10,2),
    "status" "BillStatus" NOT NULL DEFAULT 'PENDING',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "billId" TEXT,
    "citizenId" TEXT NOT NULL,
    "razorpayOrderId" VARCHAR(50),
    "razorpayPaymentId" VARCHAR(50),
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'INITIATED',
    "paymentMethod" VARCHAR(20),
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT,
    "serviceType" VARCHAR(20) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "docUrl" TEXT,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'SUBMITTED',
    "assignedTo" VARCHAR(50),
    "resolutionNote" TEXT,
    "refNo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "new_connection_requests" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "address" TEXT NOT NULL,
    "propertyType" VARCHAR(20) NOT NULL,
    "docUrl" TEXT,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "remarks" TEXT,
    "refNo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "new_connection_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kiosk_logs" (
    "id" TEXT NOT NULL,
    "kioskId" VARCHAR(20) NOT NULL,
    "citizenId" TEXT,
    "sessionId" TEXT,
    "action" VARCHAR(50) NOT NULL,
    "serviceType" VARCHAR(20),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kiosk_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "citizens_mobile_key" ON "citizens"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "citizens_aadhaarHash_key" ON "citizens"("aadhaarHash");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_citizenId_idx" ON "sessions"("citizenId");

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE INDEX "service_accounts_citizenId_idx" ON "service_accounts"("citizenId");

-- CreateIndex
CREATE INDEX "service_accounts_serviceType_idx" ON "service_accounts"("serviceType");

-- CreateIndex
CREATE UNIQUE INDEX "service_accounts_serviceType_accountNo_key" ON "service_accounts"("serviceType", "accountNo");

-- CreateIndex
CREATE INDEX "bills_accountId_idx" ON "bills"("accountId");

-- CreateIndex
CREATE INDEX "bills_status_idx" ON "bills"("status");

-- CreateIndex
CREATE INDEX "bills_dueDate_idx" ON "bills"("dueDate");

-- CreateIndex
CREATE INDEX "transactions_citizenId_idx" ON "transactions"("citizenId");

-- CreateIndex
CREATE INDEX "transactions_billId_idx" ON "transactions"("billId");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_razorpayOrderId_idx" ON "transactions"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "complaints_refNo_key" ON "complaints"("refNo");

-- CreateIndex
CREATE INDEX "complaints_citizenId_idx" ON "complaints"("citizenId");

-- CreateIndex
CREATE INDEX "complaints_status_idx" ON "complaints"("status");

-- CreateIndex
CREATE INDEX "complaints_serviceType_idx" ON "complaints"("serviceType");

-- CreateIndex
CREATE INDEX "complaints_createdAt_idx" ON "complaints"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "new_connection_requests_refNo_key" ON "new_connection_requests"("refNo");

-- CreateIndex
CREATE INDEX "new_connection_requests_citizenId_idx" ON "new_connection_requests"("citizenId");

-- CreateIndex
CREATE INDEX "new_connection_requests_status_idx" ON "new_connection_requests"("status");

-- CreateIndex
CREATE INDEX "new_connection_requests_serviceType_idx" ON "new_connection_requests"("serviceType");

-- CreateIndex
CREATE INDEX "kiosk_logs_kioskId_idx" ON "kiosk_logs"("kioskId");

-- CreateIndex
CREATE INDEX "kiosk_logs_citizenId_idx" ON "kiosk_logs"("citizenId");

-- CreateIndex
CREATE INDEX "kiosk_logs_action_idx" ON "kiosk_logs"("action");

-- CreateIndex
CREATE INDEX "kiosk_logs_createdAt_idx" ON "kiosk_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "citizens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_accounts" ADD CONSTRAINT "service_accounts_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "citizens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "service_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "citizens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "citizens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "new_connection_requests" ADD CONSTRAINT "new_connection_requests_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "citizens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiosk_logs" ADD CONSTRAINT "kiosk_logs_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "citizens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiosk_logs" ADD CONSTRAINT "kiosk_logs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
