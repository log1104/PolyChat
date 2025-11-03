import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';

// Load env proactively from multiple likely locations (works in src and dist)
const triedPaths: string[] = [];
const tryLoad = (p: string) => {
  triedPaths.push(p);
  dotenv.config({ path: p, override: false });
};

// 1) Current working directory (when running via pnpm from repo root)
tryLoad(path.resolve(process.cwd(), '.env'));
// 2) Package-level .env (works for both src/* and dist/* at runtime)
tryLoad(path.resolve(__dirname, '../../.env'));
// 3) Monorepo root .env as a last fallback
tryLoad(path.resolve(__dirname, '../../../../.env'));

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  const where = triedPaths.join(', ');
  throw new Error(
    `Missing Supabase configuration. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set. Tried: ${where}`
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false
  }
});
