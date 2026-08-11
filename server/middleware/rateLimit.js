const rateLimit = require('express-rate-limit');

/**
 * Rate limiting middleware (mitigates brute-force / credential-stuffing).
 *
 * Account-level lockout already exists in the login flow (NFR03); these limiters
 * add an IP-level ceiling so register, login and especially the self-service
 * password reset cannot be hammered. Counts are per-IP within a rolling window.
 */

// General ceiling for the auth surface (login, register, profile, etc.).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,                  // 50 auth requests / IP / 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// Stricter ceiling for the password-reset endpoint, whose identity check
// (email + phone) is intentionally low-entropy per project scope (§1.6.2).
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                   // 5 reset attempts / IP / hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset attempts. Please try again later.' },
});

module.exports = { authLimiter, passwordResetLimiter };
