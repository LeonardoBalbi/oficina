import { randomUUID } from 'crypto';
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
    const contentType = req.headers.get('content-type') || '';
    const body = contentType.includes('multipart/form-data') ? await parseMultipart(req) : await req.json();

    if (!body.ordem_id || !body.url || !tipos.includes(body.tipo)) {
      return NextResponse.json({ error: 'Ordem, tipo e URL da foto são obrigatórios.' }, { status: 400 });
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

async function parseMultipart(req: Request) {
  const formData = await req.formData();
  const arquivo = formData.get('arquivo');
  const camera = formData.get('camera');
  const file = arquivo instanceof File && arquivo.size > 0 ? arquivo : camera;
  const supabaseAdmin = getSupabaseAdmin();
  let url = String(formData.get('url') || '').trim();

  if (file instanceof File && file.size > 0) {
    await supabaseAdmin.storage.createBucket('fotos-os', { public: true }).catch(() => null);

    const extension = file.name.split('.').pop() || 'jpg';
    const path = `${formData.get('ordem_id')}/${Date.now()}-${randomUUID()}.${extension}`;
    const { error } = await supabaseAdmin.storage.from('fotos-os').upload(path, file, {
      contentType: file.type || 'image/jpeg',
      upsert: false
    });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabaseAdmin.storage.from('fotos-os').getPublicUrl(path);
    url = data.publicUrl;
  }

  return {
    ordem_id: String(formData.get('ordem_id') || ''),
    tipo: String(formData.get('tipo') || ''),
    url,
    legenda: String(formData.get('legenda') || '')
  };
}

function serverError(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Erro inesperado no servidor.' },
    { status: 500 }
  );
}
