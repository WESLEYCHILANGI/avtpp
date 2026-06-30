const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initializeDatabase, query } = require('./config/database');
const { seed } = require('./seeds/seed');

// Route imports
const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const walletRoutes = require('./routes/wallet');
const tollRoutes = require('./routes/toll');
const transactionRoutes = require('./routes/transactions');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

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

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ── API Routes ──
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
// The Vite production build is served by Express so the whole platform runs
// on one origin/port — convenient for a single public tunnel.
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found.' });
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next(err);
  });
});

// ── Error Handler ──
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── Database init + seed, with retries (does NOT block/crash the server) ──
// The HTTP server starts immediately so health checks and the frontend stay up
// even if the database is temporarily unavailable (e.g. a free-tier DB that has
// paused after inactivity). The DB is connected in the background and retried.
async function initDatabaseWithRetry(attempt = 1) {
  try {
    await initializeDatabase();
    console.log('✅ Database connected and initialized');

    // Seed reference data. The seed is fully idempotent (each gate/admin/user is
    // checked before insert), so running it every boot safely fills in anything
    // missing and self-heals a partially-seeded database.
    if (process.env.SEED_ON_START !== 'false') {
      try {
        await seed();
      } catch (seedErr) {
        console.error('⚠️  Auto-seed error:', seedErr.message);
      }
    }
  } catch (err) {
    const delay = Math.min(30000, attempt * 5000);
    console.error(`❌ Database init failed (attempt ${attempt}): ${err.message}. Retrying in ${delay / 1000}s.`);
    setTimeout(() => initDatabaseWithRetry(attempt + 1), delay);
  }
}

// ── Start Server ──
function start() {
  app.listen(PORT, () => {
    console.log(`\n🚀 AVTPP Server running on http://localhost:${PORT}`);
    console.log(`📋 API Health: http://localhost:${PORT}/api/health`);
    console.log(`🔑 Environment: ${process.env.FLUTTERWAVE_LIVE === 'true' ? 'LIVE' : 'SIMULATION'} mode\n`);
  });
  initDatabaseWithRetry();
}

start();
