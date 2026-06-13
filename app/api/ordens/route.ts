import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const statuses = ['aberta', 'andamento', 'finalizada', 'cancelada'] as const;

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const queryWithItems = await supabaseAdmin
      .from('ordens_servico')
      .select('*, clientes(nome, telefone), veiculos(placa, marca, modelo), mecanicos(nome), ordem_servicos_itens(id, servico_id, nome, valor, quantidade)')
      .order('created_at', { ascending: false });

    if (!queryWithItems.error) return NextResponse.json(queryWithItems.data);

    const { data, error } = await supabaseAdmin
      .from('ordens_servico')
      .select('*, clientes(nome, telefone), veiculos(placa, marca, modelo), mecanicos(nome)')
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
      return NextResponse.json({ error: 'Cliente, veículo e problema relatado são obrigatórios.' }, { status: 400 });
    }

    const status = statuses.includes(body.status) ? body.status : 'aberta';
    const supabaseAdmin = getSupabaseAdmin();
    const servicoIds = Array.isArray(body.servico_ids) ? body.servico_ids.map(String).filter(Boolean) : [];
    const servicos = await buscarServicosSelecionados(servicoIds);
    const totalServicos = servicos.reduce((total, servico) => total + Number(servico.valor || 0), 0);
    const { data, error } = await supabaseAdmin
      .from('ordens_servico')
      .insert({
        cliente_id: body.cliente_id,
        veiculo_id: body.veiculo_id,
        mecanico_id: body.mecanico_id || null,
        descricao_problema: String(body.descricao_problema).trim(),
        status,
        valor_estimado: Number(body.valor_estimado || totalServicos || 0),
        data_entrada: body.data_entrada || new Date().toISOString().slice(0, 10),
        data_saida: status === 'finalizada' ? new Date().toISOString().slice(0, 10) : null
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await salvarItensOrdem(data.id, servicos);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    if (!body.id || !statuses.includes(body.status)) {
      return NextResponse.json({ error: 'ID da ordem e status válido são obrigatórios.' }, { status: 400 });
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

async function buscarServicosSelecionados(servicoIds: string[]) {
  if (servicoIds.length === 0) return [];

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('servicos')
    .select('id, nome, valor')
    .in('id', servicoIds);

  if (error) return [];

  return (data || []) as Array<{ id: string; nome: string; valor: number }>;
}

async function salvarItensOrdem(ordemId: string, servicos: Array<{ id: string; nome: string; valor: number }>) {
  if (servicos.length === 0) return;

  const supabaseAdmin = getSupabaseAdmin();
  await supabaseAdmin.from('ordem_servicos_itens').insert(
    servicos.map((servico) => ({
      ordem_id: ordemId,
      servico_id: servico.id,
      nome: servico.nome,
      valor: Number(servico.valor || 0),
      quantidade: 1
    }))
  );
}

function serverError(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Erro inesperado no servidor.' },
    { status: 500 }
  );
}
