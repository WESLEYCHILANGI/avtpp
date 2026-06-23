const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Admin Authentication Middleware
 * Verifies admin JWT token and checks role (SuperAdmin/Staff).
 */
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No admin token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Admin token expired. Please log in again.' });
    }
    return res.status(403).json({ error: 'Invalid admin token.' });
  }
}

module.exports = { authenticateAdmin };
