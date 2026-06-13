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
    const marcaManual = String(body.nova_marca || body.marca || '').trim();
    const modeloManual = String(body.novo_modelo || body.modelo || '').trim();

    if (!body.cliente_id || !body.placa || (!body.marca_id && !marcaManual) || (!body.modelo_id && !modeloManual)) {
      return NextResponse.json({ error: 'Cliente, placa, marca e modelo sao obrigatorios.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const catalogo = await resolverCatalogoVeiculo(body.marca_id, body.modelo_id, marcaManual, modeloManual);
    const { data, error } = await supabaseAdmin
      .from('veiculos')
      .insert({
        cliente_id: body.cliente_id,
        placa: String(body.placa).trim().toUpperCase(),
        marca: catalogo.marca,
        modelo: catalogo.modelo,
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

async function resolverCatalogoVeiculo(marcaId: unknown, modeloId: unknown, marcaManual: string, modeloManual: string) {
  const supabaseAdmin = getSupabaseAdmin();
  let marca = marcaManual;
  let modelo = modeloManual;

  if (marcaId && marcaId !== '__nova__') {
    const { data } = await supabaseAdmin
      .from('marcas_veiculos')
      .select('nome')
      .eq('id', String(marcaId))
      .maybeSingle();

    marca = data?.nome || String(marcaId).split('::')[0] || marca;
  }

  if (modeloId && modeloId !== '__novo__') {
    const { data } = await supabaseAdmin
      .from('modelos_veiculos')
      .select('nome, marcas_veiculos(nome)')
      .eq('id', String(modeloId))
      .maybeSingle();

    modelo = data?.nome || String(modeloId).split('::')[1] || modelo;
    marca = (data?.marcas_veiculos as { nome?: string } | null)?.nome || marca;
  }

  await salvarNoCatalogo(marca, modelo);

  return { marca, modelo };
}

async function salvarNoCatalogo(marca: string, modelo: string) {
  if (!marca || !modelo) return;

  const supabaseAdmin = getSupabaseAdmin();
  const { data: marcaData, error: marcaError } = await supabaseAdmin
    .from('marcas_veiculos')
    .upsert({ nome: marca }, { onConflict: 'nome' })
    .select('id')
    .single();

  if (marcaError || !marcaData?.id) return;

  await supabaseAdmin
    .from('modelos_veiculos')
    .upsert({ marca_id: marcaData.id, nome: modelo }, { onConflict: 'marca_id,nome' });
}

function serverError(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Erro inesperado no servidor.' },
    { status: 500 }
  );
}
