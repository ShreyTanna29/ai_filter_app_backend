-- DropIndex
DROP INDEX "Features_endpoint_idx";

-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "expiresAt" SET DEFAULT (now() + interval '7 days');

-- CreateIndex
CREATE INDEX "Features_endpoint_createdAt_idx" ON "Features"("endpoint", "createdAt");
