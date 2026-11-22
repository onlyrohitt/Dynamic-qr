
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Supabase configuration missing. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.'
  );
}

if (!supabaseUrl.startsWith('https://') || supabaseUrl.includes('placeholder')) {
  throw new Error('Invalid Supabase URL. Check your environment variables.');
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: (url, options = {}) =>
        fetch(url, {
          ...options,
          cache: 'no-store',
        }),
    },
  }
);
