const sheets = require('./sheets');

function getMainMenuKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '💸 Novo Gasto', callback_data: 'start_gasto' },
                { text: '💰 Nova Receita', callback_data: 'start_receita' }
            ],
            [
                { text: '📊 Ver Resumo', callback_data: 'show_resumo' },
                { text: '🧾 Ver Últimos 5', callback_data: 'show_ultimos' }
            ]
        ]
    };
}

function getHelpMessage() {
    return `🤖 *Bot de Finanças*

Use os botões abaixo para interagir. Você pode:

💸 *Novo Gasto*: Inicia o passo a passo para registrar uma despesa.
💰 *Nova Receita*: Inicia o passo a passo para registrar uma entrada.
📊 *Ver Resumo*: Mostra o balanço geral de receitas e despesas.
🧾 *Ver Últimos 5*: Lista seus últimos 5 lançamentos.

Você ainda pode usar os comandos legados como \`/resumo\` ou \`/ultimos 10\`.`;
}

async function getCategoriesKeyboard(type) {
    const allCategories = await sheets.listCategorias();
    const categories = type === 'Despesa' ? allCategories.despesas : allCategories.receitas;

    const keyboard = categories.map(cat => ({
        text: cat.original,
        callback_data: cat.original
    }));

    // Converte o array em uma matriz de botões
    const rows = [];
    for (let i = 0; i < keyboard.length; i += 2) {
        rows.push(keyboard.slice(i, i + 2));
    }
    return { inline_keyboard: rows };
}

async function getAccountsKeyboard() {
    const accounts = await sheets.listContas();
    const keyboard = accounts.map(acc => ({
        text: acc.original,
        callback_data: acc.original
    }));

    const rows = [];
    for (let i = 0; i < keyboard.length; i += 2) {
        rows.push(keyboard.slice(i, i + 2));
    }
    return { inline_keyboard: rows };
}

function getSkipKeyboard(step) {
    return { inline_keyboard: [[{ text: 'Pular', callback_data: `skip_${step}` }]] };
}

function getConfirmationKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '✅ Confirmar', callback_data: 'confirm' },
                { text: '❌ Cancelar', callback_data: 'cancel' }
            ]
        ]
    };
}

function getConfirmationText(data) {
    return `
    *Por favor, confirme os dados:*

    - *Tipo:* ${data.tipo}
    - *Valor:* R$${data.valor.toFixed(2)}
    - *Categoria:* ${data.categoria}
    - *Conta:* ${data.conta}
    - *Descrição:* ${data.descricao}

    Tudo certo?
    `;
}


module.exports = {
    getMainMenuKeyboard,
    getHelpMessage,
    getCategoriesKeyboard,
    getAccountsKeyboard,
    getSkipKeyboard,
    getConfirmationKeyboard,
    getConfirmationText
};