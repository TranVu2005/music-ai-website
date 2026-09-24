-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Add the required column while retaining existing rows, then remove the temporary default.
ALTER TABLE "tracks" ADD COLUMN "search_text" TEXT NOT NULL DEFAULT '';
ALTER TABLE "tracks" ALTER COLUMN "search_text" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "tracks_search_text_idx" ON "tracks" USING GIN ("search_text" gin_trgm_ops);
