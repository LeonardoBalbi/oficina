import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createStandardPdf, date, excelDocument, fetchCompanyConfig, money, table } from '../helpers';

type OrcamentoExport = {
  id: string;
  descricao: string;
  valor_total: number;
  status: string;
  validade?: string | null;
  created_at?: string | null;
  clientes?: { nome?: string; telefone?: string; email?: string; endereco?: string } | null;
  veiculos?: { placa?: string; marca?: string; modelo?: string; ano?: number; cor?: string } | null;
};

const headers = ['Número', 'Cliente', 'Telefone', 'Veículo', 'Status', 'Validade', 'Valor', 'Descrição'];

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const format = url.searchParams.get('format') || 'pdf';
    const id = url.searchParams.get('id');
    const supabaseAdmin = getSupabaseAdmin();
    let query = supabaseAdmin
      .from('orcamentos')
      .select('*, clientes(nome, telefone, email, endereco), veiculos(placa, marca, modelo, ano, cor)')
      .order('created_at', { ascending: false });

    if (id) query = query.eq('id', id);

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const orcamentos = (data || []) as OrcamentoExport[];

    if (format === 'excel') {
      const rows = orcamentos.map((orcamento) => [
        shortId(orcamento.id),
        orcamento.clientes?.nome || '',
        orcamento.clientes?.telefone || '',
        vehicleLabel(orcamento),
        orcamento.status,
        date(orcamento.validade),
        money(orcamento.valor_total),
        orcamento.descricao
      ]);
      return fileResponse(excelDocument('Orçamentos', table(headers, rows)), 'orcamentos.xls', 'application/vnd.ms-excel; charset=utf-8');
    }

    if (id && !orcamentos[0]) {
      return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 });
    }

    const company = await fetchCompanyConfig(supabaseAdmin);
    const pdf = await createStandardPdf(buildPdf(orcamentos[0] || emptyQuote(), id ? 'Orçamento' : 'Orçamentos', company));
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${id ? `orcamento-${shortId(id)}.pdf` : 'orcamentos.pdf'}"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro inesperado ao exportar orçamentos.' },
      { status: 500 }
    );
  }
}

function buildPdf(orcamento: OrcamentoExport, title: string, company: Awaited<ReturnType<typeof fetchCompanyConfig>>) {
  return {
    title,
    number: shortId(orcamento.id),
    company,
    sections: [
      {
        title: 'Dados do cliente',
        rows: [
          ['Nome', orcamento.clientes?.nome],
          ['Telefone', orcamento.clientes?.telefone],
          ['E-mail', orcamento.clientes?.email],
          ['Endereço', orcamento.clientes?.endereco]
        ] as Array<[string, unknown]>
      },
      {
        title: 'Dados do veículo',
        rows: [
          ['Veículo', vehicleLabel(orcamento)],
          ['Placa', orcamento.veiculos?.placa],
          ['Ano', orcamento.veiculos?.ano],
          ['Cor', orcamento.veiculos?.cor]
        ] as Array<[string, unknown]>
      },
      {
        title: 'Serviços previstos',
        rows: [
          ['Descrição', orcamento.descricao],
          ['Status', orcamento.status],
          ['Validade', date(orcamento.validade)]
        ] as Array<[string, unknown]>
      },
      {
        title: 'Peças utilizadas',
        rows: [['Peças', 'Não informado neste orçamento']] as Array<[string, unknown]>
      },
      {
        title: 'Valores e observações',
        rows: [
          ['Serviços', money(orcamento.valor_total)],
          ['Peças', money(0)],
          ['Observações', '-']
        ] as Array<[string, unknown]>
      }
    ],
    totalLabel: 'Valor total',
    totalValue: orcamento.valor_total
  };
}

function emptyQuote(): OrcamentoExport {
  return {
    id: '00000000',
    descricao: 'Sem orçamentos cadastrados',
    status: '-',
    valor_total: 0
  };
}

function vehicleLabel(orcamento: OrcamentoExport) {
  return `${orcamento.veiculos?.placa || ''} ${orcamento.veiculos?.marca || ''} ${orcamento.veiculos?.modelo || ''}`.trim();
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
