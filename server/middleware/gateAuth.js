require('dotenv').config();

/**
 * Toll Gate Device Authentication Middleware
 *
 * The automated toll flow described in the report (FR05, §4.4.2) is triggered by
 * a roadside identification device, NOT by an authenticated road user. Per the
 * project scope (§1.6.2) that device is emulated by a software simulator and a
 * mock API. This middleware authenticates that simulated device using a shared
 * gate API key (sent in the `x-gate-key` header) rather than a user JWT.
 */
function authenticateGate(req, res, next) {
  const provided = req.headers['x-gate-key'];
  const expected = process.env.GATE_API_KEY;

  if (!expected) {
    return res.status(500).json({ error: 'Gate API key is not configured on the server.' });
  }
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'Invalid or missing gate device key.' });
  }
  next();
}

module.exports = { authenticateGate };
