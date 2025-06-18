const conversation = require('./conversation');
const sheets = require('./sheets');
const ui = require('./ui');

// Objeto para armazenar o estado da conversa de cada usuário
const userStates = {};

async function handleMessage(bot, msg, match) {
  const chatId = msg.chat.id;
  const text = msg.text || '';

  // Se o usuário está no meio de uma conversa, encaminha para o handler de conversa
  if (userStates[chatId]) {
    await conversation.handleResponse(bot, msg, userStates);
    return;
  }
  
  // Se não, trata como um novo comando
  const command = match ? match[1].split(' ')[0] : text.split(' ')[0];
  const args = match ? match[1].split(' ').slice(1) : [];

  switch (command) {
    case 'start':
    case 'ajuda':
      await bot.sendMessage(chatId, ui.getHelpMessage(), { parse_mode: 'Markdown', reply_markup: ui.getMainMenuKeyboard() });
      break;
    case 'gasto':
      conversation.start(chatId, 'Despesa', userStates);
      await bot.sendMessage(chatId, '💸 Qual o valor do gasto?', { reply_markup: { force_reply: true } });
      break;
    case 'receita':
      conversation.start(chatId, 'Receita', userStates);
      await bot.sendMessage(chatId, '💰 Qual o valor da receita?', { reply_markup: { force_reply: true } });
      break;
    case 'resumo':
        const resumo = await sheets.getResumo();
        await bot.sendMessage(chatId, resumo, { parse_mode: 'Markdown' });
        break;
    case 'ultimos':
        const ultimos = await sheets.getUltimos(Number(args[0]) || 5);
        await bot.sendMessage(chatId, ultimos, { parse_mode: 'Markdown' });
        break;
    // Adicione outros comandos aqui se necessário
    default:
      // Mantém a funcionalidade antiga para lançamentos rápidos
      const lanc = await sheets.parseLegacyTransaction(text);
      if (lanc) {
        await sheets.writeToSheet(lanc);
        await bot.sendMessage(chatId, `✅ (Rápido) ${lanc.tipo} de *R$${lanc.valor.toFixed(2)}* registrada em *${lanc.categoria}* via *${lanc.conta}*`, { parse_mode: 'Markdown' });
      } else {
        await bot.sendMessage(chatId, 'Comando não reconhecido. Use o menu abaixo ou digite /ajuda.', { reply_markup: ui.getMainMenuKeyboard() });
      }
      break;
  }
}

async function handleCallbackQuery(bot, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  // Responde ao callback para o Telegram saber que foi recebido
  bot.answerCallbackQuery(callbackQuery.id);

  // Se for um callback de uma conversa, encaminha para o handler
  if (userStates[chatId]) {
    await conversation.handleResponse(bot, callbackQuery, userStates);
    return;
  }

  // Se não, trata como um callback de menu
  const [command, ...args] = data.split(':');
  
  switch (command) {
    case 'start_gasto':
      conversation.start(chatId, 'Despesa', userStates);
      await bot.sendMessage(chatId, '💸 Qual o valor do gasto?');
      break;
    case 'start_receita':
      conversation.start(chatId, 'Receita', userStates);
      await bot.sendMessage(chatId, '💰 Qual o valor da receita?');
      break;
    case 'show_resumo':
      const resumo = await sheets.getResumo();
      await bot.sendMessage(chatId, resumo, { parse_mode: 'Markdown' });
      break;
    case 'show_ultimos':
      const ultimos = await sheets.getUltimos(5);
      await bot.sendMessage(chatId, ultimos, { parse_mode: 'Markdown' });
      break;
  }
}

module.exports = { handleMessage, handleCallbackQuery, userStates };