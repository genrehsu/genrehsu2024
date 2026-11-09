const crypto = require('node:crypto');

const GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
let cachedAccessToken = null;
let tokenExpiresAt = 0;

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
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return requestGoogleSheets(operation, options);
  }

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

async function requestGoogleSheets(operation, options) {
  const accessToken = await getGoogleAccessToken();
  const spreadsheetId = encodeURIComponent(options.spreadsheetId);
  const range = encodeURIComponent(options.range);
  const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  let url = baseUrl;
  let method = 'GET';
  let body;

  if (operation === 'append') {
    url += `:append?valueInputOption=${encodeURIComponent(options.valueInputOption || 'RAW')}`;
    if (options.insertDataOption) {
      url += `&insertDataOption=${encodeURIComponent(options.insertDataOption)}`;
    }
    method = 'POST';
    body = options.requestBody;
  } else if (operation === 'update') {
    url += `?valueInputOption=${encodeURIComponent(options.valueInputOption || 'RAW')}`;
    method = 'PUT';
    body = options.requestBody;
  } else if (operation === 'clear') {
    url += ':clear';
    method = 'POST';
    body = {};
  } else if (operation !== 'get') {
    throw new Error('Operasi Google Sheets tidak dikenal.');
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const result = await readGoogleResponse(response);
  if (!response.ok) {
    throw new Error(result.error?.message || `Google Sheets API gagal (HTTP ${response.status}).`);
  }
  return { data: result };
}

async function getGoogleAccessToken() {
  if (cachedAccessToken && tokenExpiresAt > Date.now() + 60_000) {
    return cachedAccessToken;
  }

  const serviceAccount = getServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: GOOGLE_SHEETS_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }));
  const unsignedAssertion = `${header}.${claims}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsignedAssertion), serviceAccount.private_key)
    .toString('base64url');
  const assertion = `${unsignedAssertion}.${signature}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  const result = await readGoogleResponse(response);
  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description || result.error?.message || 'Gagal mendapatkan token Google Sheets API.');
  }

  cachedAccessToken = result.access_token;
  tokenExpiresAt = Date.now() + Number(result.expires_in || 3600) * 1000;
  return cachedAccessToken;
}

function getServiceAccount() {
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON harus berisi JSON service account yang valid.');
  }
  if (!serviceAccount || typeof serviceAccount !== 'object'
    || typeof serviceAccount.client_email !== 'string'
    || typeof serviceAccount.private_key !== 'string') {
    throw new Error('Service account harus memiliki client_email dan private_key.');
  }
  return {
    client_email: serviceAccount.client_email,
    private_key: serviceAccount.private_key.replace(/\\n/g, '\n')
  };
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

async function readGoogleResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Google API mengembalikan respons tidak valid (HTTP ${response.status}).`);
  }
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
