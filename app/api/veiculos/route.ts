import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('veiculos')
      .select('*, clientes(nome)')
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

    if (!body.cliente_id || !body.placa || !body.marca || !body.modelo) {
      return NextResponse.json({ error: 'Cliente, placa, marca e modelo sao obrigatorios.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('veiculos')
      .insert({
        cliente_id: body.cliente_id,
        placa: String(body.placa).trim().toUpperCase(),
        marca: String(body.marca).trim(),
        modelo: String(body.modelo).trim(),
        ano: body.ano ? Number(body.ano) : null,
        cor: body.cor ? String(body.cor).trim() : null
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
