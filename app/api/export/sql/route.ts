import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { dataTables, fetchTable, rowsToInsertSql } from '../helpers';

export async function GET(req: Request) {
  try {
    const adminError = await requireAdmin(req);
    if (adminError) return adminError;

    const supabaseAdmin = getSupabaseAdmin();
    const exportedAt = new Date().toISOString();
    const parts = [
      '-- Backup de dados da oficina',
      `-- Gerado em ${exportedAt}`,
      'begin;',
      ''
    ];

    for (const table of dataTables) {
      const rows = await fetchTable(supabaseAdmin, table);
      parts.push(rowsToInsertSql(table, rows));
    }

    parts.push('commit;', '');

    return new NextResponse(parts.join('\n'), {
      headers: {
        'Content-Type': 'application/sql; charset=utf-8',
        'Content-Disposition': `attachment; filename="oficina-backup-${exportedAt.slice(0, 10)}.sql"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro inesperado ao exportar SQL.' },
      { status: 500 }
    );
  }
}
