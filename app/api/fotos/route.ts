import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const tipos = ['antes', 'depois'] as const;

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('fotos_os')
      .select('*, ordens_servico(descricao_problema, veiculos(placa, marca, modelo))')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.ordem_id || !body.url || !tipos.includes(body.tipo)) {
      return NextResponse.json({ error: 'Ordem, tipo e URL da foto sao obrigatorios.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('fotos_os')
      .insert({
        ordem_id: body.ordem_id,
        tipo: body.tipo,
        url: String(body.url).trim(),
        legenda: body.legenda ? String(body.legenda).trim() : null
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
