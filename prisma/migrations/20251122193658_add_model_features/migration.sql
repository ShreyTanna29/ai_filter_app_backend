-- Migration file to add the optional 'model' field to the "Features" table.

-- Add the new column "model"
ALTER TABLE "Features"
ADD COLUMN "model" TEXT;