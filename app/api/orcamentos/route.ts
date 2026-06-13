import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const statuses = ['rascunho', 'enviado', 'aprovado', 'recusado'] as const;

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('orcamentos')
      .select('*, clientes(nome, telefone), veiculos(placa, marca, modelo)')
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

    if (!body.cliente_id || !body.descricao) {
      return NextResponse.json({ error: 'Cliente e descrição do orçamento são obrigatórios.' }, { status: 400 });
    }

    const status = statuses.includes(body.status) ? body.status : 'rascunho';
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('orcamentos')
      .insert({
        cliente_id: body.cliente_id,
        veiculo_id: body.veiculo_id || null,
        descricao: String(body.descricao).trim(),
        valor_total: Number(body.valor_total || 0),
        status,
        validade: body.validade || null
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
