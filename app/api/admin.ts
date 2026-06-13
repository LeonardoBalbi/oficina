import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function requireAdmin(req: Request) {
  const userId = req.headers.get('x-app-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Acesso administrativo obrigatório.' }, { status: 403 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('app_usuarios')
    .select('perfil, ativo')
    .eq('id', userId)
    .eq('ativo', true)
    .single();

  if (error || data?.perfil !== 'admin') {
    return NextResponse.json({ error: 'Acesso permitido apenas para administradores.' }, { status: 403 });
  }

  return null;
}
