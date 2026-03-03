ALTER TABLE "Photo" RENAME COLUMN "filename" TO "imageUrl";
ALTER TABLE "Photo" ADD COLUMN "storageKey" TEXT;
