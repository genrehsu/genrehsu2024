const { json, methodNotAllowed } = require('../../server/http');
const { requireAdmin } = require('../../server/auth');
const { deleteContent, listContent, normalizeType, saveContent } = require('../../server/content');

module.exports = async function handler(req, res) {
  const admin = requireAdmin(req, res, json);
  if (!admin) return;

  const type = normalizeType(req.method === 'GET' ? req.query.type : req.body?.type);
  if (!type) return json(res, 400, { error: 'Jenis konten harus events atau members.' });

  try {
    if (req.method === 'GET') return json(res, 200, { items: await listContent(type) });
    if (req.method === 'POST' || req.method === 'PUT') {
      const id = req.method === 'PUT' ? String(req.body?.id || '') : '';
      if (req.method === 'PUT' && !id) return json(res, 400, { error: 'ID konten wajib diisi.' });
      return json(res, req.method === 'POST' ? 201 : 200, {
        item: await saveContent(type, req.body?.item, id)
      });
    }
    if (req.method === 'DELETE') {
      const id = String(req.body?.id || '');
      if (!id) return json(res, 400, { error: 'ID konten wajib diisi.' });
      await deleteContent(type, id);
      return json(res, 200, { success: true });
    }
    return methodNotAllowed(res, ['GET', 'POST', 'PUT', 'DELETE']);
  } catch (error) {
    console.error('Gagal mengelola konten admin:', error);
    const clientError = /wajib|maksimal|melebihi|empat digit|Cloudinary|tidak ditemukan|tidak valid/i.test(error.message);
    return json(res, clientError ? 400 : 500, {
      error: clientError ? error.message : 'Konten gagal diproses. Periksa izin dan struktur Google Sheets.'
    });
  }
};
