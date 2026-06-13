import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const CONFIG_ID = 1;

export async function GET(req: Request) {
  try {
    const adminError = await requireAdmin(req);
    if (adminError) return adminError;

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('configuracao_empresa')
      .select('nome_empresa, cnpj, endereco, telefone, whatsapp, email, site, redes_sociais')
      .eq('id', CONFIG_ID)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: 'Execute o SQL atualizado no Supabase para ativar os dados da empresa no PDF.' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || {});
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const adminError = await requireAdmin(req);
    if (adminError) return adminError;

    const body = await req.json();
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('configuracao_empresa')
      .upsert({
        id: CONFIG_ID,
        nome_empresa: textValue(body.nome_empresa),
        cnpj: textValue(body.cnpj),
        endereco: textValue(body.endereco),
        telefone: textValue(body.telefone),
        whatsapp: textValue(body.whatsapp),
        email: textValue(body.email),
        site: textValue(body.site),
        redes_sociais: textValue(body.redes_sociais),
        updated_at: new Date().toISOString()
      })
      .select('nome_empresa, cnpj, endereco, telefone, whatsapp, email, site, redes_sociais')
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Execute o SQL atualizado no Supabase para ativar os dados da empresa no PDF.' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return serverError(error);
  }
}

function textValue(value: unknown) {
  const text = String(value || '').trim();
  return text || null;
}

function serverError(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Erro inesperado no servidor.' },
    { status: 500 }
  );
}
