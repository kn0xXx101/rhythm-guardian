# Supabase Type Generation

This document describes how to generate TypeScript types from your Supabase database schema.

## Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link to your Supabase project (if not using local development):
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

## Generating Types

### Using npm scripts:

```bash
# Auto-detect (tries local first, then linked)
npm run types:generate

# Generate from local Supabase instance
npm run types:generate:local

# Generate from linked Supabase project
npm run types:generate:linked
```

### Using Supabase CLI directly:

```bash
# From local Supabase instance
supabase gen types typescript --local > src/types/supabase.ts

# From linked Supabase project
supabase gen types typescript --linked > src/types/supabase.ts
```

## When to Generate Types

Generate types when:
- You add new tables to the database
- You modify table schemas (add/remove columns)
- You add new database functions
- You modify enum types
- After running migrations

## Type Generation Workflow

1. Make database schema changes via migrations
2. Apply migrations to your database
3. Run `npm run types:generate`
4. Review generated types in `src/types/supabase.ts`
5. Fix any TypeScript errors caused by type changes
6. Commit both migration files and updated types

## Notes

- The generated types will overwrite `src/types/supabase.ts`
- Always review generated types before committing
- Keep migration files and types in sync
- Types are generated from the actual database schema, not migration files

