'use client';

import {
  AlertTriangle,
  Camera,
  Car,
  ClipboardList,
  FileText,
  Loader2,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Truck,
  UserRound,
  Wrench
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

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
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [ordens, setOrdens] = useState<Ordem[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [fotos, setFotos] = useState<FotoOS[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState('');

  async function carregar() {
    setCarregando(true);
    setErro('');

    try {
      const endpoints = [
        { key: 'clientes', url: '/api/clientes', required: true },
        { key: 'veiculos', url: '/api/veiculos', required: true },
        { key: 'ordens', url: '/api/ordens', required: true },
        { key: 'servicos', url: '/api/servicos', required: true },
        { key: 'mecanicos', url: '/api/mecanicos' },
        { key: 'fornecedores', url: '/api/fornecedores' },
        { key: 'pecas', url: '/api/pecas' },
        { key: 'orcamentos', url: '/api/orcamentos' },
        { key: 'fotos', url: '/api/fotos' }
      ];

      const resultados = await Promise.all(
        endpoints.map(async (endpoint) => {
          const res = await fetch(endpoint.url);
          const body = await res.json();

          if (!res.ok) {
            return {
              ...endpoint,
              data: [],
              error: body?.error || 'Não foi possível carregar os dados.'
            };
          }

          return { ...endpoint, data: Array.isArray(body) ? body : [], error: '' };
        })
      );

      const falhaObrigatoria = resultados.find((resultado) => resultado.required && resultado.error);

      if (falhaObrigatoria) {
        throw new Error(falhaObrigatoria.error);
      }

      const getData = (key: string) => resultados.find((resultado) => resultado.key === key)?.data || [];

      setClientes(getData('clientes') as Cliente[]);
      setVeiculos(getData('veiculos') as Veiculo[]);
      setOrdens(getData('ordens') as Ordem[]);
      setServicos(getData('servicos') as Servico[]);
      setMecanicos(getData('mecanicos') as Mecanico[]);
      setFornecedores(getData('fornecedores') as Fornecedor[]);
      setPecas(getData('pecas') as Peca[]);
      setOrcamentos(getData('orcamentos') as Orcamento[]);
      setFotos(getData('fotos') as FotoOS[]);

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
    carregar();
  }, []);

  const veiculosDoCliente = useMemo(
    () => veiculos.filter((veiculo) => !clienteSelecionado || veiculo.cliente_id === clienteSelecionado),
    [clienteSelecionado, veiculos]
  );

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
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro inesperado ao atualizar.');
    } finally {
      setSalvando('');
    }
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
        <button className="iconButton" type="button" onClick={carregar} title="Atualizar dados">
          {carregando ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
        </button>
      </header>

      {(msg || erro) && <div className={erro ? 'notice error' : 'notice'}>{erro || msg}</div>}

      <section className="metrics">
        <Metric icon={<UserRound size={20} />} label="Clientes" value={clientes.length} />
        <Metric icon={<Car size={20} />} label="Veículos" value={veiculos.length} />
        <Metric icon={<ClipboardList size={20} />} label="OS ativas" value={osAbertas.length} />
        <Metric icon={<FileText size={20} />} label="Orcamentos" value={orcamentosAbertos.length} />
        <Metric icon={<AlertTriangle size={20} />} label="Estoque baixo" value={estoqueBaixo.length} />
        <Metric icon={<Wrench size={20} />} label="Previsto" value={money.format(faturamentoPrevisto)} />
      </section>

      <section className="workspace">
        <div className="panel">
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
        </div>

        <div className="panel">
          <div className="panelHeader">
            <h2>Novo veículo</h2>
            <Car size={18} />
          </div>
          <form onSubmit={(e) => enviar(e, '/api/veiculos', 'Veículo')}>
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
            <div className="row">
              <input name="marca" placeholder="Marca" required />
              <input name="modelo" placeholder="Modelo" required />
            </div>
            <input name="cor" placeholder="Cor" />
            <SubmitButton loading={salvando === 'Veículo'} label="Cadastrar veículo" />
          </form>
        </div>

        <div className="panel">
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
        </div>

        <div className="panel">
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
        </div>

        <div className="panel">
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
        </div>

        <div className="panel">
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
        </div>

        <div className="panel">
          <div className="panelHeader">
            <h2>Nova ordem de serviço</h2>
            <ClipboardList size={18} />
          </div>
          <form onSubmit={(e) => enviar(e, '/api/ordens', 'Ordem de serviço')}>
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
        </div>

        <div className="panel">
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
        </div>

        <div className="panel">
          <div className="panelHeader">
            <h2>Foto antes/depois</h2>
            <Camera size={18} />
          </div>
          <form onSubmit={(e) => enviar(e, '/api/fotos', 'Foto')}>
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
            <input name="url" placeholder="URL da foto" type="url" required />
            <input name="legenda" placeholder="Legenda" />
            <SubmitButton loading={salvando === 'Foto'} label="Adicionar foto" />
          </form>
        </div>
      </section>

      <section className="lists">
        <div className="panel listPanel">
          <div className="panelHeader">
            <h2>Ordens recentes</h2>
            <ClipboardList size={18} />
          </div>
          {ordens.length === 0 ? (
            <EmptyState loading={carregando} text="Nenhuma ordem de serviço cadastrada." />
          ) : (
            <div className="list">
              {ordens.map((ordem) => (
                <article className="item" key={ordem.id}>
                  <div>
                    <strong>
                      {ordem.veiculos?.placa} - {ordem.veiculos?.marca} {ordem.veiculos?.modelo}
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

        <div className="panel listPanel">
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
      </section>
    </main>
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
