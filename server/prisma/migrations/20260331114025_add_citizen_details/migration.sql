-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- DropIndex
DROP INDEX "citizens_aadhaarHash_key";

-- AlterTable
ALTER TABLE "citizens" ADD COLUMN     "address" TEXT,
ADD COLUMN     "dateOfBirth" DATE,
ADD COLUMN     "email" VARCHAR(150),
ADD COLUMN     "gender" "Gender";
