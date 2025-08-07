-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "expiresAt" SET DEFAULT (now() + interval '7 days');

-- CreateTable
CREATE TABLE "TemplateStepVideo" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateStepVideo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TemplateStepVideo" ADD CONSTRAINT "TemplateStepVideo_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
