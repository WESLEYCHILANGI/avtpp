const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * JWT Authentication Middleware
 * Verifies Bearer token from Authorization header and attaches user to request.
 * Implements NFR03: Token-based session management.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    return res.status(403).json({ error: 'Invalid token.' });
  }
}

module.exports = { authenticateToken };
