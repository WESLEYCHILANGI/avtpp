const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const { authLimiter, passwordResetLimiter } = require('./middleware/rateLimit');

// Route imports
const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const walletRoutes = require('./routes/wallet');
const tollRoutes = require('./routes/toll');
const transactionRoutes = require('./routes/transactions');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');

const app = express();

// Managed hosts (Render/Railway) sit behind a reverse proxy. Trust the first
// proxy hop so express-rate-limit and req.ip see the real client address from
// X-Forwarded-For instead of the proxy's IP.
app.set('trust proxy', 1);

// ── Security headers ──
// Helmet sets HSTS, X-Frame-Options, X-Content-Type-Options, etc. The default
// Content-Security-Policy is disabled because Express serves the bundled React
// SPA from the same origin and a strict CSP can block its assets; the other
// protections still apply.
app.use(helmet({ contentSecurityPolicy: false }));

// ── Middleware ──
// Same-origin in production (Express serves the frontend), so CORS mainly
// matters for local dev or a split deployment. Extra origins via CORS_ORIGIN
// (comma-separated).
const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000'];
if (process.env.CORS_ORIGIN) {
  allowedOrigins.push(...process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean));
}
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (quiet during tests)
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ── API Routes ──
// General IP ceiling across the whole auth surface, then a stricter ceiling
// layered on the low-entropy password reset.
app.use('/api/auth', authLimiter);
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/toll', tollRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// ── Health Check ──
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'AVTPP - Automated Vehicle Toll Payment and Request Platform',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ── Serve built frontend (single-origin deploy) ──
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found.' });
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next(err);
  });
});

// ── Error Handler ──
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

module.exports = app;
