const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

let pool;

// Resolve DB connection settings from (in order of precedence):
//   1. A connection URL (DATABASE_URL / MYSQL_URL) — common on managed hosts
//   2. Discrete DB_* vars
//   3. Managed-host MYSQL* vars (e.g. Railway)
//   4. Local defaults
function getDbConfig() {
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (url) {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: u.port ? parseInt(u.port) : 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ''),
    };
  }
  return {
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
    port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT || '3306'),
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD ?? process.env.MYSQLPASSWORD ?? '',
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'avtpp_db',
  };
}

function sslOption() {
  // Many managed MySQL providers require TLS. Enable with DB_SSL=true.
  return process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
}

async function getPool() {
  if (!pool) {
    const cfg = getDbConfig();
    pool = mysql.createPool({
      ...cfg,
      ssl: sslOption(),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true,
    });
  }
  return pool;
}

async function initializeDatabase() {
  const cfg = getDbConfig();

  // Best-effort: create the database if it doesn't exist (local dev / self-hosted).
  // On managed databases the DB already exists and the user may lack CREATE
  // DATABASE privilege — that's fine, we just skip this step.
  try {
    const root = await mysql.createConnection({
      host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password,
      ssl: sslOption(), multipleStatements: true,
    });
    await root.query(`CREATE DATABASE IF NOT EXISTS \`${cfg.database}\``);
    await root.end();
  } catch (err) {
    console.log('ℹ️  Skipping database creation (using existing database):', err.code || err.message);
  }

  // Create tables inside the target database.
  const conn = await mysql.createConnection({
    ...cfg, ssl: sslOption(), multipleStatements: true,
  });
  try {
    const schemaPath = path.join(__dirname, '..', 'models', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await conn.query(schema);
    console.log('✅ Database schema initialized successfully');
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    throw err;
  } finally {
    await conn.end();
  }
}

async function query(sql, params) {
  const p = await getPool();
  const [rows] = await p.execute(sql, params);
  return rows;
}

async function queryRaw(sql, params) {
  const p = await getPool();
  const [rows] = await p.query(sql, params);
  return rows;
}

module.exports = { getPool, initializeDatabase, query, queryRaw, getDbConfig };
