/**
 * AVTPP Supervisor — a lightweight watchdog "agent" that keeps the platform
 * running and self-heals common runtime failures.
 *
 * Responsibilities:
 *   1. Run the backend (server.js) and RESTART it automatically if it crashes
 *      or becomes unhealthy (with crash-loop backoff).
 *   2. Run the cloudflared tunnel, capture its public URL, and RESTART it (and
 *      re-capture the new URL) if it drops.
 *   3. Health-check the API every 15s; after 3 consecutive failures it restarts
 *      the backend (mitigation for hangs / DB stalls).
 *   4. Scan the backend log for error lines and record them to an incident log
 *      for review. (Operational failures are auto-mitigated; application/code
 *      errors are logged, not auto-edited — that needs human review.)
 *
 * Usage:  node supervisor.js        (or: npm run supervise)
 * Stop:   Ctrl+C / kill the process.
 * Env:    PORT (default 5000), ENABLE_TUNNEL=false to skip the tunnel,
 *         CLOUDFLARED=<path to cloudflared binary>.
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = __dirname;
const SERVER_DIR = path.join(ROOT, 'server');
const LOG_DIR = path.join(ROOT, 'logs');
fs.mkdirSync(LOG_DIR, { recursive: true });

const SUP_LOG = path.join(LOG_DIR, 'supervisor.log');
const SERVER_LOG = path.join(LOG_DIR, 'server.log');
const URL_FILE = path.join(LOG_DIR, 'public-url.txt');
const STATUS_FILE = path.join(LOG_DIR, 'status.json');

const PORT = process.env.PORT || 5000;
const HEALTH_URL = `http://localhost:${PORT}/api/health`;
const ENABLE_TUNNEL = process.env.ENABLE_TUNNEL !== 'false';
const CLOUDFLARED = process.env.CLOUDFLARED ||
  path.join(os.homedir(), os.platform() === 'win32' ? 'cloudflared.exe' : 'cloudflared');

const state = {
  startedAt: new Date().toISOString(),
  backendRestarts: 0,
  tunnelRestarts: 0,
  healthFailures: 0,
  lastHealthOk: null,
  publicUrl: null,
};

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(SUP_LOG, line); } catch { /* ignore */ }
  process.stdout.write(line);
}

function writeStatus() {
  try { fs.writeFileSync(STATUS_FILE, JSON.stringify(state, null, 2)); } catch { /* ignore */ }
}

// ── Backend lifecycle ──
let backend = null;
let backendStartedAt = 0;

function startBackend() {
  backendStartedAt = Date.now();
  log('Starting backend (node server.js)...');
  const out = fs.openSync(SERVER_LOG, 'a');
  backend = spawn(process.execPath, ['server.js'], { cwd: SERVER_DIR, stdio: ['ignore', out, out] });
  backend.on('exit', (code, signal) => {
    const uptimeMs = Date.now() - backendStartedAt;
    backend = null;
    state.backendRestarts++;
    writeStatus();
    // Back off harder if it died almost immediately (crash loop / port in use)
    const delay = uptimeMs < 5000 ? 8000 : 1000;
    log(`Backend exited (code=${code} signal=${signal}, up ${Math.round(uptimeMs / 1000)}s). Restarting in ${delay / 1000}s.`);
    setTimeout(startBackend, delay);
  });
}

// ── Health checks + mitigation ──
function healthCheck() {
  const req = http.get(HEALTH_URL, { timeout: 5000 }, (res) => {
    res.resume();
    if (res.statusCode === 200) {
      if (state.healthFailures > 0) log(`Health recovered after ${state.healthFailures} failure(s).`);
      state.healthFailures = 0;
      state.lastHealthOk = new Date().toISOString();
      writeStatus();
    } else {
      onHealthFail(`status ${res.statusCode}`);
    }
  });
  req.on('error', (e) => onHealthFail(e.code || e.message));
  req.on('timeout', () => { req.destroy(); onHealthFail('timeout'); });
}

function onHealthFail(reason) {
  state.healthFailures++;
  writeStatus();
  log(`Health check failed (${reason}) [streak ${state.healthFailures}].`);
  if (state.healthFailures >= 3 && backend) {
    log('MITIGATION: backend unhealthy 3x — killing it to force a clean restart.');
    state.healthFailures = 0;
    try { backend.kill(); } catch { /* exit handler will restart */ }
  }
}

// ── Tunnel lifecycle ──
let tunnel = null;

function startTunnel() {
  if (!ENABLE_TUNNEL) return;
  if (!fs.existsSync(CLOUDFLARED)) {
    log(`cloudflared not found at ${CLOUDFLARED} — tunnel disabled (set CLOUDFLARED env to enable).`);
    return;
  }
  log('Starting cloudflared tunnel...');
  tunnel = spawn(CLOUDFLARED, ['tunnel', '--url', `http://localhost:${PORT}`, '--no-autoupdate'],
    { stdio: ['ignore', 'pipe', 'pipe'] });

  const onData = (buf) => {
    const m = buf.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (m && m[0] !== state.publicUrl) {
      state.publicUrl = m[0];
      writeStatus();
      try { fs.writeFileSync(URL_FILE, m[0] + '\n'); } catch { /* ignore */ }
      log(`PUBLIC URL: ${m[0]}`);
    }
  };
  tunnel.stdout.on('data', onData);
  tunnel.stderr.on('data', onData);
  tunnel.on('exit', (code) => {
    tunnel = null;
    state.publicUrl = null;
    state.tunnelRestarts++;
    writeStatus();
    log(`Tunnel exited (code=${code}). Restarting in 3s...`);
    setTimeout(startTunnel, 3000);
  });
}

// ── Scan backend log for error lines (catch application/runtime errors) ──
let logPos = 0;
const ERROR_RE = /(error|unhandled|exception|ECONNREFUSED|ETIMEDOUT|ER_[A-Z_]+|PROTOCOL_)/i;
const IGNORE_RE = /\[20\d\d-.*\] (GET|POST|PUT|DELETE) /; // skip the request log lines

function scanServerLog() {
  try {
    const stat = fs.statSync(SERVER_LOG);
    if (stat.size < logPos) logPos = 0; // truncated/rotated
    if (stat.size <= logPos) return;
    const fd = fs.openSync(SERVER_LOG, 'r');
    const buf = Buffer.alloc(stat.size - logPos);
    fs.readSync(fd, buf, 0, buf.length, logPos);
    fs.closeSync(fd);
    logPos = stat.size;
    buf.toString().split('\n').forEach((line) => {
      if (line.trim() && ERROR_RE.test(line) && !IGNORE_RE.test(line)) {
        log(`APP-ERROR: ${line.trim().slice(0, 240)}`);
      }
    });
  } catch { /* ignore */ }
}

// ── Shutdown ──
function shutdown() {
  log('Supervisor stopping — terminating child processes.');
  try { backend && backend.kill(); } catch { /* ignore */ }
  try { tunnel && tunnel.kill(); } catch { /* ignore */ }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ── Boot ──
log('=== AVTPP supervisor started ===');
writeStatus();
startBackend();
startTunnel();
setInterval(healthCheck, 15000);
setInterval(scanServerLog, 10000);
setTimeout(healthCheck, 4000); // first check shortly after boot
