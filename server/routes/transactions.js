const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// ── GET /api/transactions ──
// FR06 & FR07: Full payment history with filtering, pagination
router.get('/', async (req, res) => {
  try {
    const { dateFrom, dateTo, vehicleId, gateId, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get user's account
    const accounts = await query('SELECT AccountID FROM Accounts WHERE UserID = ?', [req.user.userId]);
    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }
    const accountId = accounts[0].AccountID;

    // Build dynamic query
    let sql = `
      SELECT t.*, v.LicencePlate, v.Make, v.Model, v.VehicleClass,
             g.GateName, g.Location, g.Province
      FROM Transactions t
      JOIN Vehicles v ON t.VehicleID = v.VehicleID
      JOIN TollGates g ON t.GateID = g.GateID
      WHERE t.AccountID = ?
    `;
    const params = [accountId];

    if (dateFrom) {
      sql += ' AND t.TransactionDateTime >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ' AND t.TransactionDateTime <= ?';
      params.push(dateTo + ' 23:59:59');
    }
    if (vehicleId) {
      sql += ' AND t.VehicleID = ?';
      params.push(parseInt(vehicleId));
    }
    if (gateId) {
      sql += ' AND t.GateID = ?';
      params.push(parseInt(gateId));
    }
    if (status) {
      sql += ' AND t.Status = ?';
      params.push(status);
    }

    // Count total
    const countSql = sql.replace(/SELECT t\.\*.*?FROM/s, 'SELECT COUNT(*) as total FROM');
    const countResult = await query(countSql, params);
    const total = countResult[0].total;

    // Add sorting and pagination
    sql += ' ORDER BY t.TransactionDateTime DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const transactions = await query(sql, params);

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Transactions error:', err);
    res.status(500).json({ error: 'Failed to retrieve transactions.' });
  }
});

// ── GET /api/transactions/summary ──
// Summary stats for dashboard
router.get('/summary', async (req, res) => {
  try {
    const accounts = await query('SELECT AccountID FROM Accounts WHERE UserID = ?', [req.user.userId]);
    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }
    const accountId = accounts[0].AccountID;

    const totalSpent = await query(
      "SELECT COALESCE(SUM(Amount), 0) as total FROM Transactions WHERE AccountID = ? AND Status = 'Completed'",
      [accountId]
    );
    const totalTransactions = await query(
      'SELECT COUNT(*) as count FROM Transactions WHERE AccountID = ?',
      [accountId]
    );
    const recentTransactions = await query(
      `SELECT t.*, v.LicencePlate, g.GateName
       FROM Transactions t
       JOIN Vehicles v ON t.VehicleID = v.VehicleID
       JOIN TollGates g ON t.GateID = g.GateID
       WHERE t.AccountID = ?
       ORDER BY t.TransactionDateTime DESC LIMIT 5`,
      [accountId]
    );

    res.json({
      totalSpent: parseFloat(totalSpent[0].total),
      totalTransactions: totalTransactions[0].count,
      recentTransactions
    });
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: 'Failed to retrieve summary.' });
  }
});

// ── GET /api/transactions/export ──
// Export transactions as CSV
router.get('/export', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const accounts = await query('SELECT AccountID FROM Accounts WHERE UserID = ?', [req.user.userId]);
    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    let sql = `
      SELECT t.TransactionID, t.TransactionDateTime as Date, g.GateName as TollGate,
             v.LicencePlate as Vehicle, v.VehicleClass, t.Amount, t.Currency, t.Status
      FROM Transactions t
      JOIN Vehicles v ON t.VehicleID = v.VehicleID
      JOIN TollGates g ON t.GateID = g.GateID
      WHERE t.AccountID = ?
    `;
    const params = [accounts[0].AccountID];

    if (dateFrom) { sql += ' AND t.TransactionDateTime >= ?'; params.push(dateFrom); }
    if (dateTo) { sql += ' AND t.TransactionDateTime <= ?'; params.push(dateTo + ' 23:59:59'); }
    sql += ' ORDER BY t.TransactionDateTime DESC';

    const rows = await query(sql, params);

    // Build CSV
    const headers = 'Transaction ID,Date,Toll Gate,Vehicle,Vehicle Class,Amount (ZMW),Status\n';
    const csv = headers + rows.map(r =>
      `${r.TransactionID},"${r.Date}","${r.TollGate}","${r.Vehicle}","${r.VehicleClass}",${r.Amount},${r.Status}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=avtpp_transactions.csv');
    res.send(csv);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Failed to export transactions.' });
  }
});

module.exports = router;
