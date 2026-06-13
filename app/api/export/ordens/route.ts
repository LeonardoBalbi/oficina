import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createStandardPdf, date, excelDocument, fetchCompanyConfig, money, table } from '../helpers';

type OrdemExport = {
  id: string;
  descricao_problema: string;
  observacoes?: string | null;
  status: string;
  valor_estimado: number;
  data_entrada: string;
  data_saida?: string | null;
  clientes?: { nome?: string; telefone?: string; email?: string; endereco?: string } | null;
  veiculos?: { placa?: string; marca?: string; modelo?: string; ano?: number; cor?: string } | null;
  mecanicos?: { nome?: string } | null;
  ordem_servicos_itens?: Array<{ nome?: string; valor?: number; quantidade?: number }> | null;
};

const headers = ['Número', 'Cliente', 'Telefone', 'Veículo', 'Mecânico', 'Status', 'Entrada', 'Saída', 'Valor', 'Problema'];

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const format = url.searchParams.get('format') || 'pdf';
    const id = url.searchParams.get('id');
    const supabaseAdmin = getSupabaseAdmin();
    let query = supabaseAdmin
      .from('ordens_servico')
      .select('*, clientes(nome, telefone, email, endereco), veiculos(placa, marca, modelo, ano, cor), mecanicos(nome), ordem_servicos_itens(nome, valor, quantidade)')
      .order('created_at', { ascending: false });

    if (id) query = query.eq('id', id);

    let { data, error } = await query;

    if (error) {
      let fallbackQuery = supabaseAdmin
        .from('ordens_servico')
        .select('*, clientes(nome, telefone, email, endereco), veiculos(placa, marca, modelo, ano, cor), mecanicos(nome)')
        .order('created_at', { ascending: false });

      if (id) fallbackQuery = fallbackQuery.eq('id', id);

      const fallback = await fallbackQuery;
      data = fallback.data;
      error = fallback.error;
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const ordens = (data || []) as OrdemExport[];

    if (format === 'excel') {
      const rows = ordens.map((ordem) => [
        shortId(ordem.id),
        ordem.clientes?.nome || '',
        ordem.clientes?.telefone || '',
        vehicleLabel(ordem),
        ordem.mecanicos?.nome || '',
        ordem.status,
        date(ordem.data_entrada),
        date(ordem.data_saida),
        money(ordem.valor_estimado),
        ordem.descricao_problema
      ]);
      return fileResponse(excelDocument('Ordens de Serviço', table(headers, rows)), 'ordens-servico.xls', 'application/vnd.ms-excel; charset=utf-8');
    }

    if (id && !ordens[0]) {
      return NextResponse.json({ error: 'Ordem de serviço não encontrada.' }, { status: 404 });
    }

    const company = await fetchCompanyConfig(supabaseAdmin);
    const pdf = await createStandardPdf(buildPdf(ordens[0] || emptyOrder(), companyTitle(id), company));
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${id ? `os-${shortId(id)}.pdf` : 'ordens-servico.pdf'}"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro inesperado ao exportar ordens.' },
      { status: 500 }
    );
  }
}

function buildPdf(ordem: OrdemExport, title: string, company: Awaited<ReturnType<typeof fetchCompanyConfig>>) {
  const servicos = ordem.ordem_servicos_itens || [];
  const servicosRows =
    servicos.length > 0
      ? servicos.map((servico) => [
          servico.nome || '-',
          `${Number(servico.quantidade || 1)}x | ${money(Number(servico.valor || 0) * Number(servico.quantidade || 1))}`
        ] as [string, unknown])
      : [['Descricao', ordem.descricao_problema] as [string, unknown]];

  return {
    title,
    number: shortId(ordem.id),
    company,
    sections: [
      {
        title: 'Dados do cliente',
        rows: [
          ['Nome', ordem.clientes?.nome],
          ['Telefone', ordem.clientes?.telefone],
          ['E-mail', ordem.clientes?.email],
          ['Endereço', ordem.clientes?.endereco]
        ] as Array<[string, unknown]>
      },
      {
        title: 'Dados do veículo',
        rows: [
          ['Veículo', vehicleLabel(ordem)],
          ['Placa', ordem.veiculos?.placa],
          ['Ano', ordem.veiculos?.ano],
          ['Cor', ordem.veiculos?.cor]
        ] as Array<[string, unknown]>
      },
      {
        title: 'Serviços da OS',
        rows: [
          ...servicosRows,
          ['Problema relatado', ordem.descricao_problema],
          ['Responsável', ordem.mecanicos?.nome],
          ['Status', ordem.status],
          ['Entrada', date(ordem.data_entrada)],
          ['Saída', date(ordem.data_saida)]
        ] as Array<[string, unknown]>
      },
      {
        title: 'Peças utilizadas',
        rows: [['Peças', 'Não informado nesta OS']] as Array<[string, unknown]>
      },
      {
        title: 'Valores e observações',
        rows: [
          ['Serviços', money(ordem.valor_estimado)],
          ['Peças', money(0)],
          ['Observações', ordem.observacoes || '-']
        ] as Array<[string, unknown]>
      }
    ],
    totalLabel: 'Valor total',
    totalValue: ordem.valor_estimado
  };
}

function companyTitle(id: string | null) {
  return id ? 'Ordem de Serviço' : 'Ordens de Serviço';
}

function emptyOrder(): OrdemExport {
  return {
    id: '00000000',
    descricao_problema: 'Sem ordens cadastradas',
    status: '-',
    valor_estimado: 0,
    data_entrada: ''
  };
}

function vehicleLabel(ordem: OrdemExport) {
  return `${ordem.veiculos?.placa || ''} ${ordem.veiculos?.marca || ''} ${ordem.veiculos?.modelo || ''}`.trim();
}

function shortId(id: string) {
  return id ? id.slice(0, 8).toUpperCase() : '-';
}

function fileResponse(content: string, filename: string, contentType: string) {
  return new NextResponse(content, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
}
