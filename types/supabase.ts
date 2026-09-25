/**
 * PLACEHOLDER TYPES.
 *
 * Once your Supabase project is live and the schema in supabase/01_schema.sql
 * has been applied, generate real types with:
 *
 *   npx supabase login
 *   npx supabase link --project-ref <your-project-ref>
 *   npx supabase gen types typescript --linked > types/supabase.ts
 *
 * Until then, this loose type keeps the app compiling.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
