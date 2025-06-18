const moment = require('moment');
const sheets = require('./sheets');
const ui = require('./ui');

const userStates = {};

function start(chatId, flow, initialData = {}) {
    userStates[chatId] = {
        flow,
        step: 'awaiting_value',
        data: initialData
    };
    if (flow === 'add_recurring') {
        userStates[chatId].step = 'awaiting_description';
    } else if (flow === 'edit_transaction') {
         userStates[chatId].step = 'awaiting_new_value';
    }
}

function getState(chatId) {
    return userStates[chatId];
}

function clearState(chatId) {
    delete userStates[chatId];
}

async function handleResponse(bot, msg, isCallback = false) {
    const chatId = msg.chat.id;
    const state = userStates[chatId];
    if (!state) return;

    switch (state.flow) {
        case 'add_transaction':
            await handleAddTransaction(bot, msg, state, isCallback);
            break;
        case 'add_recurring':
            await handleAddRecurring(bot, msg, state, isCallback);
            break;
        case 'edit_transaction':
            await handleEditTransaction(bot, msg, state, isCallback);
            break;
    }
}

// --- FLOW HANDLERS ---

async function handleAddTransaction(bot, msg, state, isCallback) {
    const chatId = msg.chat.id, messageId = msg.message_id, text = isCallback ? msg.data.split(':')[1] : msg.text;
    
    switch (state.step) {
        case 'awaiting_value':
            const value = parseFloat(String(text).replace(',', '.'));
            if (isNaN(value) || value <= 0) {
                await bot.sendMessage(chatId, '❌ Valor inválido. Digite um número positivo.');
                return;
            }
            state.data.valor = value;
            state.step = 'awaiting_category';
            await bot.sendMessage(chatId, 'Ótimo. Agora escolha a categoria:', { reply_markup: await ui.getCategoriesKeyboard(state.data.tipo) });
            break;

        case 'awaiting_category':
            state.data.categoria = text;
            state.step = 'awaiting_account';
            await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
            await bot.sendMessage(chatId, `Categoria: *${text}*. E a conta?`, { parse_mode: 'Markdown', reply_markup: await ui.getAccountsKeyboard() });
            break;
        
        case 'awaiting_account':
            state.data.conta = text;
            state.step = 'awaiting_description';
            await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
            await bot.sendMessage(chatId, `Conta: *${text}*. Descrição? (ou digite '-' para pular)`, { parse_mode: 'Markdown' });
            break;

        case 'awaiting_description':
            state.data.descricao = (text === '-') ? state.data.categoria : text;
            state.step = 'awaiting_confirmation';
            await bot.sendMessage(chatId, ui.getConfirmationText(state.data), { parse_mode: 'Markdown', reply_markup: ui.getConfirmationKeyboard(chatId) });
            break;
    }
}

async function handleAddRecurring(bot, msg, state, isCallback) {
    const chatId = msg.chat.id, messageId = msg.message_id, text = isCallback ? msg.data.split(':')[1] : msg.text;
    switch (state.step) {
        case 'awaiting_description':
            state.data.descricao = text;
            state.step = 'awaiting_value';
            await bot.sendMessage(chatId, 'Descrição definida. Qual o valor?');
            break;
        case 'awaiting_value':
            const value = parseFloat(String(text).replace(',', '.'));
            if (isNaN(value) || value <= 0) {
                await bot.sendMessage(chatId, '❌ Valor inválido.');
                return;
            }
            state.data.valor = value;
            state.step = 'awaiting_type';
            await bot.sendMessage(chatId, 'É uma Receita ou Despesa?', { reply_markup: { inline_keyboard: [[{text: 'Receita', callback_data: 'data:Receita'}, {text: 'Despesa', callback_data: 'data:Despesa'}]]}});
            break;
        case 'awaiting_type':
            state.data.tipo = text;
            state.step = 'awaiting_category';
            await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
            await bot.sendMessage(chatId, 'Ok. E a categoria?', { reply_markup: await ui.getCategoriesKeyboard(state.data.tipo) });
            break;
        case 'awaiting_category':
            state.data.categoria = text;
            state.step = 'awaiting_account';
            await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
            await bot.sendMessage(chatId, 'E a conta?', { reply_markup: await ui.getAccountsKeyboard() });
            break;
        case 'awaiting_account':
            state.data.conta = text;
            state.step = 'awaiting_day';
            await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
            await bot.sendMessage(chatId, 'Qual dia do mês (1-31) deve ser lançado?');
            break;
        case 'awaiting_day':
            const day = parseInt(text, 10);
            if (isNaN(day) || day < 1 || day > 31) {
                await bot.sendMessage(chatId, '❌ Dia inválido. Informe um número de 1 a 31.');
                return;
            }
            state.data.diaDoMes = day;
            await sheets.addRecurringEntry(state.data);
            await bot.sendMessage(chatId, '✅ Lançamento recorrente salvo com sucesso!');
            clearState(chatId);
            break;
    }
}

async function handleEditTransaction(bot, msg, state, isCallback) {
    const chatId = msg.chat.id;
    const text = msg.text;
    const { rowNumber, column, fieldName } = state.data;
    
    await sheets.updateRow(rowNumber, column, text);
    await bot.sendMessage(chatId, `✅ Campo *${fieldName}* atualizado para *${text}*!`, { parse_mode: 'Markdown'});
    clearState(chatId);
}

module.exports = { start, handleResponse, clearState, getState };