const crypto = require('node:crypto');
const { requireAdmin } = require('../server/auth');
const { json, methodNotAllowed } = require('../server/http');

module.exports = function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!requireAdmin(req, res, json)) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return json(res, 500, { error: 'Konfigurasi Cloudinary belum lengkap.' });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'duta-genre-hsu';
  const publicId = crypto.randomUUID();
  const parameters = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1')
    .update(`${parameters}${apiSecret}`)
    .digest('hex');
  return json(res, 200, { cloudName, apiKey, timestamp, folder, publicId, signature });
};
