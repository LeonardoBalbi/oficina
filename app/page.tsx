'use client';

import {
  Car,
  ClipboardList,
  Loader2,
  Phone,
  Plus,
  RefreshCw,
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
  status: 'aberta' | 'andamento' | 'finalizada' | 'cancelada';
  descricao_problema: string;
  valor_estimado: number;
  data_entrada: string;
  clientes?: { nome: string; telefone: string };
  veiculos?: { placa: string; marca: string; modelo: string };
};

type Servico = {
  id: string;
  nome: string;
  valor: number;
  descricao?: string | null;
};

const statusLabel = {
  aberta: 'Aberta',
  andamento: 'Em andamento',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada'
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
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState('');

  async function carregar() {
    setCarregando(true);
    setErro('');

    try {
      const respostas = await Promise.all([
        fetch('/api/clientes'),
        fetch('/api/veiculos'),
        fetch('/api/ordens'),
        fetch('/api/servicos')
      ]);

      const payloads = await Promise.all(respostas.map((res) => res.json()));
      const falha = respostas.find((res) => !res.ok);

      if (falha) {
        const body = payloads[respostas.indexOf(falha)];
        throw new Error(body?.error || 'Não foi possível carregar os dados.');
      }

      setClientes(Array.isArray(payloads[0]) ? payloads[0] : []);
      setVeiculos(Array.isArray(payloads[1]) ? payloads[1] : []);
      setOrdens(Array.isArray(payloads[2]) ? payloads[2] : []);
      setServicos(Array.isArray(payloads[3]) ? payloads[3] : []);
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

  async function enviar(e: FormEvent<HTMLFormElement>, url: string, label: string) {
    e.preventDefault();
    setMsg('');
    setErro('');
    setSalvando(label);

    const form = new FormData(e.currentTarget);
    const body = Object.fromEntries(form.entries());

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

      e.currentTarget.reset();
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
        <div>
          <span className="eyebrow">Painel operacional</span>
          <h1>Oficina Mecânica</h1>
          <p>Controle clientes, veículos, serviços e ordens de serviço em uma rotina simples para balcão.</p>
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
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
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
