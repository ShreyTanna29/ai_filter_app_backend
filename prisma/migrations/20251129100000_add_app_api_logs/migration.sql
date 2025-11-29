-- CreateTable
CREATE TABLE "AppApiLog" (
    "id" SERIAL NOT NULL,
    "appId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "featureType" TEXT NOT NULL,
    "model" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "responseTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppApiLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppApiLog_appId_idx" ON "AppApiLog"("appId");

-- CreateIndex
CREATE INDEX "AppApiLog_appId_createdAt_idx" ON "AppApiLog"("appId", "createdAt");

-- CreateIndex
CREATE INDEX "AppApiLog_endpoint_idx" ON "AppApiLog"("endpoint");

-- AddForeignKey
ALTER TABLE "AppApiLog" ADD CONSTRAINT "AppApiLog_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
