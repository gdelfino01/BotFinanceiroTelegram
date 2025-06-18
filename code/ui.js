const sheets = require('./sheets');

function getMainMenuKeyboard() {
    return { inline_keyboard: [
        [{ text: '💸 Novo Gasto', callback_data: 'flow:add_gasto' }, { text: '💰 Nova Receita', callback_data: 'flow:add_receita' }],
        [{ text: '📊 Relatórios', callback_data: 'menu:reports' }, { text: '⚙️ Gerenciar', callback_data: 'menu:manage' }]
    ]};
}

function getReportsMenuKeyboard() {
    return { inline_keyboard: [
        [{ text: '🗓️ Resumo do Mês', callback_data: 'report:month_summary' }],
        [{ text: '🗂️ Gastos por Categoria', callback_data: 'report:category_spending' }],
        [{ text: '🔙 Voltar ao Menu', callback_data: 'menu:main' }]
    ]};
}

function getManageMenuKeyboard() {
    return { inline_keyboard: [
        [{ text: '✏️ Editar/Excluir Lançamento', callback_data: 'manage:edit' }],
        [{ text: '🔁 Gerenciar Recorrentes', callback_data: 'manage:recurring' }],
        [{ text: '🔙 Voltar ao Menu', callback_data: 'menu:main' }]
    ]};
}

function getHelpMessage() {
    return `🤖 *Bot de Finanças* \n\nUse os botões para um controle completo.\n\n*AÇÕES:*\n💸 *Novo Gasto*: Registra uma despesa.\n💰 *Nova Receita*: Registra uma receita.\n\n*ANÁLISE E CONTROLE:*\n📊 *Relatórios*: Resumos e gastos por categoria.\n⚙️ *Gerenciar*: Edite, exclua ou crie lançamentos recorrentes.\n\n*COMANDOS:*\n\`/start\` - Mostra este menu.\n\`/orcamento\` - Mostra o status do seu orçamento mensal.`;
}

async function getCategoriesKeyboard(type) {
    const allCategories = await sheets.listCategorias();
    const categories = type === 'Despesa' ? allCategories.despesas : allCategories.receitas;
    const keyboard = categories.map(cat => ({ text: cat.original, callback_data: `data:${cat.original}` }));
    const rows = [];
    for (let i = 0; i < keyboard.length; i += 2) rows.push(keyboard.slice(i, i + 2));
    return { inline_keyboard: rows };
}

async function getAccountsKeyboard() {
    const accounts = await sheets.listContas();
    const keyboard = accounts.map(acc => ({ text: acc.original, callback_data: `data:${acc.original}` }));
    const rows = [];
    for (let i = 0; i < keyboard.length; i += 2) rows.push(keyboard.slice(i, i + 2));
    return { inline_keyboard: rows };
}

function getConfirmationKeyboard(flow_id) {
    return { inline_keyboard: [[{ text: '✅ Confirmar', callback_data: `confirm:${flow_id}` }, { text: '❌ Cancelar', callback_data: `cancel:${flow_id}` }]] };
}

// NOVO: Teclado para selecionar qual transação (1-5)
function getEditSelectionKeyboard(entries) {
    const buttons = entries.map((entry, index) => ({
        text: `${index + 1}`,
        callback_data: `select_edit:${entry.rowNumber}`
    }));

    // Agrupa os botões em uma única linha
    const keyboardRow = [buttons];
    
    return { inline_keyboard: keyboardRow };
}

// NOVO: Teclado que aparece APÓS selecionar a transação
function getActionKeyboard(rowNumber) {
    return { inline_keyboard: [[
        { text: 'Editar ✏️', callback_data: `action_edit:${rowNumber}` },
        { text: 'Excluir 🗑️', callback_data: `action_delete:${rowNumber}` }
    ]]};
}

// NOVO: Teclado para escolher o campo a ser editado
function getEditFieldKeyboard(rowNumber) {
    return { inline_keyboard: [
        [{ text: 'Valor', callback_data: `edit_field:${rowNumber}:D` }, { text: 'Descrição', callback_data: `edit_field:${rowNumber}:B` }],
        [{ text: 'Categoria', callback_data: `edit_field:${rowNumber}:C` }, { text: 'Conta', callback_data: `edit_field:${rowNumber}:F` }],
        [{ text: '🔙 Cancelar', callback_data: 'menu:manage' }]
    ]};
}

function getRecurringManageKeyboard(entries) {
    const rows = entries.map(entry => ([
        { text: `(Dia ${entry.diaDoMes}) ${entry.descricao} - R$${entry.valor.toFixed(2)}`, callback_data: `noop` },
        { text: '🗑️', callback_data: `delete_recurring:${entry.rowNumber}` }
    ]));
    rows.push([{ text: '➕ Adicionar Novo Recorrente', callback_data: 'flow:add_recurring' }]);
    rows.push([{ text: '🔙 Voltar', callback_data: 'menu:manage' }]);
    return { inline_keyboard: rows };
}

function getConfirmationText(data) {
    return `*Por favor, confirme os dados:*\n\n- *Tipo:* ${data.tipo}\n- *Valor:* R$${data.valor.toFixed(2)}\n- *Categoria:* ${data.categoria}\n- *Conta:* ${data.conta}\n- *Descrição:* ${data.descricao}\n\nTudo certo?`;
}

function getBudgetStatusText(budgetReport) {
    let text = `📊 *Status do Orçamento (${moment().format('MMMM')})*\n\n`;
    if(Object.keys(budgetReport).length === 0) {
        return text + "Você ainda não configurou orçamentos na sua planilha.";
    }
    for (const category in budgetReport) {
        const item = budgetReport[category];
        const percentage = item.budget > 0 ? (item.spent / item.budget) * 100 : 100;
        let icon = percentage >= 100 ? '💣' : (percentage >= 90 ? '⚠️' : '✅');
        text += `• *${category}*: R$${item.spent.toFixed(2)} de R$${item.budget.toFixed(2)} (*${percentage.toFixed(0)}%* ${icon})\n`;
    }
    return text;
}

module.exports = {
    getMainMenuKeyboard, getReportsMenuKeyboard, getManageMenuKeyboard, getHelpMessage,
    getCategoriesKeyboard, getAccountsKeyboard, getConfirmationKeyboard,
    getEditSelectionKeyboard, getActionKeyboard, getEditFieldKeyboard,
    getRecurringManageKeyboard, getConfirmationText, getBudgetStatusText,
};