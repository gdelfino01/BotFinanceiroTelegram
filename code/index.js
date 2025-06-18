const fs = require('fs');
if (process.env.GOOGLE_CREDENTIALS_BASE64) {
  console.log('Decodificando credenciais do Google a partir da variável de ambiente...');
  const credentials_buffer = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64');
  fs.writeFileSync('credentials.json', credentials_buffer);
  console.log('Arquivo credentials.json criado com sucesso.');
}

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