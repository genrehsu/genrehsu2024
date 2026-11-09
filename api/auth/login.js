const { authenticateAdmin, createSession, setSessionCookie } = require('../../server/auth');
const { json, methodNotAllowed } = require('../../server/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!username || !password || username.length > 100 || password.length > 200) {
    return json(res, 400, { error: 'Username dan password wajib diisi.' });
  }

  try {
    const admin = await authenticateAdmin(username, password);
    if (!admin) return json(res, 401, { error: 'Username atau password salah, atau akun tidak aktif.' });
    setSessionCookie(res, createSession(admin.username, admin.role));
    return json(res, 200, { user: { username: admin.username } });
  } catch (error) {
    console.error('Gagal memproses login admin:', error);
    return json(res, 500, { error: 'Login belum dapat diproses. Periksa konfigurasi Google Sheets dan SESSION_SECRET.' });
  }
};
