import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const usuario = String(body.usuario || '').trim().toLowerCase();
    const senha = String(body.senha || '');

    if (!usuario || !senha) {
      return NextResponse.json({ error: 'Usuário e senha são obrigatórios.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('app_usuarios')
      .select('id, nome, usuario, perfil, mecanico_id, permissoes, ativo, senha_hash')
      .eq('usuario', usuario)
      .eq('ativo', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Erro ao consultar usuários. Execute o SQL atualizado no Supabase.' },
        { status: 500 }
      );
    }

    if (!data || data.senha_hash !== hashPassword(senha)) {
      return NextResponse.json({ error: 'Usuário ou senha inválidos.' }, { status: 401 });
    }

    const { senha_hash, ...user } = data;
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro inesperado no servidor.' },
      { status: 500 }
    );
  }
}
