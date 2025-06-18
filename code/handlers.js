const conversation = require('./conversation');
const sheets = require('./sheets');
const ui = require('./ui');
const moment = require('moment');

// --- MAIN HANDLERS ---
async function handleMessage(bot, msg) {
  const chatId = msg.chat.id;
  if (conversation.getState(chatId)) {
    await conversation.handleResponse(bot, msg, false);
    return;
  }
  if (msg.text && msg.text.startsWith('/')) {
    const [command] = msg.text.substring(1).split(' ');
    await handleCommand(bot, msg, command);
  } else {
    await bot.sendMessage(chatId, 'Não entendi. Use /start para ver as opções.', { reply_markup: ui.getMainMenuKeyboard() });
  }
}

async function handleCallbackQuery(bot, cbq) {
    const chatId = cbq.message.chat.id;
    const messageId = cbq.message.message_id;
    const [type, ...params] = cbq.data.split(':');
    
    bot.answerCallbackQuery(cbq.id);

    // Se há uma conversa ativa, TUDO é enviado para o conversation handler.
    if (conversation.getState(chatId)) {
        const msg = { ...cbq.message, data: cbq.data };
        await conversation.handleResponse(bot, msg, true);
        return;
    }
    
    // Roteador de Callbacks para quando NÃO HÁ conversa ativa.
    switch (type) {
        case 'flow': handleFlow(bot, cbq, params[0]); break;
        case 'menu': handleMenu(bot, cbq, params[0]); break;
        case 'report': handleReport(bot, cbq, params[0]); break;
        case 'manage': handleManage(bot, cbq, params[0]); break;
        case 'select_edit': handleSelectEdit(bot, cbq, params[0]); break;
        case 'action_edit': handleAction(bot, cbq, 'edit', params[0]); break;
        case 'action_delete': handleAction(bot, cbq, 'delete', params[0]); break;
        case 'confirm_delete': handleConfirmDelete(bot, cbq, params[0]); break;
        case 'edit_field': handleEditField(bot, cbq, params); break;
        case 'delete_recurring': handleConfirmDeleteRecurring(bot, cbq, params[0]); break;
        case 'confirm_delete_recurring': handleDeleteRecurring(bot, cbq, params[0]); break;
        // A lógica de 'confirm' e 'cancel' foi movida para dentro do conversation.js
    }
}

// --- COMMAND HANDLER ---
async function handleCommand(bot, msg, command) {
    if (command === 'start' || command === 'help') {
        await bot.sendMessage(msg.chat.id, ui.getHelpMessage(), { parse_mode: 'Markdown', reply_markup: ui.getMainMenuKeyboard() });
    } else if (command === 'orcamento') {
        await showBudget(bot, msg.chat.id);
    }
}

// --- CALLBACK SUB-HANDLERS ---
function handleFlow(bot, cbq, action) {
    const chatId = cbq.message.chat.id;
    let message = '';
    
    if (action === 'add_gasto') {
        conversation.start(chatId, 'add_transaction', { tipo: 'Despesa' });
        message = '💸 Qual o valor do gasto?';
    } else if (action === 'add_receita') {
        conversation.start(chatId, 'add_transaction', { tipo: 'Receita' });
        message = '💰 Qual o valor da receita?';
    } else if (action === 'add_recurring') {
        conversation.start(chatId, 'add_recurring', {});
        message = 'Qual a descrição do lançamento recorrente?';
    }
    bot.editMessageText(message, { chat_id: chatId, message_id: cbq.message.message_id });
}

async function handleMenu(bot, cbq, action) {
    const options = { chat_id: cbq.message.chat.id, message_id: cbq.message.message_id };
    if (action === 'main') await bot.editMessageText('O que faremos agora?', { ...options, reply_markup: ui.getMainMenuKeyboard() });
    if (action === 'reports') await bot.editMessageText('Escolha o tipo de relatório:', { ...options, reply_markup: ui.getReportsMenuKeyboard() });
    if (action === 'manage') await bot.editMessageText('Escolha o que deseja gerenciar:', { ...options, reply_markup: ui.getManageMenuKeyboard() });
}

async function handleManage(bot, cbq, action) {
    const chatId = cbq.message.chat.id, messageId = cbq.message.message_id;
    await bot.editMessageText('Buscando dados...', { chat_id: chatId, message_id: messageId });

    if (action === 'edit') {
        const entries = (await sheets.getAllEntries()).slice(-5).reverse();
        if (entries.length === 0) {
            await bot.editMessageText('Nenhum lançamento para editar.', { chat_id: chatId, message_id: messageId });
            return;
        }
        let text = 'Escolha o número do lançamento para alterar:\n\n';
        text += entries.map((e, i) => `${i+1}. ${e.tipo === 'Despesa' ? '💸' : '💰'} ${e.descricao} R$${e.valor.toFixed(2)}`).join('\n');
        await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup: ui.getEditSelectionKeyboard(entries) });
    } else if (action === 'recurring') {
        const entries = await sheets.getAllRecurringEntries();
        await bot.editMessageText('Gerenciar lançamentos recorrentes:', { chat_id: chatId, message_id: messageId, reply_markup: ui.getRecurringManageKeyboard(entries) });
    }
}

async function handleSelectEdit(bot, cbq, rowNumber) {
    const allEntries = await sheets.getAllEntries();
    const entry = allEntries.find(e => e.rowNumber == rowNumber);
    const text = `Você selecionou:\n*${entry.descricao} - R$${entry.valor.toFixed(2)}*\n\nO que deseja fazer?`;
    await bot.editMessageText(text, { chat_id: cbq.message.chat.id, message_id: cbq.message.message_id, parse_mode: 'Markdown', reply_markup: ui.getActionKeyboard(rowNumber) });
}

async function handleAction(bot, cbq, action, rowNumber) {
    const chatId = cbq.message.chat.id, messageId = cbq.message.message_id;
    if (action === 'edit') {
        await bot.editMessageText('Qual campo você quer editar?', { chat_id: chatId, message_id: messageId, reply_markup: ui.getEditFieldKeyboard(rowNumber) });
    } else if (action === 'delete') {
        const allEntries = await sheets.getAllEntries();
        const entry = allEntries.find(e => e.rowNumber == rowNumber);
        const text = `Tem certeza que deseja excluir:\n*${entry.descricao} - R$${entry.valor.toFixed(2)}*?`;
        const keyboard = { inline_keyboard: [[{ text: 'Sim, Excluir', callback_data: `confirm_delete:${rowNumber}` }, { text: 'Não', callback_data: 'menu:manage' }]] };
        await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: keyboard });
    }
}

async function handleConfirmDelete(bot, cbq, rowNumber) {
    await bot.editMessageText('Excluindo...', { chat_id: cbq.message.chat.id, message_id: cbq.message.message_id });
    await sheets.deleteRow(rowNumber);
    await bot.editMessageText('✅ Lançamento excluído com sucesso!', { chat_id: cbq.message.chat.id, message_id: cbq.message.message_id });
}

async function handleConfirmDeleteRecurring(bot, cbq, rowNumber) {
    const text = `Tem certeza que deseja excluir este lançamento recorrente?`;
    const keyboard = { inline_keyboard: [[{ text: 'Sim, Excluir', callback_data: `confirm_delete_recurring:${rowNumber}` }, { text: 'Não', callback_data: 'manage:recurring' }]] };
    await bot.editMessageText(text, { chat_id: cbq.message.chat.id, message_id: cbq.message.message_id, reply_markup: keyboard });
}
async function handleDeleteRecurring(bot, cbq, rowNumber) {
    await sheets.deleteRecurringRow(rowNumber);
    await bot.editMessageText('✅ Lançamento recorrente excluído!', { chat_id: cbq.message.chat.id, message_id: cbq.message.message_id });
}

function handleEditField(bot, cbq, params) {
    const [rowNumber, column] = params;
    const fieldNames = {B: 'Descrição', C: 'Categoria', D: 'Valor', F: 'Conta'};
    conversation.start(cbq.message.chat.id, 'edit_transaction', { rowNumber, column, fieldName: fieldNames[column] });
    bot.editMessageText(`Digite o novo valor para *${fieldNames[column]}*:`, {chat_id: cbq.message.chat.id, message_id: cbq.message.message_id, parse_mode: 'Markdown'});
}

async function handleReport(bot, cbq, action) { 
    const chatId = cbq.message.chat.id;
    const messageId = cbq.message.message_id;
    await bot.editMessageText('⏳ Gerando relatório...', { chat_id: chatId, message_id: messageId });

    const allEntries = await sheets.getAllEntries();
    const monthEntries = allEntries.filter(e => moment(e.data, 'DD/MM/YYYY').isSame(moment(), 'month'));
    
    let reportText = '';

    switch(action) {
        case 'month_summary':
            const income = monthEntries.filter(e => e.tipo === 'Receita').reduce((sum, e) => sum + e.valor, 0);
            const expense = monthEntries.filter(e => e.tipo === 'Despesa').reduce((sum, e) => sum + e.valor, 0);
            const balance = income - expense;
            reportText = `*Resumo de ${moment().format('MMMM')}* 🗓️\n\n💰 Receitas: R$ ${income.toFixed(2)}\n💸 Despesas: R$ ${expense.toFixed(2)}\n\nSaldo do Mês: *R$ ${balance.toFixed(2)}*`;
            break;

        case 'category_spending':
            const spendingByCategory = monthEntries
                .filter(e => e.tipo === 'Despesa')
                .reduce((acc, e) => {
                    acc[e.categoria] = (acc[e.categoria] || 0) + e.valor;
                    return acc;
                }, {});

            const sortedSpending = Object.entries(spendingByCategory).sort(([,a],[,b]) => b-a);
            reportText = `*Gastos por Categoria em ${moment().format('MMMM')}* 🗂️\n\n`;
            if (sortedSpending.length === 0) {
                reportText += "Nenhuma despesa registrada este mês.";
            } else {
                 reportText += sortedSpending.map(([cat, val]) => `• ${cat}: R$ ${val.toFixed(2)}`).join('\n');
            }
            break;
    }
    await bot.editMessageText(reportText, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' });
}

async function showBudget(bot, chatId) { 
    const budgets = await sheets.getBudgets();
    const allEntries = await sheets.getAllEntries();
    
    const report = {};
    const monthEntries = allEntries.filter(e => e.tipo === 'Despesa' && moment(e.data, 'DD/MM/YYYY').isSame(moment(), 'month'));

    for(const category in budgets) {
        const spent = monthEntries
            .filter(e => e.categoria === category)
            .reduce((sum, e) => sum + e.valor, 0);
        
        report[category] = {
            budget: budgets[category],
            spent: spent,
        };
    }
    
    const text = ui.getBudgetStatusText(report);
    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
}

module.exports = { handleMessage, handleCallbackQuery };