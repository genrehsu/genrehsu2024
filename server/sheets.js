function getSheetsClient() {
  return {
    spreadsheets: {
      values: {
        get: options => requestSheets('get', options),
        append: options => requestSheets('append', options),
        update: options => requestSheets('update', options),
        clear: options => requestSheets('clear', options)
      }
    }
  };
}

async function requestSheets(operation, options) {
  const url = process.env.GAS_WEB_APP_URL;
  const secret = process.env.GAS_PROXY_SECRET;
  if (!url || !secret) {
    throw new Error('GAS_WEB_APP_URL dan GAS_PROXY_SECRET harus dikonfigurasi.');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret,
      operation,
      spreadsheetId: getSpreadsheetId(),
      range: options.range,
      requestBody: options.requestBody
    })
  });
  const text = await response.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(`Apps Script mengembalikan respons yang tidak valid (HTTP ${response.status}).`);
  }
  if (!response.ok || !result.ok) {
    throw new Error(result.error || `Permintaan Apps Script gagal (HTTP ${response.status}).`);
  }
  return { data: result.data || {} };
}

function getSpreadsheetId() {
  const id = process.env.GOOGLE_SHEETS_ID;
  if (!id) throw new Error('GOOGLE_SHEETS_ID harus dikonfigurasi.');
  return id;
}

function sheetName(type) {
  const names = {
    admins: process.env.ADMINS_SHEET_NAME || 'Admins',
    events: process.env.EVENTS_SHEET_NAME || 'Events',
    members: process.env.MEMBERS_SHEET_NAME || 'Members'
  };
  if (!names[type]) throw new Error('Jenis sheet tidak dikenal.');
  return names[type];
}

function sheetRange(type, range) {
  const escapedName = sheetName(type).replace(/'/g, "''");
  return `'${escapedName}'!${range}`;
}

module.exports = { getSheetsClient, getSpreadsheetId, sheetName, sheetRange };
