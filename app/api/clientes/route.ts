import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.from('clientes').select('*').order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.nome || !body.telefone) {
      return NextResponse.json({ error: 'Nome e telefone sao obrigatorios.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('clientes')
      .insert({
        nome: String(body.nome).trim(),
        telefone: String(body.telefone).trim(),
        email: body.email ? String(body.email).trim() : null,
        endereco: body.endereco ? String(body.endereco).trim() : null
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}

function serverError(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Erro inesperado no servidor.' },
    { status: 500 }
  );
}
