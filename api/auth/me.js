const { verifySession } = require('../../server/auth');
const { json, methodNotAllowed } = require('../../server/http');

module.exports = function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const session = verifySession(req);
  if (!session) return json(res, 401, { error: 'Sesi admin tidak ditemukan.' });
  return json(res, 200, { user: { username: session.username } });
};
