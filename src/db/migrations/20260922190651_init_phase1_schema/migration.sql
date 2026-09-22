-- CreateEnum
CREATE TYPE "role" AS ENUM ('admin', 'customer');

-- CreateEnum
CREATE TYPE "track_status" AS ENUM ('draft', 'published', 'reserved', 'sold_exclusive', 'archived');

-- CreateEnum
CREATE TYPE "custom_request_status" AS ENUM ('submitted', 'quoted', 'deposit_pending', 'in_progress', 'demo_sent', 'revising', 'approved', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR NOT NULL,
    "password_hash" VARCHAR NOT NULL,
    "full_name" VARCHAR NOT NULL,
    "phone_number" VARCHAR,
    "role" "role" NOT NULL DEFAULT 'customer',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR NOT NULL,
    "slug" VARCHAR NOT NULL,
    "description" TEXT,
    "genre" VARCHAR NOT NULL,
    "mood" VARCHAR NOT NULL,
    "bpm" INTEGER,
    "duration_seconds" INTEGER NOT NULL,
    "preview_file_url" VARCHAR NOT NULL,
    "original_file_key" VARCHAR,
    "cover_image_url" VARCHAR,
    "status" "track_status" NOT NULL DEFAULT 'draft',
    "reserved_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "customer_name" VARCHAR NOT NULL,
    "customer_email" VARCHAR NOT NULL,
    "customer_phone" VARCHAR,
    "brief_description" TEXT NOT NULL,
    "reference_links" TEXT,
    "genre_preference" VARCHAR,
    "target_duration" VARCHAR,
    "budget_estimate" BIGINT,
    "quoted_price" BIGINT,
    "deposit_percent" INTEGER,
    "deposit_amount" BIGINT,
    "remaining_amount" BIGINT,
    "status" "custom_request_status" NOT NULL DEFAULT 'submitted',
    "final_file_key" VARCHAR,
    "revision_limit" INTEGER NOT NULL DEFAULT 2,
    "revision_used" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tracks_slug_key" ON "tracks"("slug");

-- CreateIndex
CREATE INDEX "tracks_status_idx" ON "tracks"("status");

-- CreateIndex
CREATE INDEX "tracks_genre_idx" ON "tracks"("genre");

-- CreateIndex
CREATE INDEX "tracks_mood_idx" ON "tracks"("mood");

-- CreateIndex
CREATE INDEX "tracks_created_at_idx" ON "tracks"("created_at");

-- CreateIndex
CREATE INDEX "custom_requests_status_idx" ON "custom_requests"("status");

-- CreateIndex
CREATE INDEX "custom_requests_created_at_idx" ON "custom_requests"("created_at");

-- CreateIndex
CREATE INDEX "custom_requests_user_id_idx" ON "custom_requests"("user_id");

-- AddForeignKey
ALTER TABLE "custom_requests" ADD CONSTRAINT "custom_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
