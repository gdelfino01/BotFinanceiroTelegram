const { google } = require('googleapis');
const creds = require('./credentials.json');
const removeAccents = require('remove-accents');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Constantes para os nomes das abas e ranges
const SHEET_ID = process.env.SHEET_ID;
const LANCAMENTOS_RANGE = 'Lançamentos!A:H';
const CONFIG_RANGE = 'Configurações!A:C';
const BUDGET_RANGE = 'Orçamentos!A:B';
const RECURRING_RANGE = 'Recorrentes!A:G';

function normalize(text) {
  if (!text) return '';
  return removeAccents(String(text).toLowerCase().trim());
}

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

async function readSheet(range) {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range
    });
    return res.data.values || [];
}

async function writeToSheet(lanc) {
    const sheets = await getSheetsClient();
    const newId = uuidv4();
    await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: 'Lançamentos!A:H',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [[
                moment().format('DD/MM/YYYY'), lanc.descricao, lanc.categoria, lanc.valor,
                lanc.tipo, lanc.conta, lanc.obs || '', newId
            ]]
        }
    });
    return { ...lanc, id: newId };
}

async function updateRow(rowNumber, columnLetter, value) {
    const sheets = await getSheetsClient();
    const range = `Lançamentos!${columnLetter}${rowNumber}`;
    await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [[value]]
        }
    });
}


async function deleteRow(rowNumber) {
    const sheets = await getSheetsClient();
    const sheetId = await getSheetIdByName('Lançamentos');

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId: sheetId,
                        dimension: 'ROWS',
                        startIndex: rowNumber - 1,
                        endIndex: rowNumber
                    }
                }
            }]
        }
    });
}

async function deleteRecurringRow(rowNumber) {
    const sheets = await getSheetsClient();
    const sheetId = await getSheetIdByName('Recorrentes');
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId: sheetId,
                        dimension: 'ROWS',
                        startIndex: rowNumber - 1,
                        endIndex: rowNumber
                    }
                }
            }]
        }
    });
}

// Helper para encontrar o ID numérico de uma aba pelo nome
async function getSheetIdByName(sheetName) {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const sheet = res.data.sheets.find(s => s.properties.title === sheetName);
    if (!sheet) throw new Error(`Sheet with name "${sheetName}" not found.`);
    return sheet.properties.sheetId;
}


async function getAllEntries() {
    const rows = await readSheet('Lançamentos!A:H');
    if(rows.length > 0) rows.shift(); // Remove header
    return rows.map((row, index) => ({
        data: row[0],
        descricao: row[1],
        categoria: row[2],
        valor: parseFloat(String(row[3] || '0').replace('R$', '').replace('.', '').replace(',', '.')) || 0,
        tipo: row[4],
        conta: row[5],
        obs: row[6],
        id: row[7],
        rowNumber: index + 2
    }));
}

async function getBudgets() {
    const rows = await readSheet(BUDGET_RANGE);
    if(rows.length > 0) rows.shift();
    const budgets = {};
    rows.forEach(row => {
        if (row[0] && row[1]) {
            const budgetValue = parseFloat(String(row[1]).replace('R$', '').replace('.', '').replace(',', '.'));
            budgets[row[0]] = budgetValue;
        }
    });
    return budgets;
}

async function getAllRecurringEntries() {
    const rows = await readSheet(RECURRING_RANGE);
    if(rows.length > 0) rows.shift();
    return rows.map((row, index) => ({
        descricao: row[0],
        valor: parseFloat(String(row[1]).replace('R$', '').replace('.', '').replace(',', '.')) || 0,
        tipo: row[2],
        categoria: row[3],
        conta: row[4],
        diaDoMes: parseInt(row[5], 10),
        rowNumber: index + 2
    }));
}

async function addRecurringEntry(entry) {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: RECURRING_RANGE,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [[
                entry.descricao, entry.valor, entry.tipo, entry.categoria, entry.conta, entry.diaDoMes
            ]]
        }
    });
}

async function listCategorias() {
  const rows = await readSheet('Configurações!A:B');
  if(rows.length > 0) rows.shift();
  const categorias = { despesas: [], receitas: [] };
  rows.forEach(row => {
    if (row[0]) categorias.despesas.push({ original: row[0], norm: normalize(row[0]) });
    if (row[1]) categorias.receitas.push({ original: row[1], norm: normalize(row[1]) });
  });
  return categorias;
}

async function listContas() {
  const rows = await readSheet('Configurações!C:C');
  if(rows.length > 0) rows.shift();
  return rows.flat().filter(Boolean).map(c => ({ original: c, norm: normalize(c) }));
}

module.exports = {
    getAllEntries,
    writeToSheet,
    updateRow,
    deleteRow,
    deleteRecurringRow,
    getBudgets,
    getAllRecurringEntries,
    addRecurringEntry,
    listCategorias,
    listContas
};