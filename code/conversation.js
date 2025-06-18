const moment = require('moment');
const sheets = require('./sheets');
const ui = require('./ui');

function start(chatId, type, userStates) {
    userStates[chatId] = {
        step: 'awaiting_value',
        data: {
            tipo: type
        }
    };
}

async function handleResponse(bot, response, userStates) {
    const chatId = response.message ? response.message.chat.id : response.chat.id;
    const state = userStates[chatId];

    if (!state) return;

    const messageId = response.message ? response.message.message_id : null;
    const text = response.text; // para mensagens
    const data = response.data; // para callbacks de botões

    switch (state.step) {
        case 'awaiting_value':
            const value = parseFloat(String(text).replace(',', '.'));
            if (isNaN(value) || value <= 0) {
                await bot.sendMessage(chatId, '❌ Valor inválido. Por favor, digite um número maior que zero.');
                return;
            }
            state.data.valor = value;
            state.step = 'awaiting_category';
            const categoriesKeyboard = await ui.getCategoriesKeyboard(state.data.tipo);
            await bot.sendMessage(chatId, 'Ótimo. Agora escolha a categoria:', { reply_markup: categoriesKeyboard });
            break;

        case 'awaiting_category':
            state.data.categoria = data;
            state.step = 'awaiting_account';
            const accountsKeyboard = await ui.getAccountsKeyboard();
            // Edita a mensagem anterior para remover o teclado de categorias
            if(messageId) await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
            await bot.sendMessage(chatId, `Categoria definida como *${data}*. E a conta/método?`, { parse_mode: 'Markdown', reply_markup: accountsKeyboard });
            break;

        case 'awaiting_account':
            state.data.conta = data;
            state.step = 'awaiting_description';
            if(messageId) await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
            await bot.sendMessage(chatId, `Conta definida como *${data}*. Gostaria de adicionar uma descrição? (ou clique em Pular)`, {
                parse_mode: 'Markdown',
                reply_markup: ui.getSkipKeyboard('description')
            });
            break;

        case 'awaiting_description':
            if (data === 'skip_description') {
                state.data.descricao = state.data.categoria; // Usa a categoria como descrição padrão
            } else {
                state.data.descricao = text;
            }
            state.step = 'awaiting_confirmation';
            const confirmationText = ui.getConfirmationText(state.data);
            await bot.sendMessage(chatId, confirmationText, {
                parse_mode: 'Markdown',
                reply_markup: ui.getConfirmationKeyboard()
            });
            break;

        case 'awaiting_confirmation':
            if (data === 'confirm') {
                const finalData = {
                    ...state.data,
                    data: moment().format('DD/MM/YYYY'),
                    obs: '' // Campo extra se você quiser usar no futuro
                };
                await sheets.writeToSheet(finalData);
                await bot.editMessageText(`✅ Lançamento salvo com sucesso!`, { chat_id: chatId, message_id: messageId });
                // Limpa o estado
                delete userStates[chatId];
                // Mostra o menu principal de novo
                await bot.sendMessage(chatId, 'O que faremos agora?', { reply_markup: ui.getMainMenuKeyboard() });

            } else if (data === 'cancel') {
                await bot.editMessageText('❌ Lançamento cancelado.', { chat_id: chatId, message_id: messageId });
                delete userStates[chatId];
                await bot.sendMessage(chatId, 'O que faremos agora?', { reply_markup: ui.getMainMenuKeyboard() });
            }
            break;
    }
}

module.exports = { start, handleResponse };