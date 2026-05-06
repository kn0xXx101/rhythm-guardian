-- =============================================================================
-- DANGEROUS: Drops EVERY object in schema "public" (all app tables, views, etc.)
--
-- Safe for Supabase: does NOT drop auth/storage/realtime/vault schemas.
-- After this you must re-run migrations (or restore from backup).
--
-- Run with your project's **direct Postgres** connection string:
--   Settings → Database → Connection string → URI → use "Transaction" pooler if needed,
--   or Session mode — NOT the REST URL.
--
-- Examples:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/supabase-nuke-public-schema.sql
--   supabase db execute --file scripts/supabase-nuke-public-schema.sql --linked
-- =============================================================================

DROP SCHEMA IF EXISTS public CASCADE;

CREATE SCHEMA public;

-- Restore permissions Supabase expects for API roles (mirror hosted defaults)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
