-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "expiresAt" SET DEFAULT (now() + interval '7 days');

-- CreateTable
CREATE TABLE "Photo_Features" (
    "id" SERIAL NOT NULL,
    "endpoint" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Photo_Features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Generated_Photo" (
    "id" SERIAL NOT NULL,
    "feature" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Generated_Photo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Photo_Features_endpoint_key" ON "Photo_Features"("endpoint");

-- CreateIndex
CREATE INDEX "Photo_Features_endpoint_createdAt_idx" ON "Photo_Features"("endpoint", "createdAt");

-- CreateIndex
CREATE INDEX "Generated_Photo_feature_createdAt_idx" ON "Generated_Photo"("feature", "createdAt");
