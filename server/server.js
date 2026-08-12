require('dotenv').config();

const app = require('./app');
const { initializeDatabase } = require('./config/database');
const { seed } = require('./seeds/seed');

const PORT = process.env.PORT || 5000;

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

app.listen(PORT, () => {
  console.log(`\n🚀 AVTPP Server running on http://localhost:${PORT}`);
  console.log(`📋 API Health: http://localhost:${PORT}/api/health`);
  console.log(`🔑 Environment: ${process.env.FLUTTERWAVE_LIVE === 'true' ? 'LIVE' : 'SIMULATION'} mode\n`);
});

initDatabaseWithRetry();
