/**
 * Supabase ADMIN client — uses the service role key.
 * ⚠️  ONLY import this in server-side code (API routes, Server Components).
 *     NEVER import this in client components or pages rendered in the browser.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'This file must only be used server-side.'
  );
}

// createClient is safe to call once per module in a serverless environment
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
