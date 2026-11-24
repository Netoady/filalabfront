import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8081';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function criarRequisicoes({ quantidade, descricao }) {
  const params = { quantidade };
  const body = descricao?.trim() ? { descricao: descricao.trim() } : {};
  const { data } = await api.post('/requisicoes', body, { params });
  return data;
}

export async function listarRequisicoes() {
  const { data } = await api.get('/requisicoes');
  return data;
}

export async function buscarResumo() {
  const { data } = await api.get('/requisicoes/resumo');
  return data;
}