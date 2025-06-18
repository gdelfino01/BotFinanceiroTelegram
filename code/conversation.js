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
    const chatId = msg.chat.id, messageId = msg.message_id;
    const text = isCallback ? msg.data : msg.text;
    const action = isCallback ? text.split(':')[0] : null;
    const data = isCallback ? text.split(':')[1] : text;
    
    switch (state.step) {
        case 'awaiting_value':
            const value = parseFloat(String(data).replace(',', '.'));
            if (isNaN(value) || value <= 0) {
                await bot.sendMessage(chatId, '❌ Valor inválido. Digite um número positivo.');
                return;
            }
            state.data.valor = value;
            state.step = 'awaiting_category';
            await bot.sendMessage(chatId, 'Ótimo. Agora escolha a categoria:', { reply_markup: await ui.getCategoriesKeyboard(state.data.tipo) });
            break;

        case 'awaiting_category':
            if (action !== 'data') return;
            state.data.categoria = data;
            state.step = 'awaiting_account';
            await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
            await bot.sendMessage(chatId, `Categoria: *${data}*. E a conta?`, { parse_mode: 'Markdown', reply_markup: await ui.getAccountsKeyboard() });
            break;
        
        case 'awaiting_account':
            if (action !== 'data') return;
            state.data.conta = data;
            state.step = 'awaiting_description';
            await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
            await bot.sendMessage(chatId, `Conta: *${data}*. Descrição? (ou digite '-' para pular)`, { parse_mode: 'Markdown' });
            break;

        case 'awaiting_description':
            state.data.descricao = (data === '-') ? state.data.categoria : data;
            state.step = 'awaiting_confirmation';
            await bot.sendMessage(chatId, ui.getConfirmationText(state.data), { parse_mode: 'Markdown', reply_markup: ui.getConfirmationKeyboard(chatId) });
            break;
        
        // ETAPA CORRIGIDA E ADICIONADA AQUI
        case 'awaiting_confirmation':
            const flow_id = data;
            if (flow_id != chatId) return; // Confirmação para outra pessoa

            if (action === 'confirm') {
                await bot.editMessageText('Salvando...', { chat_id: chatId, message_id: messageId, reply_markup: null });
                const savedData = await sheets.writeToSheet(state.data);
                await bot.editMessageText(`✅ Lançamento salvo com sucesso!`, { chat_id: chatId, message_id: messageId });

                // Lógica de alerta de orçamento
                if (savedData.tipo === 'Despesa') {
                    // (código do alerta de orçamento, se houver)
                }
            
            } else if (action === 'cancel') {
                await bot.editMessageText('❌ Lançamento cancelado.', { chat_id: chatId, message_id: messageId, reply_markup: null });
            }
            // Limpa o estado e mostra o menu principal
            clearState(chatId);
            await bot.sendMessage(chatId, 'O que faremos agora?', { reply_markup: ui.getMainMenuKeyboard() });
            break;
    }
}

async function handleAddRecurring(bot, msg, state, isCallback) {
    const chatId = msg.chat.id, messageId = msg.message_id;
    const text = isCallback ? msg.data : msg.text;
    const action = isCallback ? text.split(':')[0] : null;
    const data = isCallback ? text.split(':')[1] : text;

    switch (state.step) {
        case 'awaiting_description':
            state.data.descricao = data;
            state.step = 'awaiting_value';
            await bot.sendMessage(chatId, 'Descrição definida. Qual o valor?');
            break;
        case 'awaiting_value':
            const value = parseFloat(String(data).replace(',', '.'));
            if (isNaN(value) || value <= 0) {
                await bot.sendMessage(chatId, '❌ Valor inválido.');
                return;
            }
            state.data.valor = value;
            state.step = 'awaiting_type';
            await bot.sendMessage(chatId, 'É uma Receita ou Despesa?', { reply_markup: { inline_keyboard: [[{text: 'Receita', callback_data: 'data:Receita'}, {text: 'Despesa', callback_data: 'data:Despesa'}]]}});
            break;
        case 'awaiting_type':
            if (action !== 'data') return;
            state.data.tipo = data;
            state.step = 'awaiting_category';
            await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
            await bot.sendMessage(chatId, 'Ok. E a categoria?', { reply_markup: await ui.getCategoriesKeyboard(state.data.tipo) });
            break;
        case 'awaiting_category':
            if (action !== 'data') return;
            state.data.categoria = data;
            state.step = 'awaiting_account';
            await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
            await bot.sendMessage(chatId, 'E a conta?', { reply_markup: await ui.getAccountsKeyboard() });
            break;
        case 'awaiting_account':
            if (action !== 'data') return;
            state.data.conta = data;
            state.step = 'awaiting_day';
            await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
            await bot.sendMessage(chatId, 'Qual dia do mês (1-31) deve ser lançado?');
            break;
        case 'awaiting_day':
            const day = parseInt(data, 10);
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