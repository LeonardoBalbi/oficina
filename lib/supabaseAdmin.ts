import { SupabaseClient, createClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local ou na Vercel.');
  }

  if (!client) {
    client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });
  }

  return client;
}
