const { google } = require('googleapis');
const creds = require('./credentials.json');
const removeAccents = require('remove-accents');
const moment = require('moment');
require('dotenv').config();

function normalize(text) {
  if (!text) return '';
  return removeAccents(String(text).toLowerCase().trim());
}

async function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

// Melhorado para separar despesas e receitas
async function listCategorias() {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: 'Configurações!A:B' // Coluna A para Despesas, B para Receitas
  });
  const rows = res.data.values || [];
  const categorias = { despesas: [], receitas: [] };
  rows.shift(); // Remove o cabeçalho
  rows.forEach(row => {
    if (row[0]) categorias.despesas.push({ original: row[0], norm: normalize(row[0]) });
    if (row[1]) categorias.receitas.push({ original: row[1], norm: normalize(row[1]) });
  });
  return categorias;
}

async function listContas() {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: 'Configurações!C:C'
  });
  const rows = res.data.values || [];
  rows.shift(); // Remove o cabeçalho
  return rows.flat().filter(Boolean).map(c => ({ original: c, norm: normalize(c) }));
}

async function writeToSheet(lanc) {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SHEET_ID,
    range: 'Lançamentos!A:G',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        lanc.data, lanc.descricao, lanc.categoria, lanc.valor,
        lanc.tipo, lanc.conta, lanc.obs
      ]]
    }
  });
}

async function readSheet(range) {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range
  });
  return res.data.values || [];
}

async function getResumo() {
  const rows = await readSheet('Lançamentos!D2:E');
  let rec = 0, desp = 0;
  rows.forEach(([valor, tipo]) => {
    const v = parseFloat(String(valor).replace('R$', '').replace('.', '').replace(',', '.')) || 0;
    if (normalize(tipo) === 'receita') rec += v;
    if (normalize(tipo) === 'despesa') desp += v;
  });
  const saldo = rec - desp;
  return `📊 *Resumo Geral*
Receitas: R$ ${rec.toFixed(2)}
Despesas: R$ ${desp.toFixed(2)}
💰 Saldo: *R$ ${saldo.toFixed(2)}*`;
}

async function getUltimos(n = 5) {
  const rows = await readSheet('Lançamentos!A2:G');
  if (!rows.length) return 'Nenhum lançamento.';
  const ult = rows.slice(-n).reverse();
  return '🧾 *Últimos lançamentos:*\n' + ult.map(r => `• ${r[4]} de R$ ${r[3]} em ${r[2]}`).join('\n');
}

// Mantém a função de parse antigo como um fallback
async function parseLegacyTransaction(text) {
  const normText = normalize(text);
  const valorMatch = normText.match(/(\d+[\.,]?\d*)/);
  if (!valorMatch) return null;
  const valor = parseFloat(valorMatch[1].replace(',', '.'));

  const isReceita = /(recebi|ganhei|entrou)/.test(normText);
  const isDespesa = /(gastei|paguei|comprei|gasto)/.test(normText);
  if (!isReceita && !isDespesa) return null;

  const tipo = isReceita ? 'Receita' : 'Despesa';

  const categorias = await listCategorias();
  const contas = await listContas();
  
  const catsToSearch = tipo === 'Despesa' ? categorias.despesas : categorias.receitas;

  const categoriaMatch = catsToSearch.find(c => normText.includes(c.norm)) || { original: 'Outros' };
  const contaMatch = contas.find(c => normText.includes(c.norm)) || { original: 'Não Informado' };

  return {
    data: moment().format('DD/MM/YYYY'),
    descricao: text,
    categoria: categoriaMatch.original,
    valor,
    tipo,
    conta: contaMatch.original,
    obs: ''
  };
}


module.exports = {
  writeToSheet,
  getResumo,
  getUltimos,
  listCategorias,
  listContas,
  parseLegacyTransaction
};