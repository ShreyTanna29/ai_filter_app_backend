-- DropIndex
DROP INDEX "GeneratedVideo_feature_idx";

-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "expiresAt" SET DEFAULT (now() + interval '7 days');

-- CreateIndex
CREATE INDEX "GeneratedVideo_feature_createdAt_idx" ON "GeneratedVideo"("feature", "createdAt");
