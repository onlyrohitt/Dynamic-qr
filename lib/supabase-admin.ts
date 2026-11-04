import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  serviceRoleKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: (url, options: any = {}) => {
        // Fast timeout so invalid/offline Supabase credentials don't block the app
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        return fetch(url, {
          ...options,
          signal: controller.signal,
          cache: 'no-store',
        }).finally(() => clearTimeout(timeoutId));
      },
    },
  }
);
