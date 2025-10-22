-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "expiresAt" SET DEFAULT (now() + interval '7 days');

-- CreateIndex
CREATE INDEX "Features_endpoint_idx" ON "Features"("endpoint");

-- CreateIndex
CREATE INDEX "GeneratedVideo_feature_idx" ON "GeneratedVideo"("feature");

-- CreateIndex
CREATE INDEX "Subcategory_categoryId_idx" ON "Subcategory"("categoryId");

-- CreateIndex
CREATE INDEX "Subcategory_templateId_idx" ON "Subcategory"("templateId");

-- CreateIndex
CREATE INDEX "Template_categoryId_idx" ON "Template"("categoryId");

-- CreateIndex
CREATE INDEX "TemplateStep_subcategoryId_order_idx" ON "TemplateStep"("subcategoryId", "order");
