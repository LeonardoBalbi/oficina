import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

type MarcaCatalogo = {
  id: string;
  nome: string;
  modelos: { id: string; marca_id: string; nome: string }[];
};

const catalogoBase = [
  { nome: 'Fiat', modelos: ['Strada', 'Argo', 'Mobi', 'Toro', 'Fastback', 'Pulse', 'Cronos', 'Fiorino', 'Uno', 'Palio', 'Siena', 'Grand Siena', 'Punto', 'Idea', 'Doblò', 'Bravo', 'Linea'] },
  { nome: 'Volkswagen', modelos: ['Polo', 'T-Cross', 'Tera', 'Nivus', 'Saveiro', 'Virtus', 'Taos', 'Amarok', 'Gol', 'Voyage', 'Fox', 'CrossFox', 'SpaceFox', 'Parati', 'Santana', 'Up', 'Bora', 'Jetta'] },
  { nome: 'Chevrolet', modelos: ['Onix', 'Onix Plus', 'Tracker', 'Spin', 'Montana', 'S10', 'Equinox', 'Celta', 'Corsa', 'Classic', 'Prisma', 'Astra', 'Vectra', 'Meriva', 'Zafira', 'Agile', 'Cruze'] },
  { nome: 'Hyundai', modelos: ['HB20', 'HB20S', 'Creta', 'Tucson', 'Kona'] },
  { nome: 'Toyota', modelos: ['Corolla', 'Corolla Cross', 'Hilux', 'SW4', 'Yaris', 'RAV4', 'Etios', 'Bandeirante'] },
  { nome: 'Honda', modelos: ['HR-V', 'City', 'City Hatchback', 'Civic', 'Fit', 'CR-V', 'ZR-V', 'WR-V'] },
  { nome: 'Jeep', modelos: ['Renegade', 'Compass', 'Commander'] },
  { nome: 'Nissan', modelos: ['Kicks', 'Versa', 'Sentra', 'Frontier'] },
  { nome: 'Renault', modelos: ['Kwid', 'Kardian', 'Duster', 'Oroch', 'Master'] },
  { nome: 'BYD', modelos: ['Dolphin Mini', 'Dolphin', 'Yuan Pro', 'Yuan Plus', 'Song Pro', 'Song Plus', 'Seal'] },
  { nome: 'GWM', modelos: ['Haval H6', 'Ora 03', 'Tank 300', 'Poer'] },
  { nome: 'Caoa Chery', modelos: ['Tiggo 5X', 'Tiggo 7', 'Tiggo 8', 'Arrizo 6'] },
  { nome: 'Peugeot', modelos: ['208', '2008', 'Partner'] },
  { nome: 'Citroen', modelos: ['C3', 'Aircross', 'Basalt', 'Jumpy'] },
  { nome: 'Mitsubishi', modelos: ['L200 Triton', 'Pajero Sport', 'Eclipse Cross', 'Outlander'] },
  { nome: 'Ford', modelos: ['Ranger', 'Territory', 'Bronco Sport', 'Mustang', 'Maverick', 'Fiesta', 'Ka', 'Focus', 'EcoSport', 'Fusion', 'Courier'] },
  { nome: 'Ram', modelos: ['Rampage', '1500', '2500', '3500'] },
  { nome: 'Kia', modelos: ['Sportage', 'Stonic', 'Niro', 'Bongo'] },
  { nome: 'BMW', modelos: ['Série 3', 'Série 5', 'X1', 'X3', 'X5', 'iX1'] },
  { nome: 'Mercedes-Benz', modelos: ['Classe A', 'Classe C', 'GLA', 'GLB', 'GLC', 'Sprinter'] },
  { nome: 'Audi', modelos: ['A3', 'A4', 'Q3', 'Q5', 'Q7'] },
  { nome: 'Volvo', modelos: ['EX30', 'XC40', 'XC60', 'XC90'] }
];

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('marcas_veiculos')
      .select('id, nome, modelos_veiculos(id, marca_id, nome)')
      .order('nome', { ascending: true });

    if (!error) {
      const marcas = (data || []).map((marca: any) => ({
        id: marca.id,
        nome: marca.nome,
        modelos: (marca.modelos_veiculos || []).sort((a: any, b: any) => a.nome.localeCompare(b.nome))
      }));

      return NextResponse.json(mesclarCatalogos(marcas));
    }

    const fallback = await catalogoPorVeiculos();
    return NextResponse.json(mesclarCatalogos(fallback));
  } catch (error) {
    return serverError(error);
  }
}

async function catalogoPorVeiculos() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.from('veiculos').select('marca, modelo');

  if (error) {
    throw new Error(error.message);
  }

  const mapa = new Map<string, MarcaCatalogo>();

  (data || []).forEach((veiculo) => {
    const marca = String(veiculo.marca || '').trim();
    const modelo = String(veiculo.modelo || '').trim();

    if (!marca) return;

    if (!mapa.has(marca)) {
      mapa.set(marca, { id: marca, nome: marca, modelos: [] });
    }

    if (modelo) {
      const item = mapa.get(marca)!;
      if (!item.modelos.some((modeloItem) => modeloItem.nome.toLowerCase() === modelo.toLowerCase())) {
        item.modelos.push({ id: `${marca}::${modelo}`, marca_id: marca, nome: modelo });
      }
    }
  });

  return Array.from(mapa.values())
    .map((marca) => ({ ...marca, modelos: marca.modelos.sort((a, b) => a.nome.localeCompare(b.nome)) }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

function catalogoBaseFormatado() {
  return catalogoBase.map((marca) => ({
    id: marca.nome,
    nome: marca.nome,
    modelos: marca.modelos.map((modelo) => ({ id: `${marca.nome}::${modelo}`, marca_id: marca.nome, nome: modelo }))
  }));
}

function mesclarCatalogos(catalogos: MarcaCatalogo[]) {
  const mapa = new Map<string, MarcaCatalogo>();

  [...catalogoBaseFormatado(), ...catalogos].forEach((marca) => {
    const chaveMarca = marca.nome.toLowerCase();

    if (!mapa.has(chaveMarca)) {
      mapa.set(chaveMarca, { ...marca, modelos: [] });
    }

    const item = mapa.get(chaveMarca)!;
    marca.modelos.forEach((modelo) => {
      if (!item.modelos.some((modeloItem) => modeloItem.nome.toLowerCase() === modelo.nome.toLowerCase())) {
        item.modelos.push({ ...modelo, marca_id: item.id });
      }
    });
  });

  return Array.from(mapa.values())
    .map((marca) => ({ ...marca, modelos: marca.modelos.sort((a, b) => a.nome.localeCompare(b.nome)) }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

function serverError(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Erro inesperado no servidor.' },
    { status: 500 }
  );
}
