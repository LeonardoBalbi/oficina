import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('pecas')
      .select('*, fornecedores(nome)')
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

    if (!body.nome) {
      return NextResponse.json({ error: 'Nome da peça é obrigatório.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('pecas')
      .insert({
        fornecedor_id: body.fornecedor_id || null,
        nome: String(body.nome).trim(),
        codigo: body.codigo ? String(body.codigo).trim() : null,
        quantidade: Number(body.quantidade || 0),
        estoque_minimo: Number(body.estoque_minimo || 0),
        custo: Number(body.custo || 0),
        preco_venda: Number(body.preco_venda || 0)
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
