import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const tables = [
  'clientes',
  'veiculos',
  'servicos',
  'mecanicos',
  'fornecedores',
  'pecas',
  'ordens_servico',
  'orcamentos',
  'fotos_os'
] as const;

export async function GET(req: Request) {
  try {
    const adminError = await requireAdmin(req);
    if (adminError) return adminError;

    const supabaseAdmin = getSupabaseAdmin();
    const exportData: Record<string, unknown> = {
      exported_at: new Date().toISOString()
    };

    for (const table of tables) {
      const { data, error } = await supabaseAdmin.from(table).select('*');

      if (error) {
        return NextResponse.json({ error: `Erro ao exportar ${table}: ${error.message}` }, { status: 500 });
      }

      exportData[table] = data || [];
    }

    const { data: usuarios, error: usuariosError } = await supabaseAdmin
      .from('app_usuarios')
      .select('id, nome, usuario, perfil, mecanico_id, permissoes, ativo, created_at');

    if (usuariosError) {
      return NextResponse.json({ error: `Erro ao exportar usuários: ${usuariosError.message}` }, { status: 500 });
    }

    exportData.app_usuarios = usuarios || [];

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="oficina-backup-${new Date().toISOString().slice(0, 10)}.json"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro inesperado ao exportar.' },
      { status: 500 }
    );
  }
}
