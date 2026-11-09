const crypto = require('node:crypto');
const { getSheetsClient, getSpreadsheetId, sheetRange } = require('./sheets');

const SESSION_COOKIE = 'genre_admin_session';
const SESSION_SECONDS = 60 * 60 * 8;

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET harus berisi minimal 32 karakter acak.');
  }
  return secret;
}

function sign(value) {
  return crypto.createHmac('sha256', sessionSecret()).update(value).digest('base64url');
}

function createSession(username, role) {
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(JSON.stringify({
    sub: username,
    role,
    iat: now,
    exp: now + SESSION_SECONDS
  }));
  const body = `${base64url('{"alg":"HS256","typ":"JWT"}')}.${payload}`;
  return `${body}.${sign(body)}`;
}

function readCookies(req) {
  return Object.fromEntries((req.headers.cookie || '')
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const separator = part.indexOf('=');
      return separator < 0
        ? [part, '']
        : [part.slice(0, separator), part.slice(separator + 1)];
    }));
}

function verifySession(req) {
  const token = readCookies(req)[SESSION_COOKIE];
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const body = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(parts[2]);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!payload.sub || payload.role !== 'admin' || payload.exp <= Date.now() / 1000) return null;
    return { username: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}${secure}`);
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`);
}

async function authenticateAdmin(username, password) {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: sheetRange('admins', 'A2:D')
  });
  const admins = response.data.values || [];
  const admin = admins.find(row =>
    String(row[0] || '').trim().toLowerCase() === username.trim().toLowerCase()
    && String(row[2] || '').trim().toLowerCase() === 'admin'
    && ['true', '1', 'yes', 'aktif'].includes(String(row[3] || '').trim().toLowerCase())
  );
  if (!admin || !verifyPassword(password, String(admin[1] || ''))) return null;
  return { username: String(admin[0]).trim(), role: 'admin' };
}

function verifyPassword(password, encodedHash) {
  const parts = encodedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 1000000) return false;

  try {
    const salt = Buffer.from(parts[2], 'base64url');
    const expected = Buffer.from(parts[3], 'base64url');
    if (salt.length < 16 || expected.length !== 32) return false;
    const actual = crypto.pbkdf2Sync(password, salt, iterations, expected.length, 'sha256');
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function requireAdmin(req, res, json) {
  const session = verifySession(req);
  if (!session) {
    json(res, 401, { error: 'Sesi admin tidak valid atau sudah berakhir. Silakan login kembali.' });
    return null;
  }
  return session;
}

module.exports = {
  SESSION_SECONDS,
  authenticateAdmin,
  clearSessionCookie,
  createSession,
  requireAdmin,
  setSessionCookie,
  verifySession
};
