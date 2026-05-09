-- Phase 1: store creator face embeddings in Supabase Postgres (pgvector)
-- This enables similarity search + future monitoring/scanning layers.

-- Enable pgvector (Supabase typically installs extensions in `extensions`)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Add embedding fields to vault assets (store only for face photos)
ALTER TABLE vault_assets
  ADD COLUMN IF NOT EXISTS face_embedding extensions.vector(512),
  ADD COLUMN IF NOT EXISTS face_embedding_model TEXT,
  ADD COLUMN IF NOT EXISTS face_embedding_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (face_embedding_status IN ('pending', 'ready', 'failed')),
  ADD COLUMN IF NOT EXISTS face_embedding_error TEXT,
  ADD COLUMN IF NOT EXISTS face_embedding_created_at TIMESTAMPTZ;

-- Optional: fast similarity search index for future use (safe no-op if already exists).
-- Note: HNSW requires pgvector >= 0.5.0 (available on Supabase projects).
CREATE INDEX IF NOT EXISTS idx_vault_assets_face_embedding_hnsw
  ON vault_assets
  USING hnsw (face_embedding extensions.vector_cosine_ops)
  WHERE asset_type = 'face_photo' AND face_embedding IS NOT NULL;
