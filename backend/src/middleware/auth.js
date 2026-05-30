
// ─── middleware/auth.js ───────────────────────────────────────────────────────
const { auth } = require('../config/firebase');

/**
 * Verifies Firebase ID token sent in Authorization header.
 * Attaches decoded user to req.user.
 */
async function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.split('Bearer ')[1];
  try {
    req.user = await auth.verifyIdToken(token);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token', code: 'AUTH_FAILED' });
  }
}

module.exports = { verifyToken };