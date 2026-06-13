'use client';

import {
  AlertTriangle,
  Camera,
  Car,
  ClipboardList,
  Download,
  Edit3,
  FileText,
  Loader2,
  MessageCircle,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  Truck,
  UserRound,
  Wrench,
  X
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type PermissionKey =
  | 'clientes'
  | 'veiculos'
  | 'mecanicos'
  | 'servicos'
  | 'fornecedores'
  | 'pecas'
  | 'ordens'
  | 'orcamentos'
  | 'fotos'
  | 'listas';

type AppUser = {
  id: string;
  nome: string;
  usuario: string;
  perfil: 'admin' | 'mecanico';
  mecanico_id?: string | null;
  permissoes?: Partial<Record<PermissionKey, boolean>>;
  ativo: boolean;
  mecanicos?: { nome: string } | null;
};

type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  email?: string | null;
  endereco?: string | null;
};

type Veiculo = {
  id: string;
  cliente_id: string;
  placa: string;
  marca: string;
  modelo: string;
  ano?: number | null;
  cor?: string | null;
  clientes?: { nome: string };
};

type MarcaVeiculo = {
  id: string;
  nome: string;
  modelos: ModeloVeiculo[];
};

type ModeloVeiculo = {
  id: string;
  marca_id: string;
  nome: string;
};

type Ordem = {
  id: string;
  cliente_id: string;
  veiculo_id: string;
  mecanico_id?: string | null;
  status: 'aberta' | 'andamento' | 'finalizada' | 'cancelada';
  descricao_problema: string;
  valor_estimado: number;
  data_entrada: string;
  clientes?: { nome: string; telefone: string };
  veiculos?: { placa: string; marca: string; modelo: string };
  mecanicos?: { nome: string } | null;
};

type Servico = {
  id: string;
  nome: string;
  valor: number;
  descricao?: string | null;
};

type Mecanico = {
  id: string;
  nome: string;
  telefone?: string | null;
  especialidade?: string | null;
  ativo: boolean;
};

type Fornecedor = {
  id: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  documento?: string | null;
};

type Peca = {
  id: string;
  fornecedor_id?: string | null;
  nome: string;
  codigo?: string | null;
  quantidade: number;
  estoque_minimo: number;
  custo: number;
  preco_venda: number;
  fornecedores?: { nome: string } | null;
};

type Orcamento = {
  id: string;
  cliente_id: string;
  veiculo_id?: string | null;
  descricao: string;
  valor_total: number;
  status: 'rascunho' | 'enviado' | 'aprovado' | 'recusado';
  validade?: string | null;
  clientes?: { nome: string; telefone: string };
  veiculos?: { placa: string; marca: string; modelo: string } | null;
};

type FotoOS = {
  id: string;
  ordem_id: string;
  tipo: 'antes' | 'depois';
  url: string;
  legenda?: string | null;
  ordens_servico?: {
    descricao_problema: string;
    veiculos?: { placa: string; marca: string; modelo: string } | null;
  } | null;
};

const permissionOptions: { key: PermissionKey; label: string }[] = [
  { key: 'clientes', label: 'Clientes' },
  { key: 'veiculos', label: 'Veículos' },
  { key: 'mecanicos', label: 'Mecânicos' },
  { key: 'servicos', label: 'Serviços' },
  { key: 'fornecedores', label: 'Fornecedores' },
  { key: 'pecas', label: 'Estoque' },
  { key: 'ordens', label: 'Ordens de serviço' },
  { key: 'orcamentos', label: 'Orçamentos' },
  { key: 'fotos', label: 'Fotos' },
  { key: 'listas', label: 'Listas' },
];

const statusLabel = {
  aberta: 'Aberta',
  andamento: 'Em andamento',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada'
};

const orcamentoStatusLabel = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado'
};

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

export default function Home() {
  const [usuarioLogado, setUsuarioLogado] = useState<AppUser | null>(null);
  const [usuarios, setUsuarios] = useState<AppUser[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [marcasVeiculos, setMarcasVeiculos] = useState<MarcaVeiculo[]>([]);
  const [ordens, setOrdens] = useState<Ordem[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [fotos, setFotos] = useState<FotoOS[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [marcaVeiculoSelecionada, setMarcaVeiculoSelecionada] = useState('');
  const [modeloVeiculoSelecionado, setModeloVeiculoSelecionado] = useState('');
  const [buscaOrdens, setBuscaOrdens] = useState('');
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState('');
  const [usuarioEditando, setUsuarioEditando] = useState<AppUser | null>(null);
  const [ultimaOrdemId, setUltimaOrdemId] = useState('');
  const [acaoOrdemId, setAcaoOrdemId] = useState('');

  async function carregar(userOverride?: AppUser | null) {
    setCarregando(true);
    setErro('');

    try {
      const currentUser = userOverride ?? usuarioLogado;
      const currentIsAdmin = currentUser?.perfil === 'admin';
      const endpoints = [
        { key: 'clientes', url: '/api/clientes', required: true },
        { key: 'veiculos', url: '/api/veiculos', required: true },
        { key: 'catalogoVeiculos', url: '/api/catalogo-veiculos', required: true },
        { key: 'ordens', url: '/api/ordens', required: true },
        { key: 'servicos', url: '/api/servicos', required: true },
        { key: 'mecanicos', url: '/api/mecanicos' },
        { key: 'fornecedores', url: '/api/fornecedores' },
        { key: 'pecas', url: '/api/pecas' },
        { key: 'orcamentos', url: '/api/orcamentos' },
        { key: 'fotos', url: '/api/fotos' },
        ...(currentIsAdmin
          ? [
              { key: 'usuarios', url: '/api/usuarios' }
            ]
          : [])
      ];

      const resultados = await Promise.all(
        endpoints.map(async (endpoint) => {
          const res = await fetch(endpoint.url, {
            headers: currentUser ? { 'x-app-user-id': currentUser.id } : {}
          });
          const body = await res.json();

          if (!res.ok) {
            return {
              ...endpoint,
              data: [],
              error: body?.error || 'Não foi possível carregar os dados.'
            };
          }

          return { ...endpoint, data: body, error: '' };
        })
      );

      const falhaObrigatoria = resultados.find((resultado) => resultado.required && resultado.error);

      if (falhaObrigatoria) {
        throw new Error(falhaObrigatoria.error);
      }

      const getData = (key: string) => resultados.find((resultado) => resultado.key === key)?.data || [];

      setClientes(getData('clientes') as Cliente[]);
      setVeiculos(getData('veiculos') as Veiculo[]);
      setMarcasVeiculos(getData('catalogoVeiculos') as MarcaVeiculo[]);
      setOrdens(getData('ordens') as Ordem[]);
      setServicos(getData('servicos') as Servico[]);
      setMecanicos(getData('mecanicos') as Mecanico[]);
      setFornecedores(getData('fornecedores') as Fornecedor[]);
      setPecas(getData('pecas') as Peca[]);
      setOrcamentos(getData('orcamentos') as Orcamento[]);
      setFotos(getData('fotos') as FotoOS[]);
      setUsuarios(getData('usuarios') as AppUser[]);

      const falhasOpcionais = resultados.filter((resultado) => !resultado.required && resultado.error);

      if (falhasOpcionais.length > 0) {
        setErro('Execute o SQL atualizado no Supabase para ativar mecânicos, estoque, fornecedores, orçamentos e fotos.');
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro inesperado ao carregar.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    const session = window.localStorage.getItem('oficina_user');

    if (session) {
      const user = JSON.parse(session) as AppUser;
      setUsuarioLogado(user);
      carregar(user);
      return;
    }

    setCarregando(false);
  }, []);

  const isAdmin = usuarioLogado?.perfil === 'admin';
  const pode = (key: PermissionKey) => isAdmin || Boolean(usuarioLogado?.permissoes?.[key]);
  const adminHeaders = () => ({
    'Content-Type': 'application/json',
    'x-app-user-id': usuarioLogado?.id || ''
  });

  const veiculosDoCliente = useMemo(
    () => veiculos.filter((veiculo) => !clienteSelecionado || veiculo.cliente_id === clienteSelecionado),
    [clienteSelecionado, veiculos]
  );

  const modelosDaMarcaSelecionada = useMemo(() => {
    if (!marcaVeiculoSelecionada || marcaVeiculoSelecionada === '__nova__') return [];
    return marcasVeiculos.find((marca) => marca.id === marcaVeiculoSelecionada)?.modelos || [];
  }, [marcaVeiculoSelecionada, marcasVeiculos]);

  const osAbertas = useMemo(
    () => ordens.filter((ordem) => ordem.status === 'aberta' || ordem.status === 'andamento'),
    [ordens]
  );

  const faturamentoPrevisto = useMemo(
    () =>
      ordens
        .filter((ordem) => ordem.status !== 'cancelada')
        .reduce((total, ordem) => total + Number(ordem.valor_estimado || 0), 0),
    [ordens]
  );

  const estoqueBaixo = useMemo(
    () => pecas.filter((peca) => Number(peca.quantidade || 0) <= Number(peca.estoque_minimo || 0)),
    [pecas]
  );

  const orcamentosAbertos = useMemo(
    () => orcamentos.filter((orcamento) => orcamento.status === 'rascunho' || orcamento.status === 'enviado'),
    [orcamentos]
  );

  const ordensFiltradas = useMemo(() => {
    const termo = normalizeSearch(buscaOrdens);

    if (!termo) return ordens;

    return ordens.filter((ordem) => {
      const veiculo = ordem.veiculos;
      const dataEntrada = formatDate(ordem.data_entrada);
      const campos = [
        ordem.id,
        ordem.id.slice(0, 8),
        ordem.clientes?.nome,
        ordem.clientes?.telefone,
        dataEntrada,
        ordem.data_entrada,
        dataEntrada.replace(/\//g, ''),
        veiculo?.placa,
        veiculo?.placa?.replace(/-/g, ''),
        veiculo?.marca,
        veiculo?.modelo,
        `${veiculo?.marca || ''} ${veiculo?.modelo || ''}`,
        ordem.descricao_problema,
        ordem.mecanicos?.nome,
        statusLabel[ordem.status]
      ];

      return normalizeSearch(campos.join(' ')).includes(termo);
    });
  }, [buscaOrdens, ordens]);

  async function enviar(e: FormEvent<HTMLFormElement>, url: string, label: string) {
    e.preventDefault();
    const form = e.currentTarget;

    setMsg('');
    setErro('');
    setSalvando(label);

    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Erro ao salvar.');
      }

      form.reset();
      setClienteSelecionado('');
      setMsg(`${label} salvo com sucesso.`);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro inesperado ao salvar.');
    } finally {
      setSalvando('');
    }
  }

  async function enviarVeiculo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());

    setMsg('');
    setErro('');
    setSalvando('Veículo');

    try {
      const res = await fetch('/api/veiculos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Erro ao salvar veículo.');
      }

      form.reset();
      setMarcaVeiculoSelecionada('');
      setModeloVeiculoSelecionado('');
      setMsg('Veículo salvo com sucesso.');
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro inesperado ao salvar veículo.');
    } finally {
      setSalvando('');
    }
  }

  async function enviarOrdem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());

    setMsg('');
    setErro('');
    setSalvando('Ordem de serviço');

    try {
      const res = await fetch('/api/ordens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Erro ao salvar OS.');
      }

      form.reset();
      setClienteSelecionado('');
      setUltimaOrdemId(json.id || '');
      setMsg('Ordem de serviço salva com sucesso.');
      await carregar();
      setAcaoOrdemId(json.id || '');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro inesperado ao salvar OS.');
    } finally {
      setSalvando('');
    }
  }

  function osPdfUrl(id: string) {
    return `/api/export/ordens?format=pdf&id=${encodeURIComponent(id)}`;
  }

  function osExcelUrl(id: string) {
    return `/api/export/ordens?format=excel&id=${encodeURIComponent(id)}`;
  }

  function ordemPorId(id: string) {
    return ordens.find((ordem) => ordem.id === id);
  }

  function enviarOsWhatsApp(ordem: Ordem) {
    const telefone = String(ordem.clientes?.telefone || '').replace(/\D/g, '');
    if (!telefone) {
      setErro('Cliente sem telefone para envio pelo WhatsApp.');
      return false;
    }
    const phone = telefone.startsWith('55') ? telefone : `55${telefone}`;
    const pdfUrl = `${window.location.origin}${osPdfUrl(ordem.id)}`;
    const texto = [
      `Olá, ${ordem.clientes?.nome || ''}.`,
      `Segue a Ordem de Serviço ${ordem.id.slice(0, 8).toUpperCase()} em PDF.`,
      `Veículo: ${ordem.veiculos?.placa || ''} ${ordem.veiculos?.marca || ''} ${ordem.veiculos?.modelo || ''}`.trim(),
      `PDF: ${pdfUrl}`
    ].join('\n');

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
    return true;
  }

  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    setErro('');
    setMsg('');
    setSalvando('Login');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData.entries()))
      });
      const user = await res.json();

      if (!res.ok) {
        throw new Error(user.error || 'Erro ao entrar.');
      }

      setUsuarioLogado(user);
      window.localStorage.setItem('oficina_user', JSON.stringify(user));
      setMsg(`Bem-vindo, ${user.nome}.`);
      await carregar(user);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro inesperado ao entrar.');
    } finally {
      setSalvando('');
    }
  }

  function logout() {
    window.localStorage.removeItem('oficina_user');
    setUsuarioLogado(null);
    setMsg('');
    setErro('');
  }

  async function enviarUsuario(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const permissoes = permissionOptions.reduce<Partial<Record<PermissionKey, boolean>>>((acc, option) => {
      acc[option.key] = formData.getAll('permissoes').includes(option.key);
      return acc;
    }, {});

    setMsg('');
    setErro('');
    setSalvando('Usuário');

    try {
      const res = await fetch('/api/usuarios', {
        method: usuarioEditando ? 'PATCH' : 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          id: usuarioEditando?.id,
          nome: formData.get('nome'),
          usuario: formData.get('usuario'),
          senha: formData.get('senha'),
          perfil: formData.get('perfil'),
          mecanico_id: formData.get('mecanico_id'),
          permissoes,
          ativo: formData.get('ativo') === 'on'
        })
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Erro ao salvar usuário.');
      }

      form.reset();
      setUsuarioEditando(null);
      setMsg(usuarioEditando ? 'Usuário atualizado com sucesso.' : 'Usuário salvo com sucesso.');
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro inesperado ao salvar usuário.');
    } finally {
      setSalvando('');
    }
  }

  async function baixarArquivo(url: string, filename: string, label: string) {
    setMsg('');
    setErro('');
    setSalvando(label);

    try {
      const res = await fetch(url, {
        headers: usuarioLogado ? { 'x-app-user-id': usuarioLogado.id } : {}
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Erro ao exportar arquivo.');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setMsg(`${label} exportado com sucesso.`);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro inesperado ao exportar.');
    } finally {
      setSalvando('');
    }
  }

  function cancelarEdicaoUsuario() {
    setUsuarioEditando(null);
  }

  async function excluirUsuario(user: AppUser) {
    if (!window.confirm(`Excluir o usuário ${user.nome}?`)) return;

    setMsg('');
    setErro('');
    setSalvando(user.id);

    try {
      const res = await fetch('/api/usuarios', {
        method: 'DELETE',
        headers: adminHeaders(),
        body: JSON.stringify({ id: user.id })
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Erro ao excluir usuário.');
      }

      setMsg('Usuário excluído.');
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro inesperado ao excluir usuário.');
    } finally {
      setSalvando('');
    }
  }

  async function enviarFoto(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    setMsg('');
    setErro('');
    setSalvando('Foto');

    try {
      const res = await fetch('/api/fotos', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Erro ao salvar foto.');
      }

      form.reset();
      setMsg('Foto adicionada com sucesso.');
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro inesperado ao salvar foto.');
    } finally {
      setSalvando('');
    }
  }

  async function atualizarStatus(id: string, status: Ordem['status']) {
    setMsg('');
    setErro('');
    setSalvando(id);

    try {
      const res = await fetch('/api/ordens', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Erro ao atualizar a OS.');
      }

      setMsg('Ordem atualizada.');
      if (status === 'finalizada') setUltimaOrdemId(id);
      await carregar();
      if (status === 'finalizada') setAcaoOrdemId(id);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro inesperado ao atualizar.');
    } finally {
      setSalvando('');
    }
  }

  const ordemAcao = acaoOrdemId ? ordemPorId(acaoOrdemId) : null;

  if (!usuarioLogado) {
    return (
      <main className="loginShell">
        <section className="loginPanel">
          <img className="loginLogo" src="/garage-logo.png" alt="Garage Auto Service" />
          <div>
            <span className="eyebrow">Acesso restrito</span>
            <h1>Garage Auto Service</h1>
            <p>Entre com o perfil da oficina para acessar o painel.</p>
          </div>
          {(msg || erro) && <div className={erro ? 'notice error' : 'notice'}>{erro || msg}</div>}
          <form onSubmit={login}>
            <input name="usuario" placeholder="Usuário" autoComplete="username" required />
            <input name="senha" placeholder="Senha" type="password" autoComplete="current-password" required />
            <SubmitButton loading={salvando === 'Login'} label="Entrar" />
          </form>
          <p className="loginHint">Admin inicial: admina / admin123 ou admin / admin123</p>
        </section>
      </main>
    );
  }

  return (
    <main className="container">
      <header className="top">
        <div className="brandHero">
          <img className="brandLogo" src="/garage-logo.png" alt="Garage Auto Service" />
          <div>
            <span className="eyebrow">Painel operacional</span>
            <h1>Garage Auto Service</h1>
            <p>Controle clientes, veículos, serviços e ordens de serviço com a presença forte da sua marca.</p>
          </div>
        </div>
        <div className="topActions">
          <span className="userPill">
            {usuarioLogado.nome} | {usuarioLogado.perfil === 'admin' ? 'Admin' : 'Mecânico'}
          </span>
          <button className="iconButton" type="button" onClick={() => carregar()} title="Atualizar dados">
            {carregando ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
          </button>
          <button className="iconButton" type="button" onClick={logout} title="Sair">
            Sair
          </button>
        </div>
      </header>

      {(msg || erro) && <div className={erro ? 'notice error' : 'notice'}>{erro || msg}</div>}

      <nav className="quickNav" aria-label="Atalhos do painel">
        {(pode('clientes') || pode('veiculos') || pode('mecanicos') || pode('servicos') || pode('fornecedores')) && (
          <a href="#cadastros">Cadastros</a>
        )}
        {pode('ordens') && <a href="#nova-os">OS</a>}
        {pode('pecas') && <a href="#estoque">Estoque</a>}
        {pode('listas') && <a href="#listas">Listas</a>}
        {isAdmin && <a href="#admin">Admin</a>}
      </nav>

      <section className="metrics">
        <Metric icon={<UserRound size={20} />} label="Clientes" value={clientes.length} />
        <Metric icon={<Car size={20} />} label="Veículos" value={veiculos.length} />
        <Metric icon={<ClipboardList size={20} />} label="OS ativas" value={osAbertas.length} />
        <Metric icon={<FileText size={20} />} label="Orçamentos" value={orcamentosAbertos.length} />
        <Metric icon={<AlertTriangle size={20} />} label="Estoque baixo" value={estoqueBaixo.length} />
        <Metric icon={<Wrench size={20} />} label="Previsto" value={money.format(faturamentoPrevisto)} />
      </section>

      <section className="workspace" id="cadastros">
        {pode('clientes') && <div className="panel">
          <div className="panelHeader">
            <h2>Novo cliente</h2>
            <UserRound size={18} />
          </div>
          <form onSubmit={(e) => enviar(e, '/api/clientes', 'Cliente')}>
            <input name="nome" placeholder="Nome do cliente" required />
            <input name="telefone" placeholder="Telefone" required />
            <input name="email" placeholder="E-mail" type="email" />
            <input name="endereco" placeholder="Endereço" />
            <SubmitButton loading={salvando === 'Cliente'} label="Cadastrar cliente" />
          </form>
        </div>}

        {pode('veiculos') && <div className="panel">
          <div className="panelHeader">
            <h2>Novo veículo</h2>
            <Car size={18} />
          </div>
          <form onSubmit={enviarVeiculo}>
            <select name="cliente_id" required>
              <option value="">Selecione o cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>
            <div className="row">
              <input name="placa" placeholder="Placa" required />
              <input name="ano" placeholder="Ano" type="number" min="1900" max="2100" />
            </div>
            <select
              name="marca_id"
              value={marcaVeiculoSelecionada}
              onChange={(event) => {
                setMarcaVeiculoSelecionada(event.target.value);
                setModeloVeiculoSelecionado('');
              }}
              required
            >
              <option value="">Marca</option>
              {marcasVeiculos.map((marca) => (
                <option key={marca.id} value={marca.id}>
                  {marca.nome}
                </option>
              ))}
              <option value="__nova__">Adicionar nova marca</option>
            </select>
            {marcaVeiculoSelecionada === '__nova__' && (
              <input name="nova_marca" placeholder="Nome da nova marca" required />
            )}
            <select
              name="modelo_id"
              value={modeloVeiculoSelecionado}
              onChange={(event) => setModeloVeiculoSelecionado(event.target.value)}
              disabled={!marcaVeiculoSelecionada}
              required
            >
              <option value="">Modelo</option>
              {modelosDaMarcaSelecionada.map((modelo) => (
                <option key={modelo.id} value={modelo.id}>
                  {modelo.nome}
                </option>
              ))}
              {marcaVeiculoSelecionada && <option value="__novo__">Adicionar novo modelo</option>}
            </select>
            {modeloVeiculoSelecionado === '__novo__' && (
              <input name="novo_modelo" placeholder="Nome do novo modelo" required />
            )}
            <input name="cor" placeholder="Cor" />
            <SubmitButton loading={salvando === 'Veículo'} label="Cadastrar veículo" />
          </form>
        </div>}

        {pode('mecanicos') && <div className="panel">
          <div className="panelHeader">
            <h2>Novo mecânico</h2>
            <UserRound size={18} />
          </div>
          <form onSubmit={(e) => enviar(e, '/api/mecanicos', 'Mecânico')}>
            <input name="nome" placeholder="Nome do mecânico" required />
            <input name="telefone" placeholder="Telefone" />
            <input name="especialidade" placeholder="Especialidade" />
            <SubmitButton loading={salvando === 'Mecânico'} label="Cadastrar mecânico" />
          </form>
        </div>}

        {pode('servicos') && <div className="panel">
          <div className="panelHeader">
            <h2>Novo serviço</h2>
            <Wrench size={18} />
          </div>
          <form onSubmit={(e) => enviar(e, '/api/servicos', 'Serviço')}>
            <input name="nome" placeholder="Ex: Troca de óleo" required />
            <input name="valor" placeholder="Valor" type="number" min="0" step="0.01" required />
            <textarea name="descricao" placeholder="Descrição" />
            <SubmitButton loading={salvando === 'Serviço'} label="Cadastrar serviço" />
          </form>
        </div>}

        {pode('fornecedores') && <div className="panel">
          <div className="panelHeader">
            <h2>Novo fornecedor</h2>
            <Truck size={18} />
          </div>
          <form onSubmit={(e) => enviar(e, '/api/fornecedores', 'Fornecedor')}>
            <input name="nome" placeholder="Nome do fornecedor" required />
            <input name="telefone" placeholder="Telefone" />
            <input name="email" placeholder="E-mail" type="email" />
            <input name="documento" placeholder="CNPJ ou CPF" />
            <SubmitButton loading={salvando === 'Fornecedor'} label="Cadastrar fornecedor" />
          </form>
        </div>}

        {pode('pecas') && <div className="panel">
          <div className="panelHeader">
            <h2>Nova peça</h2>
            <Package size={18} />
          </div>
          <form onSubmit={(e) => enviar(e, '/api/pecas', 'Peça')}>
            <select name="fornecedor_id">
              <option value="">Fornecedor</option>
              {fornecedores.map((fornecedor) => (
                <option key={fornecedor.id} value={fornecedor.id}>
                  {fornecedor.nome}
                </option>
              ))}
            </select>
            <div className="row">
              <input name="nome" placeholder="Nome da peça" required />
              <input name="codigo" placeholder="Código" />
            </div>
            <div className="row">
              <input name="quantidade" placeholder="Qtd." type="number" min="0" />
              <input name="estoque_minimo" placeholder="Mínimo" type="number" min="0" />
            </div>
            <div className="row">
              <input name="custo" placeholder="Custo" type="number" min="0" step="0.01" />
              <input name="preco_venda" placeholder="Venda" type="number" min="0" step="0.01" />
            </div>
            <SubmitButton loading={salvando === 'Peça'} label="Cadastrar peça" />
          </form>
        </div>}

        {pode('ordens') && <div className="panel" id="nova-os">
          <div className="panelHeader">
            <h2>Nova ordem de serviço</h2>
            <ClipboardList size={18} />
          </div>
          <form onSubmit={enviarOrdem}>
            <select
              name="cliente_id"
              required
              value={clienteSelecionado}
              onChange={(e) => setClienteSelecionado(e.target.value)}
            >
              <option value="">Cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>
            <select name="veiculo_id" required disabled={!clienteSelecionado}>
              <option value="">Veículo</option>
              {veiculosDoCliente.map((veiculo) => (
                <option key={veiculo.id} value={veiculo.id}>
                  {veiculo.placa} - {veiculo.marca} {veiculo.modelo}
                </option>
              ))}
            </select>
            <select name="mecanico_id">
              <option value="">Mecânico responsável</option>
              {mecanicos
                .filter((mecanico) => mecanico.ativo)
                .map((mecanico) => (
                  <option key={mecanico.id} value={mecanico.id}>
                    {mecanico.nome}
                  </option>
                ))}
            </select>
            <textarea name="descricao_problema" placeholder="Problema relatado" required />
            <div className="row">
              <input name="valor_estimado" placeholder="Valor estimado" type="number" min="0" step="0.01" />
              <input name="data_entrada" type="date" />
            </div>
            <select name="status" defaultValue="aberta">
              <option value="aberta">Aberta</option>
              <option value="andamento">Em andamento</option>
              <option value="finalizada">Finalizada</option>
              <option value="cancelada">Cancelada</option>
            </select>
            <SubmitButton loading={salvando === 'Ordem de serviço'} label="Abrir OS" />
          </form>
          {ultimaOrdemId && ordemPorId(ultimaOrdemId) && (
            <OsActions
              ordem={ordemPorId(ultimaOrdemId)!}
              loading={salvando}
              onDownload={(ordem) => baixarArquivo(osPdfUrl(ordem.id), `os-${ordem.id.slice(0, 8).toUpperCase()}.pdf`, 'OS PDF')}
              onExcel={(ordem) => baixarArquivo(osExcelUrl(ordem.id), `os-${ordem.id.slice(0, 8).toUpperCase()}.xls`, 'OS Excel')}
              onWhatsApp={enviarOsWhatsApp}
            />
          )}
        </div>}

        {pode('orcamentos') && <div className="panel">
          <div className="panelHeader">
            <h2>Novo orçamento</h2>
            <FileText size={18} />
          </div>
          <form onSubmit={(e) => enviar(e, '/api/orcamentos', 'Orçamento')}>
            <select name="cliente_id" required>
              <option value="">Cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>
            <select name="veiculo_id">
              <option value="">Veículo</option>
              {veiculos.map((veiculo) => (
                <option key={veiculo.id} value={veiculo.id}>
                  {veiculo.placa} - {veiculo.marca} {veiculo.modelo}
                </option>
              ))}
            </select>
            <textarea name="descricao" placeholder="Descrição do orçamento" required />
            <div className="row">
              <input name="valor_total" placeholder="Valor total" type="number" min="0" step="0.01" />
              <input name="validade" type="date" />
            </div>
            <select name="status" defaultValue="rascunho">
              <option value="rascunho">Rascunho</option>
              <option value="enviado">Enviado</option>
              <option value="aprovado">Aprovado</option>
              <option value="recusado">Recusado</option>
            </select>
            <SubmitButton loading={salvando === 'Orçamento'} label="Salvar orçamento" />
          </form>
        </div>}

        {pode('fotos') && <div className="panel">
          <div className="panelHeader">
            <h2>Foto antes/depois</h2>
            <Camera size={18} />
          </div>
          <form onSubmit={enviarFoto}>
            <select name="ordem_id" required>
              <option value="">Ordem de serviço</option>
              {ordens.map((ordem) => (
                <option key={ordem.id} value={ordem.id}>
                  {ordem.veiculos?.placa || 'OS'} - {ordem.descricao_problema}
                </option>
              ))}
            </select>
            <select name="tipo" defaultValue="antes" required>
              <option value="antes">Antes</option>
              <option value="depois">Depois</option>
            </select>
            <div className="fileActions">
              <label>
                Arquivo do celular
                <input name="arquivo" accept="image/*" type="file" />
              </label>
              <label>
                Abrir câmera
                <input name="camera" accept="image/*" capture="environment" type="file" />
              </label>
            </div>
            <input name="url" placeholder="Ou cole a URL da foto" type="url" />
            <input name="legenda" placeholder="Legenda" />
            <SubmitButton loading={salvando === 'Foto'} label="Adicionar foto" />
          </form>
        </div>}

        {isAdmin && <div className="adminSection" id="admin">
          <div className="sectionTitle">
            <Settings size={18} />
            <h2>Administração</h2>
          </div>

          <div className="panel">
            <div className="panelHeader">
              <h2>Backup e usuários</h2>
              <button
                className="iconButton"
                type="button"
                onClick={() => baixarArquivo('/api/export/sql', `oficina-backup-${new Date().toISOString().slice(0, 10)}.sql`, 'Banco SQL')}
                disabled={salvando === 'Banco SQL'}
                title="Exportar banco em SQL"
              >
                {salvando === 'Banco SQL' ? <Loader2 className="spin" size={16} /> : <Download size={16} />}
              </button>
            </div>
            <form onSubmit={enviarUsuario} key={usuarioEditando?.id || 'novo-usuario'}>
              <div className="row">
                <input name="nome" placeholder="Nome do usuário" defaultValue={usuarioEditando?.nome || ''} required />
                <input name="usuario" placeholder="Login" defaultValue={usuarioEditando?.usuario || ''} required />
              </div>
              <div className="row">
                <input
                  name="senha"
                  placeholder={usuarioEditando ? 'Nova senha (opcional)' : 'Senha inicial'}
                  type="password"
                  required={!usuarioEditando}
                />
                <select name="perfil" defaultValue={usuarioEditando?.perfil || 'mecanico'}>
                  <option value="mecanico">Mecânico</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <select name="mecanico_id" defaultValue={usuarioEditando?.mecanico_id || ''}>
                <option value="">Vincular mecânico</option>
                {mecanicos.map((mecanico) => (
                  <option key={mecanico.id} value={mecanico.id}>{mecanico.nome}</option>
                ))}
              </select>
              <div className="permissionGrid">
                {permissionOptions.map((option) => (
                  <label key={option.key}>
                    <input
                      name="permissoes"
                      type="checkbox"
                      value={option.key}
                      defaultChecked={usuarioEditando ? Boolean(usuarioEditando.permissoes?.[option.key]) : true}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              <label className="activeToggle">
                <input name="ativo" type="checkbox" defaultChecked={usuarioEditando ? usuarioEditando.ativo : true} />
                Usuário ativo
              </label>
              <div className="formActions">
                {usuarioEditando && (
                  <button className="ghostButton" type="button" onClick={cancelarEdicaoUsuario}>
                    <X size={16} />
                    Cancelar
                  </button>
                )}
                <SubmitButton loading={salvando === 'Usuário'} label={usuarioEditando ? 'Salvar usuário' : 'Criar usuário'} />
              </div>
            </form>
            <div className="miniList">
              {usuarios.map((user) => (
                <div className="compactItem" key={user.id}>
                  <div>
                    <strong>{user.nome}</strong>
                    <span>{user.usuario} | {user.perfil === 'admin' ? 'Admin' : 'Mecânico'} | {user.ativo ? 'Ativo' : 'Inativo'}</span>
                  </div>
                  <div className="inlineActions">
                    <button className="ghostButton compactButton" type="button" onClick={() => setUsuarioEditando(user)}>
                      <Edit3 size={15} />
                      Editar
                    </button>
                    <button className="ghostButton dangerButton compactButton" type="button" onClick={() => excluirUsuario(user)} disabled={salvando === user.id}>
                      <Trash2 size={15} />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>}
      </section>

      {pode('listas') && <section className="lists" id="listas">
        <div className="panel listPanel">
          <div className="panelHeader">
            <h2>Ordens recentes</h2>
            <ClipboardList size={18} />
          </div>
          <label className="searchField">
            <Search size={17} />
            <input
              value={buscaOrdens}
              onChange={(event) => setBuscaOrdens(event.target.value)}
              placeholder="Pesquisar por cliente, data, número da OS, placa ou carro"
            />
          </label>
          {ordens.length === 0 ? (
            <EmptyState loading={carregando} text="Nenhuma ordem de serviço cadastrada." />
          ) : ordensFiltradas.length === 0 ? (
            <EmptyState loading={false} text="Nenhuma ordem encontrada para essa pesquisa." />
          ) : (
            <div className="list">
              {ordensFiltradas.map((ordem) => (
                <article className="item" key={ordem.id}>
                  <div>
                    <strong>
                      OS {ordem.id.slice(0, 8).toUpperCase()} | {ordem.veiculos?.placa} -{' '}
                      {ordem.veiculos?.marca} {ordem.veiculos?.modelo}
                    </strong>
                    <p>{ordem.descricao_problema}</p>
                    <span className="muted">
                      {ordem.clientes?.nome} | Entrada {formatDate(ordem.data_entrada)} |{' '}
                      {money.format(Number(ordem.valor_estimado || 0))}
                      {ordem.mecanicos?.nome ? ` | ${ordem.mecanicos.nome}` : ''}
                    </span>
                  </div>
                  <div className="itemActions">
                    <span className={`badge ${ordem.status}`}>{statusLabel[ordem.status]}</span>
                    {ordem.status !== 'finalizada' && ordem.status !== 'cancelada' && (
                      <button
                        className="ghostButton"
                        type="button"
                        disabled={salvando === ordem.id}
                        onClick={() => atualizarStatus(ordem.id, 'finalizada')}
                      >
                        Finalizar
                      </button>
                    )}
                    {ordem.status === 'finalizada' && (
                      <OsActions
                        ordem={ordem}
                        loading={salvando}
                        compact
                        onDownload={(item) => baixarArquivo(osPdfUrl(item.id), `os-${item.id.slice(0, 8).toUpperCase()}.pdf`, 'OS PDF')}
                        onExcel={(item) => baixarArquivo(osExcelUrl(item.id), `os-${item.id.slice(0, 8).toUpperCase()}.xls`, 'OS Excel')}
                        onWhatsApp={enviarOsWhatsApp}
                      />
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="panel listPanel">
          <div className="panelHeader">
            <h2>Clientes e serviços</h2>
            <Phone size={18} />
          </div>
          <div className="splitList">
            <div>
              <h3>Clientes</h3>
              {clientes.length === 0 ? (
                <EmptyState loading={carregando} text="Nenhum cliente cadastrado." />
              ) : (
                clientes.slice(0, 6).map((cliente) => (
                  <div className="compactItem" key={cliente.id}>
                    <strong>{cliente.nome}</strong>
                    <span>{cliente.telefone}</span>
                  </div>
                ))
              )}
            </div>
            <div>
              <h3>Serviços</h3>
              {servicos.length === 0 ? (
                <EmptyState loading={carregando} text="Nenhum serviço cadastrado." />
              ) : (
                servicos.map((servico) => (
                  <div className="compactItem" key={servico.id}>
                    <strong>{servico.nome}</strong>
                    <span>{money.format(Number(servico.valor || 0))}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="panel listPanel">
          <div className="panelHeader">
            <h2>Orçamentos recentes</h2>
            <FileText size={18} />
          </div>
          {orcamentos.length === 0 ? (
            <EmptyState loading={carregando} text="Nenhum orçamento cadastrado." />
          ) : (
            <div className="list">
              {orcamentos.map((orcamento) => (
                <article className="item" key={orcamento.id}>
                  <div>
                    <strong>{orcamento.clientes?.nome}</strong>
                    <p>{orcamento.descricao}</p>
                    <span className="muted">
                      {orcamento.veiculos?.placa || 'Sem veículo'} | Validade {formatDate(orcamento.validade || '')} |{' '}
                      {money.format(Number(orcamento.valor_total || 0))}
                    </span>
                  </div>
                  <div className="itemActions">
                    <span className={`badge quote-${orcamento.status}`}>{orcamentoStatusLabel[orcamento.status]}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="panel listPanel" id="estoque">
          <div className="panelHeader">
            <h2>Estoque de peças</h2>
            <Package size={18} />
          </div>
          {pecas.length === 0 ? (
            <EmptyState loading={carregando} text="Nenhuma peça cadastrada." />
          ) : (
            <div className="list">
              {pecas.map((peca) => {
                const baixo = Number(peca.quantidade || 0) <= Number(peca.estoque_minimo || 0);
                return (
                  <article className="item" key={peca.id}>
                    <div>
                      <strong>{peca.nome}</strong>
                      <p>
                        {peca.codigo || 'Sem código'} | {peca.fornecedores?.nome || 'Sem fornecedor'}
                      </p>
                      <span className="muted">
                        Custo {money.format(Number(peca.custo || 0))} | Venda{' '}
                        {money.format(Number(peca.preco_venda || 0))}
                      </span>
                    </div>
                    <div className="itemActions">
                      <span className={`badge ${baixo ? 'cancelada' : 'finalizada'}`}>
                        {Number(peca.quantidade || 0)} un.
                      </span>
                      <span className="muted">Min. {Number(peca.estoque_minimo || 0)}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="panel listPanel">
          <div className="panelHeader">
            <h2>Equipe e fornecedores</h2>
            <Truck size={18} />
          </div>
          <div className="splitList">
            <div>
              <h3>Mecânicos</h3>
              {mecanicos.length === 0 ? (
                <EmptyState loading={carregando} text="Nenhum mecânico cadastrado." />
              ) : (
                mecanicos.map((mecanico) => (
                  <div className="compactItem" key={mecanico.id}>
                    <strong>{mecanico.nome}</strong>
                    <span>{mecanico.especialidade || mecanico.telefone || 'Ativo'}</span>
                  </div>
                ))
              )}
            </div>
            <div>
              <h3>Fornecedores</h3>
              {fornecedores.length === 0 ? (
                <EmptyState loading={carregando} text="Nenhum fornecedor cadastrado." />
              ) : (
                fornecedores.map((fornecedor) => (
                  <div className="compactItem" key={fornecedor.id}>
                    <strong>{fornecedor.nome}</strong>
                    <span>{fornecedor.telefone || fornecedor.email || fornecedor.documento || '-'}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="panel listPanel">
          <div className="panelHeader">
            <h2>Fotos antes/depois</h2>
            <Camera size={18} />
          </div>
          {fotos.length === 0 ? (
            <EmptyState loading={carregando} text="Nenhuma foto cadastrada." />
          ) : (
            <div className="photoGrid">
              {fotos.map((foto) => (
                <a className="photoItem" href={foto.url} target="_blank" rel="noreferrer" key={foto.id}>
                  <img src={foto.url} alt={foto.legenda || `Foto ${foto.tipo}`} />
                  <span>{foto.tipo === 'antes' ? 'Antes' : 'Depois'}</span>
                  <strong>{foto.ordens_servico?.veiculos?.placa || 'OS'}</strong>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>}

      {ordemAcao && (
        <OsDecisionModal
          ordem={ordemAcao}
          loading={salvando}
          onClose={() => setAcaoOrdemId('')}
          onDownload={async (ordem) => {
            await baixarArquivo(osPdfUrl(ordem.id), `os-${ordem.id.slice(0, 8).toUpperCase()}.pdf`, 'OS PDF');
            setAcaoOrdemId('');
          }}
          onWhatsApp={(ordem) => {
            if (enviarOsWhatsApp(ordem)) setAcaoOrdemId('');
          }}
        />
      )}
    </main>
  );
}

function OsActions({
  ordem,
  loading,
  compact = false,
  onDownload,
  onExcel,
  onWhatsApp
}: {
  ordem: Ordem;
  loading: string;
  compact?: boolean;
  onDownload: (ordem: Ordem) => void;
  onExcel: (ordem: Ordem) => void;
  onWhatsApp: (ordem: Ordem) => void;
}) {
  return (
    <div className={compact ? 'osActions compactOsActions' : 'osActions'}>
      <button type="button" className="ghostButton" disabled={loading === 'OS PDF'} onClick={() => onDownload(ordem)}>
        <Download size={15} />
        PDF
      </button>
      <button type="button" className="ghostButton" disabled={loading === 'OS Excel'} onClick={() => onExcel(ordem)}>
        <Download size={15} />
        Excel
      </button>
      <button type="button" className="ghostButton whatsappButton" onClick={() => onWhatsApp(ordem)}>
        <MessageCircle size={15} />
        WhatsApp
      </button>
    </div>
  );
}

function OsDecisionModal({
  ordem,
  loading,
  onClose,
  onDownload,
  onWhatsApp
}: {
  ordem: Ordem;
  loading: string;
  onClose: () => void;
  onDownload: (ordem: Ordem) => void | Promise<void>;
  onWhatsApp: (ordem: Ordem) => void;
}) {
  return (
    <div className="modalOverlay" role="presentation">
      <section className="modalPanel" role="dialog" aria-modal="true" aria-labelledby="os-modal-title">
        <div className="modalHeader">
          <div>
            <span className="eyebrow">Ordem de serviço</span>
            <h2 id="os-modal-title">OS {ordem.id.slice(0, 8).toUpperCase()}</h2>
          </div>
          <button className="iconButton" type="button" onClick={onClose} title="Fechar">
            <X size={18} />
          </button>
        </div>
        <p className="modalSummary">
          {ordem.clientes?.nome || 'Cliente'} | {ordem.veiculos?.placa || 'Sem placa'} -{' '}
          {ordem.veiculos?.marca || ''} {ordem.veiculos?.modelo || ''}
        </p>
        <div className="modalActions">
          <button type="button" onClick={() => onDownload(ordem)} disabled={loading === 'OS PDF'}>
            {loading === 'OS PDF' ? <Loader2 className="spin" size={16} /> : <Download size={16} />}
            Baixar PDF da OS
          </button>
          <button type="button" className="whatsappPrimaryButton" onClick={() => onWhatsApp(ordem)}>
            <MessageCircle size={16} />
            Enviar PDF no WhatsApp
          </button>
        </div>
      </section>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string | number; value: string | number }) {
  return (
    <div className="metric">
      <div className="metricIcon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading}>
      {loading ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}
      {label}
    </button>
  );
}

function EmptyState({ loading, text }: { loading: boolean; text: string }) {
  return <p className="empty">{loading ? 'Carregando...' : text}</p>;
}

function formatDate(value: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value));
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}


