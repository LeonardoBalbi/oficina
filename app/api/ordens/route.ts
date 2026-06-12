import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const statuses = ['aberta', 'andamento', 'finalizada', 'cancelada'] as const;

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('ordens_servico')
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

    if (!body.cliente_id || !body.veiculo_id || !body.descricao_problema) {
      return NextResponse.json({ error: 'Cliente, veiculo e problema relatado sao obrigatorios.' }, { status: 400 });
    }

    const status = statuses.includes(body.status) ? body.status : 'aberta';
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('ordens_servico')
      .insert({
        cliente_id: body.cliente_id,
        veiculo_id: body.veiculo_id,
        descricao_problema: String(body.descricao_problema).trim(),
        status,
        valor_estimado: Number(body.valor_estimado || 0),
        data_entrada: body.data_entrada || new Date().toISOString().slice(0, 10),
        data_saida: status === 'finalizada' ? new Date().toISOString().slice(0, 10) : null
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    if (!body.id || !statuses.includes(body.status)) {
      return NextResponse.json({ error: 'ID da ordem e status valido sao obrigatorios.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('ordens_servico')
      .update({
        status: body.status,
        data_saida: body.status === 'finalizada' ? new Date().toISOString().slice(0, 10) : null
      })
      .eq('id', body.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
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
