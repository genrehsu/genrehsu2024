const { clearSessionCookie } = require('../../server/auth');
const { json, methodNotAllowed } = require('../../server/http');

module.exports = function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  clearSessionCookie(res);
  return json(res, 200, { success: true });
};
