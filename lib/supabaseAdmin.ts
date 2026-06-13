import { SupabaseClient, createClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env ou .env.local.');
  }

  const hasExampleValues = supabaseUrl.includes('SEU-PROJETO') || serviceRoleKey.includes('SUA_SERVICE_ROLE_KEY');

  if (hasExampleValues) {
    throw new Error('Substitua os valores de exemplo do Supabase no .env ou .env.local pelos dados reais do seu projeto.');
  }

  try {
    new URL(supabaseUrl);
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL deve ser uma URL valida do Supabase, por exemplo https://abc123.supabase.co.');
  }

  if (!client) {
    client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });
  }

  return client;
}
