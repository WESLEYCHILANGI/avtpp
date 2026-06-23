const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { authenticateAdmin } = require('../middleware/adminAuth');

router.use(authenticateAdmin);

// ── GET /api/admin/dashboard ──
// FR09: System-wide summary stats
router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await query('SELECT COUNT(*) as count FROM Users');
    const activeUsers = await query('SELECT COUNT(*) as count FROM Users WHERE IsActive = TRUE');
    const totalVehicles = await query('SELECT COUNT(*) as count FROM Vehicles');
    const totalGates = await query('SELECT COUNT(*) as count FROM TollGates WHERE IsActive = TRUE');

    const todayRevenue = await query(
      "SELECT COALESCE(SUM(Amount), 0) as total FROM Transactions WHERE Status = 'Completed' AND DATE(TransactionDateTime) = CURDATE()"
    );
    const todayTransactions = await query(
      "SELECT COUNT(*) as count FROM Transactions WHERE DATE(TransactionDateTime) = CURDATE()"
    );
    const totalRevenue = await query(
      "SELECT COALESCE(SUM(Amount), 0) as total FROM Transactions WHERE Status = 'Completed'"
    );
    const totalTransactions = await query('SELECT COUNT(*) as count FROM Transactions');

    const monthlyRevenue = await query(
      "SELECT COALESCE(SUM(Amount), 0) as total FROM Transactions WHERE Status = 'Completed' AND MONTH(TransactionDateTime) = MONTH(CURDATE()) AND YEAR(TransactionDateTime) = YEAR(CURDATE())"
    );

    const recentTransactions = await query(
      `SELECT t.*, v.LicencePlate, g.GateName, u.FirstName, u.LastName
       FROM Transactions t
       JOIN Accounts a ON t.AccountID = a.AccountID
       JOIN Users u ON a.UserID = u.UserID
       JOIN Vehicles v ON t.VehicleID = v.VehicleID
       JOIN TollGates g ON t.GateID = g.GateID
       ORDER BY t.TransactionDateTime DESC LIMIT 10`
    );

    res.json({
      users: { total: totalUsers[0].count, active: activeUsers[0].count },
      vehicles: { total: totalVehicles[0].count },
      gates: { active: totalGates[0].count },
      revenue: {
        today: parseFloat(todayRevenue[0].total),
        monthly: parseFloat(monthlyRevenue[0].total),
        total: parseFloat(totalRevenue[0].total),
        currency: 'ZMW'
      },
      transactions: {
        today: todayTransactions[0].count,
        total: totalTransactions[0].count
      },
      recentTransactions
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard data.' });
  }
});

// ── GATE MANAGEMENT (FR09, UC08) ──
router.get('/gates', async (req, res) => {
  try {
    const gates = await query('SELECT * FROM TollGates ORDER BY Province, GateName');
    res.json({ gates });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve gates.' });
  }
});

router.post('/gates', async (req, res) => {
  try {
    const { gateName, location, route, province } = req.body;
    if (!gateName || !location || !route || !province) {
      return res.status(400).json({ error: 'All gate fields are required.' });
    }
    const result = await query(
      'INSERT INTO TollGates (GateName, Location, Route, Province) VALUES (?, ?, ?, ?)',
      [gateName, location, route, province]
    );
    res.status(201).json({ message: 'Toll gate added.', gateId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add gate.' });
  }
});

router.put('/gates/:id', async (req, res) => {
  try {
    const { gateName, location, route, province, isActive } = req.body;
    await query(
      'UPDATE TollGates SET GateName = COALESCE(?, GateName), Location = COALESCE(?, Location), Route = COALESCE(?, Route), Province = COALESCE(?, Province), IsActive = COALESCE(?, IsActive) WHERE GateID = ?',
      [gateName, location, route, province, isActive, req.params.id]
    );
    res.json({ message: 'Toll gate updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update gate.' });
  }
});

// ── USER MANAGEMENT (UC10) ──
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = 'SELECT UserID, FirstName, LastName, Email, PhoneNumber, DateRegistered, IsActive FROM Users';
    const params = [];

    if (search) {
      sql += ' WHERE FirstName LIKE ? OR LastName LIKE ? OR Email LIKE ?';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const countResult = await query(sql.replace('SELECT UserID, FirstName, LastName, Email, PhoneNumber, DateRegistered, IsActive', 'SELECT COUNT(*) as total'), params);

    sql += ' ORDER BY DateRegistered DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const users = await query(sql, params);
    res.json({ users, total: countResult[0].total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { isActive } = req.body;
    await query('UPDATE Users SET IsActive = ? WHERE UserID = ?', [isActive, req.params.id]);
    res.json({ message: `User ${isActive ? 'activated' : 'suspended'}.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// ── Admin Password Reset ──
// Allows admin to reset a user's password when they forget it
router.put('/users/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Verify user exists
    const users = await query('SELECT UserID, Email FROM Users WHERE UserID = ?', [req.params.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Hash the new password and update
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(newPassword, salt);
    await query(
      'UPDATE Users SET PasswordHash = ?, FailedLoginAttempts = 0, LockedUntil = NULL WHERE UserID = ?',
      [hash, req.params.id]
    );

    res.json({ message: `Password reset for ${users[0].Email}.` });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// ── TARIFF MANAGEMENT (FR10) ──
router.get('/tariffs', async (req, res) => {
  try {
    const tariffs = await query(
      'SELECT tr.*, tg.GateName FROM TariffRates tr JOIN TollGates tg ON tr.GateID = tg.GateID ORDER BY tg.GateName, tr.VehicleClass'
    );
    res.json({ tariffs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve tariffs.' });
  }
});

router.put('/tariffs/:id', async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required.' });
    }
    await query('UPDATE TariffRates SET Amount = ? WHERE TariffID = ?', [amount, req.params.id]);
    res.json({ message: 'Tariff updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tariff.' });
  }
});

// ── REPORTS (UC09) ──
router.get('/reports', async (req, res) => {
  try {
    const { dateFrom, dateTo, gateId } = req.query;

    let revenueByGateSql = `
      SELECT g.GateName, g.Province,
             COUNT(*) as transactionCount,
             SUM(CASE WHEN t.Status = 'Completed' THEN t.Amount ELSE 0 END) as revenue,
             SUM(CASE WHEN t.Status = 'Completed' THEN 1 ELSE 0 END) as successCount,
             SUM(CASE WHEN t.Status = 'Failed' THEN 1 ELSE 0 END) as failedCount
      FROM Transactions t
      JOIN TollGates g ON t.GateID = g.GateID
      WHERE 1=1
    `;
    const params = [];

    if (dateFrom) { revenueByGateSql += ' AND t.TransactionDateTime >= ?'; params.push(dateFrom); }
    if (dateTo) { revenueByGateSql += ' AND t.TransactionDateTime <= ?'; params.push(dateTo + ' 23:59:59'); }
    if (gateId) { revenueByGateSql += ' AND t.GateID = ?'; params.push(parseInt(gateId)); }

    revenueByGateSql += ' GROUP BY g.GateID, g.GateName, g.Province ORDER BY revenue DESC';

    const revenueByGate = await query(revenueByGateSql, params);

    let revenueByClassSql = `
      SELECT v.VehicleClass, COUNT(*) as count,
             SUM(CASE WHEN t.Status = 'Completed' THEN t.Amount ELSE 0 END) as revenue
      FROM Transactions t
      JOIN Vehicles v ON t.VehicleID = v.VehicleID
      WHERE 1=1
    `;
    const params2 = [];
    if (dateFrom) { revenueByClassSql += ' AND t.TransactionDateTime >= ?'; params2.push(dateFrom); }
    if (dateTo) { revenueByClassSql += ' AND t.TransactionDateTime <= ?'; params2.push(dateTo + ' 23:59:59'); }

    revenueByClassSql += ' GROUP BY v.VehicleClass ORDER BY revenue DESC';

    const revenueByClass = await query(revenueByClassSql, params2);

    const totalRevenue = revenueByGate.reduce((sum, g) => sum + parseFloat(g.revenue), 0);
    const totalTransactions = revenueByGate.reduce((sum, g) => sum + g.transactionCount, 0);

    res.json({
      summary: { totalRevenue, totalTransactions, currency: 'ZMW' },
      revenueByGate,
      revenueByClass
    });
  } catch (err) {
    console.error('Reports error:', err);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

module.exports = router;
