-- CreateTable
CREATE TABLE "NexrenderJob" (
    "id" SERIAL NOT NULL,
    "nexrenderId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "composition" TEXT NOT NULL DEFAULT 'main',
    "status" TEXT NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "outputUrl" TEXT,
    "error" TEXT,
    "assets" JSONB,
    "renderDuration" INTEGER,
    "webhookReceived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "NexrenderJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NexrenderJob_nexrenderId_key" ON "NexrenderJob"("nexrenderId");

-- CreateIndex
CREATE INDEX "NexrenderJob_nexrenderId_idx" ON "NexrenderJob"("nexrenderId");

-- CreateIndex
CREATE INDEX "NexrenderJob_status_idx" ON "NexrenderJob"("status");

-- CreateIndex
CREATE INDEX "NexrenderJob_createdAt_idx" ON "NexrenderJob"("createdAt");
