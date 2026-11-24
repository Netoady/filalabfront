import { useEffect, useState } from 'react';
import { buscarResumo, criarRequisicoes, listarRequisicoes } from './services/api';

export default function App() {
  const [quantidade, setQuantidade] = useState(10);
  const [descricao, setDescricao] = useState('Requisicao via API');
  const [requisicoes, setRequisicoes] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  async function carregarDados() {
    try {
      setErro('');
      const [listaData, resumoData] = await Promise.all([
        listarRequisicoes(),
        buscarResumo(),
      ]);
      setRequisicoes(Array.isArray(listaData) ? listaData : []);
      setResumo(resumoData);
    } catch (err) {
      setErro(
        err.response?.data?.message ||
          'Não foi possível conectar na API. Verifique se o back está rodando e se o CORS está liberado.'
      );
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const intervalo = setInterval(() => {
      carregarDados();
    }, 2000);
    return () => clearInterval(intervalo);
  }, [autoRefresh]);

  async function handleSubmit(e) {
    e.preventDefault();
    const qtd = Number(quantidade);
    if (!qtd || qtd < 1) {
      setErro('Informe uma quantidade maior que zero.');
      return;
    }

    try {
      setEnviando(true);
      setErro('');
      setMensagem('');
      await criarRequisicoes({ quantidade: qtd, descricao });
      setMensagem(`Enviado lote de ${qtd} requisição(ões) para a fila (202 Accepted).`);
      await carregarDados();
    } catch (err) {
      setErro(
        err.response?.data?.message ||
          'Erro ao enviar requisições para /requisicoes.'
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: '32px auto', padding: '0 16px', fontFamily: 'sans-serif' }}>
      <h1>Fila Lab — Painel de Testes</h1>
      <p style={{ color: '#555' }}>
        Disparo assíncrono via RabbitMQ, acompanhamento no PostgreSQL e leitura com cache no Redis.
      </p>

      {erro && (
        <div style={{ background: '#ffe5e5', color: '#900', padding: 12, borderRadius: 6, marginBottom: 16 }}>
          {erro}
        </div>
      )}

      {mensagem && (
        <div style={{ background: '#e6f7ed', color: '#135e29', padding: 12, borderRadius: 6, marginBottom: 16 }}>
          {mensagem}
        </div>
      )}

      {/* Formulário de envio */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'end',
          padding: 16,
          border: '1px solid #ddd',
          borderRadius: 8,
          marginBottom: 20,
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Quantidade</label>
          <input
            type="number"
            min={1}
            max={500}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            style={{ padding: '8px 10px', width: 110 }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Descrição</label>
          <input
            type="text"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Teste de lote"
            style={{ padding: '8px 10px', width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          disabled={enviando}
          style={{ padding: '9px 16px', cursor: 'pointer' }}
        >
          {enviando ? 'Enviando...' : 'Disparar na Fila'}
        </button>

        <button
          type="button"
          onClick={carregarDados}
          style={{ padding: '9px 14px', cursor: 'pointer' }}
        >
          Atualizar Agora
        </button>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto-atualizar (2s)
        </label>
      </form>

      {/* Resumo / Cache */}
      <div
        style={{
          padding: 16,
          border: '1px solid #ddd',
          borderRadius: 8,
          marginBottom: 20,
          background: '#fafafa',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <strong>Resumo (/requisicoes/resumo)</strong>
          {resumo?.origem && (
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 'bold',
                background: resumo.origem === 'REDIS_CACHE' ? '#e0f2fe' : '#fef3c7',
                color: resumo.origem === 'REDIS_CACHE' ? '#0369a1' : '#92400e',
              }}
            >
              Origem: {resumo.origem}
            </span>
          )}
        </div>

        <pre style={{ marginTop: 10, marginBottom: 0, overflowX: 'auto' }}>
          {resumo ? JSON.stringify(resumo, null, 2) : 'Carregando resumo...'}
        </pre>
      </div>

      {/* Lista de requisições */}
      <div style={{ border: '1px solid #ddd', borderRadius: 8, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: 10 }}>ID</th>
              <th style={{ padding: 10 }}>Descrição</th>
              <th style={{ padding: 10 }}>Status</th>
              <th style={{ padding: 10 }}>Criado em</th>
              <th style={{ padding: 10 }}>Processado em</th>
            </tr>
          </thead>
          <tbody>
            {requisicoes.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 14, textAlign: 'center', color: '#666' }}>
                  Nenhuma requisição encontrada ainda.
                </td>
              </tr>
            ) : (
              requisicoes.map((item) => (
                <tr key={item.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: 10 }}>{item.id}</td>
                  <td style={{ padding: 10 }}>{item.descricao}</td>
                  <td style={{ padding: 10 }}>
                    <strong>{item.status}</strong>
                  </td>
                  <td style={{ padding: 10 }}>{item.criadoEm}</td>
                  <td style={{ padding: 10 }}>{item.processadoEm || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}