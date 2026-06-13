import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const perfis = ['admin', 'mecanico'] as const;

function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex');
}

export async function GET(req: Request) {
  try {
    const adminError = await requireAdmin(req);
    if (adminError) return adminError;

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('app_usuarios')
      .select('id, nome, usuario, perfil, mecanico_id, permissoes, ativo, mecanicos(nome)')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: Request) {
  try {
    const adminError = await requireAdmin(req);
    if (adminError) return adminError;

    const body = await req.json();
    const perfil = perfis.includes(body.perfil) ? body.perfil : 'mecanico';

    if (!body.nome || !body.usuario || !body.senha) {
      return NextResponse.json({ error: 'Nome, usuário e senha são obrigatórios.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('app_usuarios')
      .insert({
        nome: String(body.nome).trim(),
        usuario: String(body.usuario).trim().toLowerCase(),
        senha_hash: hashPassword(String(body.senha)),
        perfil,
        mecanico_id: body.mecanico_id || null,
        permissoes: normalizarPermissoes(body.permissoes),
        ativo: body.ativo !== false
      })
      .select('id, nome, usuario, perfil, mecanico_id, permissoes, ativo')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const adminError = await requireAdmin(req);
    if (adminError) return adminError;

    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
    }

    const update: Record<string, unknown> = {
      nome: body.nome ? String(body.nome).trim() : undefined,
      usuario: body.usuario ? String(body.usuario).trim().toLowerCase() : undefined,
      perfil: perfis.includes(body.perfil) ? body.perfil : undefined,
      mecanico_id: body.mecanico_id || null,
      permissoes: normalizarPermissoes(body.permissoes),
      ativo: body.ativo !== false
    };

    if (body.senha) {
      update.senha_hash = hashPassword(String(body.senha));
    }

    Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('app_usuarios')
      .update(update)
      .eq('id', body.id)
      .select('id, nome, usuario, perfil, mecanico_id, permissoes, ativo')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const adminError = await requireAdmin(req);
    if (adminError) return adminError;

    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from('app_usuarios').delete().eq('id', body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}

function normalizarPermissoes(value: unknown) {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return value;
}

function serverError(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Erro inesperado no servidor.' },
    { status: 500 }
  );
}
