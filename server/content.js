const { randomUUID } = require('node:crypto');
const { getSheetsClient, getSpreadsheetId, sheetRange } = require('./sheets');

const COLUMNS = ['id', 'title', 'subtitle', 'description', 'imageUrl', 'cloudinaryPublicId', 'year', 'createdAt'];

function normalizeType(type) {
  return type === 'events' || type === 'members' ? type : null;
}

function rowToItem(row) {
  return Object.fromEntries(COLUMNS.map((column, index) => [column, String(row[index] || '')]));
}

async function listContent(type) {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: sheetRange(type, 'A2:H')
  });
  return (response.data.values || [])
    .map(rowToItem)
    .filter(item => item.id && item.title && item.imageUrl)
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
}

function validateInput(input, type) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Data konten tidak valid.');
  }
  const title = String(input.title || '').trim();
  const subtitle = String(input.subtitle || '').trim();
  const description = String(input.description || '').trim();
  const year = String(input.year || '').trim();
  const imageUrl = String(input.imageUrl || '').trim();
  const cloudinaryPublicId = String(input.cloudinaryPublicId || '').trim();
  const titleLabel = type === 'members' ? 'Nama anggota' : 'Judul kegiatan';

  if (!title || title.length > 120) throw new Error(`${titleLabel} wajib diisi (maksimal 120 karakter).`);
  if (subtitle.length > 120 || description.length > 1000) throw new Error('Panjang deskripsi atau subjudul melebihi batas.');
  if (year && !/^\d{4}$/.test(year)) throw new Error('Tahun harus berformat empat digit.');

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) throw new Error('CLOUDINARY_CLOUD_NAME harus dikonfigurasi.');
  const expectedImagePrefix = `https://res.cloudinary.com/${cloudName}/image/upload/`;
  if (!imageUrl.startsWith(expectedImagePrefix) || !cloudinaryPublicId) {
    throw new Error('Gambar harus diunggah ke Cloudinary melalui panel admin.');
  }

  return { title, subtitle, description, imageUrl, cloudinaryPublicId, year };
}

async function saveContent(type, input, id) {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const data = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetRange(type, 'A2:H')
  });
  const rows = data.data.values || [];
  const rowIndex = id ? rows.findIndex(row => String(row[0] || '') === id) : -1;
  if (id && rowIndex < 0) throw new Error('Konten tidak ditemukan.');
  const now = new Date().toISOString();
  const previous = rowIndex >= 0 ? rowToItem(rows[rowIndex]) : null;
  const validated = validateInput(input, type);
  const item = {
    id: previous ? previous.id : randomUUID(),
    ...validated,
    createdAt: previous ? previous.createdAt : now
  };
  const values = [COLUMNS.map(column => item[column])];

  if (rowIndex >= 0) {
    const sheetRow = rowIndex + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: sheetRange(type, `A${sheetRow}:H${sheetRow}`),
      valueInputOption: 'RAW',
      requestBody: { values }
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: sheetRange(type, 'A:H'),
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values }
    });
  }
  return item;
}

async function deleteContent(type, id) {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const data = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetRange(type, 'A2:H')
  });
  const rows = data.data.values || [];
  const rowIndex = rows.findIndex(row => String(row[0] || '') === id);
  if (rowIndex < 0) throw new Error('Konten tidak ditemukan.');

  const sheetRow = rowIndex + 2;
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: sheetRange(type, `A${sheetRow}:H${sheetRow}`)
  });
}

module.exports = { deleteContent, listContent, normalizeType, saveContent };
