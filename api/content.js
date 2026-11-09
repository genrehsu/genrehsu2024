const { json, methodNotAllowed } = require('../server/http');
const { listContent, normalizeType } = require('../server/content');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const type = normalizeType(req.query.type);
  if (!type) return json(res, 400, { error: 'Parameter type harus events atau members.' });

  try {
    return json(res, 200, { items: await listContent(type) });
  } catch (error) {
    console.error('Gagal membaca konten Google Sheets:', error);
    return json(res, 500, { error: 'Konten belum dapat dimuat. Periksa konfigurasi Google Sheets.' });
  }
};
