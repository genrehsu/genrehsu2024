const SHEET_HEADERS = {
  Admins: ['username', 'passwordHash', 'role', 'active'],
  Events: ['id', 'title', 'subtitle', 'description', 'imageUrl', 'cloudinaryPublicId', 'year', 'createdAt'],
  Members: ['id', 'title', 'subtitle', 'description', 'imageUrl', 'cloudinaryPublicId', 'year', 'createdAt']
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Duta Genre')
    .addItem('Siapkan tab database', 'setupSpreadsheet')
    .addItem('Atur secret proxy', 'configureProxySecret')
    .addToUi();
}

function setupSpreadsheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Buka project Apps Script dari Google Spreadsheet yang akan digunakan.');

  Object.keys(SHEET_HEADERS).forEach(function (name) {
    let sheet = spreadsheet.getSheetByName(name);
    if (!sheet) sheet = spreadsheet.insertSheet(name);

    const headers = SHEET_HEADERS[name];
    const existing = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
    if (existing.every(function (value) { return !value; })) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      return;
    }

    if (headers.some(function (header, index) { return existing[index] !== header; })) {
      throw new Error('Header tab ' + name + ' tidak sesuai. Periksa baris pertama sebelum menjalankan setup lagi.');
    }
  });

  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheet.getId());
  SpreadsheetApp.getUi().alert('Tab Admins, Events, dan Members siap digunakan.');
}

function configureProxySecret() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.prompt(
    'Secret proxy',
    'Masukkan secret acak minimal 32 karakter. Simpan nilai yang sama sebagai GAS_PROXY_SECRET di Vercel.',
    ui.ButtonSet.OK_CANCEL
  );
  if (result.getSelectedButton() !== ui.Button.OK) return;

  const secret = result.getResponseText().trim();
  if (secret.length < 32) throw new Error('Secret harus berisi minimal 32 karakter.');
  PropertiesService.getScriptProperties().setProperty('PROXY_SECRET', secret);
  ui.alert('Secret proxy tersimpan di Script Properties.');
}

function doGet() {
  return jsonOutput({ ok: true, service: 'duta-genre-sheets' });
}

function doPost(event) {
  try {
    const request = JSON.parse(event.postData.contents || '{}');
    const properties = PropertiesService.getScriptProperties();
    const expectedSecret = properties.getProperty('PROXY_SECRET');
    if (!expectedSecret || !constantTimeEquals(String(request.secret || ''), expectedSecret)) {
      throw new Error('Akses proxy tidak diizinkan.');
    }

    const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
    if (!spreadsheetId || request.spreadsheetId !== spreadsheetId) {
      throw new Error('Spreadsheet belum disiapkan atau ID tidak sesuai.');
    }

    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    let result;
    if (request.operation === 'get') {
      result = executeSheetOperation(spreadsheet, request);
    } else {
      const lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try {
        result = executeSheetOperation(spreadsheet, request);
      } finally {
        lock.releaseLock();
      }
    }
    return jsonOutput({ ok: true, data: result });
  } catch (error) {
    return jsonOutput({ ok: false, error: error.message || 'Permintaan Apps Script gagal.' });
  }
}

function executeSheetOperation(spreadsheet, request) {
  const operation = request.operation;
  const range = parseRange(spreadsheet, request.range);
  const sheet = range.sheet;

  if (operation === 'get') {
    const lastRow = sheet.getLastRow();
    if (range.startRow > lastRow) return { values: [] };
    const rowCount = Math.min(range.endRow || lastRow, lastRow) - range.startRow + 1;
    const values = sheet.getRange(range.startRow, range.startColumn, rowCount, range.columnCount).getDisplayValues();
    return { values: trimValues(values) };
  }

  if (operation === 'append') {
    const values = request.requestBody && request.requestBody.values;
    if (!Array.isArray(values) || values.length !== 1) throw new Error('Data append tidak valid.');
    const row = values[0].slice(0, range.columnCount);
    while (row.length < range.columnCount) row.push('');
    sheet.getRange(sheet.getLastRow() + 1, range.startColumn, 1, range.columnCount).setValues([row]);
    return {};
  }

  if (operation === 'update') {
    const values = request.requestBody && request.requestBody.values;
    if (!Array.isArray(values) || values.length !== 1 || !range.endRow || range.startRow !== range.endRow) {
      throw new Error('Data update tidak valid.');
    }
    const row = values[0].slice(0, range.columnCount);
    while (row.length < range.columnCount) row.push('');
    sheet.getRange(range.startRow, range.startColumn, 1, range.columnCount).setValues([row]);
    return {};
  }

  if (operation === 'clear') {
    if (!range.endRow || range.startRow !== range.endRow) throw new Error('Range clear tidak valid.');
    sheet.getRange(range.startRow, range.startColumn, 1, range.columnCount).clearContent();
    return {};
  }

  throw new Error('Operasi Sheets tidak dikenal.');
}

function parseRange(spreadsheet, value) {
  const match = String(value || '').match(/^(?:'((?:[^']|'')+)'|([^'!]+))!(.+)$/);
  if (!match) throw new Error('Range Sheets tidak valid.');

  const sheetName = (match[1] || match[2]).replace(/''/g, "'");
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error('Tab Sheets tidak ditemukan: ' + sheetName);

  const cells = match[3].match(/^([A-Z]+)(\d*)(?::([A-Z]+)(\d*))?$/i);
  if (!cells) throw new Error('Format range Sheets tidak didukung.');

  const startColumn = columnNumber(cells[1]);
  const endColumn = columnNumber(cells[3] || cells[1]);
  const startRow = Number(cells[2] || 1);
  const endRow = cells[4] ? Number(cells[4]) : null;
  if (endColumn < startColumn || (endRow && endRow < startRow)) throw new Error('Range Sheets tidak valid.');

  return {
    sheet: sheet,
    startRow: startRow,
    endRow: endRow,
    startColumn: startColumn,
    columnCount: endColumn - startColumn + 1
  };
}

function columnNumber(column) {
  return column.toUpperCase().split('').reduce(function (number, letter) {
    return number * 26 + letter.charCodeAt(0) - 64;
  }, 0);
}

function trimValues(values) {
  while (values.length && values[values.length - 1].every(function (value) { return value === ''; })) {
    values.pop();
  }
  return values.map(function (row) {
    while (row.length && row[row.length - 1] === '') row.pop();
    return row;
  });
}

function constantTimeEquals(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function jsonOutput(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
