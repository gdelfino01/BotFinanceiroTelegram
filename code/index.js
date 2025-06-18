const fs = require('fs');
if (process.env.GOOGLE_CREDENTIALS_BASE64) {
  console.log('Decodificando credenciais do Google a partir da variável de ambiente...');
  const credentials_buffer = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64');
  fs.writeFileSync('credentials.json', credentials_buffer);
  console.log('Arquivo credentials.json criado com sucesso.');
}

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const moment = require('moment');

const { handleMessage, handleCallbackQuery } = require('./handlers');
const sheets = require('./sheets');

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

console.log('🤖 Bot iniciado com sucesso!');

// Listener para mensagens de texto e comandos
bot.on('message', (msg) => {
  handleMessage(bot, msg);
});

// Listener para cliques nos botões (inline keyboard)
bot.on('callback_query', (callbackQuery) => {
  handleCallbackQuery(bot, callbackQuery);
});

// --- TAREFA AGENDADA (CRON JOB) ---
// Roda todo dia às 8:00 da manhã.
cron.schedule('0 8 * * *', async () => {
    console.log('Executando tarefa agendada de lançamentos recorrentes...');
    const today = moment().date();
    const recurringEntries = await sheets.getRecurringEntries();

    const entriesForToday = recurringEntries.filter(e => e.diaDoMes === today);
    
    if (entriesForToday.length > 0) {
        console.log(`Encontrados ${entriesForToday.length} lançamentos recorrentes para hoje.`);
        for (const entry of entriesForToday) {
            await sheets.writeToSheet(entry);
            console.log(`Lançamento recorrente '${entry.descricao}' registrado.`);
            // Opcional: notificar o admin/usuário
            // bot.sendMessage(ADMIN_CHAT_ID, `Lançamento recorrente '${entry.descricao}' foi registrado.`);
        }
    } else {
        console.log('Nenhum lançamento recorrente para hoje.');
    }
}, {
    timezone: "America/Sao_Paulo"
});


// Tratamento de erros de polling
bot.on('polling_error', (error) => {
  console.error(`Polling error: ${error.code} - ${error.message}`);
});