-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "address" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "settings" JSONB NOT NULL DEFAULT '{}';
