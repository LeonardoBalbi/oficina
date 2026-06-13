import { SupabaseClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

const PDFDocument = require('pdfkit');

export const dataTables = [
  'clientes',
  'veiculos',
  'servicos',
  'mecanicos',
  'fornecedores',
  'pecas',
  'ordens_servico',
  'orcamentos',
  'fotos_os',
  'app_usuarios'
] as const;

type Row = Record<string, unknown>;

export type CompanyConfig = {
  nome_empresa?: string | null;
  cnpj?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  site?: string | null;
  redes_sociais?: Record<string, string> | null;
};

export type PdfSection = {
  title: string;
  rows: Array<[string, unknown]>;
};

export function sqlValue(value: unknown) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function rowsToInsertSql(table: string, rows: Row[]) {
  if (rows.length === 0) return `-- ${table}: sem registros\n`;

  const columns = Object.keys(rows[0]);
  const values = rows
    .map((row) => `(${columns.map((column) => sqlValue(row[column])).join(', ')})`)
    .join(',\n');

  return [
    `-- ${table}`,
    `truncate table public.${table} restart identity cascade;`,
    `insert into public.${table} (${columns.map((column) => `"${column}"`).join(', ')})`,
    `values\n${values};`,
    ''
  ].join('\n');
}

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function money(value: unknown) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

export function date(value: unknown) {
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(String(value)));
}

export function htmlDocument(title: string, subtitle: string, tableHtml: string) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 28px; }
    h1 { margin: 0 0 6px; font-size: 24px; }
    p { margin: 0 0 18px; color: #555; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ccc; padding: 7px; text-align: left; vertical-align: top; }
    th { background: #f0f0f0; }
    @media print { body { margin: 12mm; } button { display: none; } }
  </style>
</head>
<body>
  <button onclick="window.print()">Salvar como PDF</button>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(subtitle)}</p>
  ${tableHtml}
</body>
</html>`;
}

export function excelDocument(title: string, tableHtml: string) {
  return `<!doctype html>
<html>
<head><meta charset="utf-8" /></head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${tableHtml}
</body>
</html>`;
}

export function table(headers: string[], rows: unknown[][]) {
  return `<table>
  <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
  <tbody>
    ${rows
      .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
      .join('\n')}
  </tbody>
</table>`;
}

export async function fetchTable(supabaseAdmin: SupabaseClient, tableName: string) {
  const { data, error } = await supabaseAdmin.from(tableName).select('*');

  if (error) {
    throw new Error(`Erro ao exportar ${tableName}: ${error.message}`);
  }

  return (data || []) as Row[];
}

export async function fetchCompanyConfig(_supabaseAdmin: SupabaseClient): Promise<CompanyConfig> {
  return { nome_empresa: 'Garage Auto Service' };
}

export async function createStandardPdf(options: {
  title: string;
  number: string;
  company: CompanyConfig;
  sections: PdfSection[];
  totalLabel: string;
  totalValue: unknown;
}) {
  return new Promise<Buffer>(async (resolve) => {
    const doc = new PDFDocument({ margin: 38, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    await drawHeader(doc, options.company, options.title, options.number);

    options.sections.forEach((section) => drawSection(doc, section));

    doc.moveDown(0.4);
    doc.roundedRect(360, doc.y, 160, 32, 4).fill('#f4f4f4').stroke('#cccccc');
    doc.fillColor('#111').fontSize(9).text(options.totalLabel, 372, doc.y - 24, { width: 136 });
    doc.fontSize(14).text(money(options.totalValue), 372, doc.y + 2, { width: 136, align: 'right' });

    if (doc.y > 640) doc.addPage();
    doc.moveDown(5);
    const y = Math.max(doc.y, 650);
    doc.moveTo(52, y).lineTo(252, y).stroke('#444');
    doc.moveTo(342, y).lineTo(542, y).stroke('#444');
    doc.fillColor('#333').fontSize(9);
    doc.text('Assinatura do responsável', 52, y + 8, { width: 200, align: 'center' });
    doc.text('Assinatura do cliente', 342, y + 8, { width: 200, align: 'center' });

    doc.end();
  });
}

async function drawHeader(doc: any, company: CompanyConfig, title: string, number: string) {
  const logo = fetchProjectLogo();
  doc.roundedRect(38, 34, 519, 96, 6).fill('#f7f7f7').stroke('#d8d8d8');

  if (logo) {
    try {
      doc.image(logo, 52, 48, { width: 68, height: 68, fit: [68, 68] });
    } catch {
      drawLogoFallback(doc, company);
    }
  } else {
    drawLogoFallback(doc, company);
  }

  doc.fillColor('#111').fontSize(16).text(company.nome_empresa || 'Garage Auto Service', 134, 48, { width: 250 });
  doc.fillColor('#444').fontSize(8);
  [
    company.cnpj ? `CNPJ: ${company.cnpj}` : '',
    company.endereco || '',
    [company.telefone, company.whatsapp ? `WhatsApp: ${company.whatsapp}` : ''].filter(Boolean).join(' | '),
    [company.email, company.site].filter(Boolean).join(' | ')
  ]
    .filter(Boolean)
    .forEach((line) => doc.text(line, { width: 260 }));

  doc.fillColor('#111').fontSize(15).text(title, 405, 50, { width: 130, align: 'right' });
  doc.fontSize(10).text(`No ${number}`, { width: 130, align: 'right' });
  doc.fontSize(8).fillColor('#555').text(`Emissão: ${new Date().toLocaleDateString('pt-BR')}`, { width: 130, align: 'right' });
  doc.moveDown(4);
  doc.y = 148;
}

function drawLogoFallback(doc: any, company: CompanyConfig) {
  const initials = String(company.nome_empresa || 'GA')
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  doc.roundedRect(52, 48, 68, 68, 6).fill('#111');
  doc.fillColor('#fff').fontSize(20).text(initials, 52, 72, { width: 68, align: 'center' });
}

function drawSection(doc: any, section: PdfSection) {
  if (doc.y > 690) doc.addPage();
  doc.moveDown(0.7);
  doc.fillColor('#111').fontSize(11).text(section.title.toUpperCase());
  doc.moveTo(38, doc.y + 3).lineTo(557, doc.y + 3).stroke('#d0d0d0');
  doc.moveDown(0.6);
  section.rows.forEach(([label, value]) => {
    if (doc.y > 720) doc.addPage();
    doc.fillColor('#555').fontSize(8).text(label, { continued: true, width: 120 });
    doc.fillColor('#111').fontSize(9).text(String(value || '-'), { width: 390 });
  });
}

function fetchProjectLogo() {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'garage-logo.png');
    if (!existsSync(logoPath)) return null;
    return readFileSync(logoPath);
  } catch {
    return null;
  }
}
