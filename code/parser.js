const moment = require('moment');
const removeAccents = require('remove-accents');
const sheets = require('./sheets');

function normalize(text) {
  return removeAccents(text.toLowerCase().trim());
}

function parseValue(text) {
  const match = text.match(/(\d+[.,]?\d*)/);
  return match ? parseFloat(match[1].replace(',', '.')) : null;
}

async function handleCommand(text) {
  const [cmd, ...args] = text.split(' ');
  switch (cmd) {
    case '/resumo':
      return await sheets.getResumo();
    case '/ultimos':
      return await sheets.getUltimos(Number(args[0]) || 5);
    case '/addcategoria':
      return await sheets.addCategoria(args.join(' '));
    case '/remcategoria':
      return await sheets.remCategoria(args.join(' '));
    case '/addconta':
      return await sheets.addConta(args.join(' '));
    case '/remconta':
      return await sheets.remConta(args.join(' '));
    case '/gastos':
      return await sheets.handleGastos(args);
    case '/receitas':
      return await sheets.handleReceitas(args);
    case '/ajuda':
    case '/start':
      return menu();
    default:
      return '❌ Comando não reconhecido. Digite /ajuda.';
  }
}

function menu() {
  return `🤖 *Menu de Ajuda*

Envie um gasto ou receita, por exemplo:
• gastei 45 com mercado no cartão de crédito
• recebi 1200 de salário na conta corrente

*Comandos úteis*
/resumo – saldo geral
/ultimos 5 – últimos lançamentos
/gastos – ver todos os gastos
/gastos categoria Alimentação
/gastos data 18/06/2025
/receitas – ver receitas
/receitas categoria Salário
/receitas data 17/06/2025
/addcategoria Netflix despesa
/addconta PicPay`;
}

async function parseTransaction(text) {
  const valor = parseValue(text);
  if (!valor) return null;

  const isReceita = /(recebi|entrou|ganhei)/.test(text);
  const isDespesa = /(gastei|paguei|gasto)/.test(text);
  if (!isReceita && !isDespesa) return null;

  const tipo = isReceita ? 'Receita' : 'Despesa';

  const categorias = await sheets.listCategorias();
  const contas = await sheets.listContas();

  const categoriaMatch = categorias.find(c => text.includes(c.norm)) || { original: 'Outros' };
  const contaMatch = contas.find(c => text.includes(c.norm)) || { original: 'Não Informado' };

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

async function handleMessage(msg) {
  const textRaw = msg.text;
  if (!textRaw) return;
  const text = normalize(textRaw);

  if (text.startsWith('/')) {
    return await handleCommand(text);
  }

  const lanc = await parseTransaction(text);
  if (lanc) {
    await sheets.writeToSheet(lanc);
    return `✅ ${lanc.tipo} de *R$${lanc.valor.toFixed(2)}* registrada em *${lanc.categoria}* via *${lanc.conta}*`;
  }

  return menu();
}

module.exports = { handleMessage };