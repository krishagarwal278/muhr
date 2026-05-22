-- Creator follower count for fee estimates (self-reported; used by pricing engine).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS follower_count integer;

COMMENT ON COLUMN public.profiles.follower_count IS
  'Self-reported primary social follower count. Powers dashboard fee estimates and tier hints.';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_follower_count_positive
  CHECK (follower_count IS NULL OR follower_count > 0);
