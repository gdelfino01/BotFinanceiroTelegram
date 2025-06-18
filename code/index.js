require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { handleMessage, handleCallbackQuery } = require('./handlers');

// Inicializa o bot
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

console.log('🤖 Bot iniciado com sucesso!');

// Listener para mensagens de texto
bot.on('message', (msg) => {
  // Ignora callbacks que também chegam como 'message'
  if (msg.text && !msg.text.startsWith('/')) {
    handleMessage(bot, msg);
  }
});

// Listener para comandos (ex: /start, /gasto)
bot.onText(/\/(.+)/, (msg, match) => {
    handleMessage(bot, msg, match);
});

// Listener para cliques nos botões (inline keyboard)
bot.on('callback_query', (callbackQuery) => {
  handleCallbackQuery(bot, callbackQuery);
});

// Tratamento de erros de polling para manter o bot rodando
bot.on('polling_error', (error) => {
  console.error(`Polling error: ${error.code} - ${error.message}`);
});