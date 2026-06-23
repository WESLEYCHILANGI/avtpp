const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// ── GET /api/wallet/balance ──
// FR04: Display current wallet balance
router.get('/balance', async (req, res) => {
  try {
    const accounts = await query(
      'SELECT AccountID, Balance, LowBalanceThreshold, LastUpdated FROM Accounts WHERE UserID = ?',
      [req.user.userId]
    );
    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Wallet not found.' });
    }
    const account = accounts[0];
    res.json({
      accountId: account.AccountID,
      balance: parseFloat(account.Balance),
      lowBalanceThreshold: parseFloat(account.LowBalanceThreshold),
      isLowBalance: parseFloat(account.Balance) < parseFloat(account.LowBalanceThreshold),
      lastUpdated: account.LastUpdated,
      currency: 'ZMW'
    });
  } catch (err) {
    console.error('Balance error:', err);
    res.status(500).json({ error: 'Failed to retrieve balance.' });
  }
});

// ── POST /api/wallet/topup ──
// FR04: Initiate wallet top-up via mobile money (Flutterwave mock mode)
router.post('/topup', async (req, res) => {
  try {
    const { amount, provider, phoneNumber } = req.body;

    if (!amount || !provider || !phoneNumber) {
      return res.status(400).json({ error: 'Amount, provider, and phone number are required.' });
    }

    const topUpAmount = parseFloat(amount);
    if (isNaN(topUpAmount) || topUpAmount < 10) {
      return res.status(400).json({ error: 'Minimum top-up amount is K10.00 ZMW.' });
    }
    if (topUpAmount > 50000) {
      return res.status(400).json({ error: 'Maximum top-up amount is K50,000.00 ZMW.' });
    }

    const validProviders = ['MTN_Money', 'Airtel_Money', 'Zamtel_Kwacha'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: 'Invalid mobile money provider.' });
    }

    // Get user's account
    const accounts = await query('SELECT * FROM Accounts WHERE UserID = ?', [req.user.userId]);
    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Wallet not found.' });
    }

    const transactionRef = `AVTPP-${uuidv4().slice(0, 8).toUpperCase()}`;

    // ── MOCK FLUTTERWAVE SIMULATION ──
    // In production, this would initiate a real Flutterwave mobile money charge
    const isLive = process.env.FLUTTERWAVE_LIVE === 'true';

    if (!isLive) {
      // Simulate a 1-2 second processing delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

      // 95% success rate simulation
      const isSuccess = Math.random() < 0.95;

      if (isSuccess) {
        // Record top-up
        await query(
          'INSERT INTO TopUps (AccountID, Amount, Provider, PhoneNumber, TransactionRef, Status, CompletedAt) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          [accounts[0].AccountID, topUpAmount, provider, phoneNumber, transactionRef, 'Completed']
        );

        // Update balance
        await query(
          'UPDATE Accounts SET Balance = Balance + ? WHERE AccountID = ?',
          [topUpAmount, accounts[0].AccountID]
        );

        // Get new balance
        const updated = await query('SELECT Balance FROM Accounts WHERE AccountID = ?', [accounts[0].AccountID]);
        const newBalance = parseFloat(updated[0].Balance);

        // Notification
        await query(
          'INSERT INTO Notifications (UserID, Title, Message, Type) VALUES (?, ?, ?, ?)',
          [req.user.userId, 'Top-Up Successful',
           `K${topUpAmount.toFixed(2)} has been added to your wallet via ${provider.replace('_', ' ')}. New balance: K${newBalance.toFixed(2)}.`,
           'topup_success']
        );

        return res.json({
          message: 'Top-up successful!',
          transactionRef,
          amount: topUpAmount,
          provider,
          newBalance,
          currency: 'ZMW',
          status: 'Completed',
          mode: 'simulation'
        });
      } else {
        // Simulated failure
        await query(
          'INSERT INTO TopUps (AccountID, Amount, Provider, PhoneNumber, TransactionRef, Status) VALUES (?, ?, ?, ?, ?, ?)',
          [accounts[0].AccountID, topUpAmount, provider, phoneNumber, transactionRef, 'Failed']
        );

        await query(
          'INSERT INTO Notifications (UserID, Title, Message, Type) VALUES (?, ?, ?, ?)',
          [req.user.userId, 'Top-Up Failed',
           `Your K${topUpAmount.toFixed(2)} top-up via ${provider.replace('_', ' ')} could not be processed. Please try again.`,
           'topup_failed']
        );

        return res.status(402).json({
          error: 'Payment could not be processed. Please try again.',
          transactionRef,
          status: 'Failed',
          mode: 'simulation'
        });
      }
    }

    // ── LIVE FLUTTERWAVE (placeholder) ──
    res.status(501).json({ error: 'Live payment not configured. Set FLUTTERWAVE_LIVE=true with valid keys.' });
  } catch (err) {
    console.error('Top-up error:', err);
    res.status(500).json({ error: 'Top-up failed. Please try again.' });
  }
});

// ── PUT /api/wallet/threshold ──
// Configure low-balance alert threshold
router.put('/threshold', async (req, res) => {
  try {
    const { threshold } = req.body;
    if (threshold === undefined || threshold < 0) {
      return res.status(400).json({ error: 'Valid threshold amount required.' });
    }

    await query(
      'UPDATE Accounts SET LowBalanceThreshold = ? WHERE UserID = ?',
      [threshold, req.user.userId]
    );

    res.json({ message: `Low balance threshold updated to K${parseFloat(threshold).toFixed(2)}.` });
  } catch (err) {
    console.error('Threshold error:', err);
    res.status(500).json({ error: 'Failed to update threshold.' });
  }
});

// ── GET /api/wallet/topups ──
// List top-up history
router.get('/topups', async (req, res) => {
  try {
    const accounts = await query('SELECT AccountID FROM Accounts WHERE UserID = ?', [req.user.userId]);
    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Wallet not found.' });
    }

    const topups = await query(
      'SELECT * FROM TopUps WHERE AccountID = ? ORDER BY CreatedAt DESC LIMIT 50',
      [accounts[0].AccountID]
    );
    res.json({ topups });
  } catch (err) {
    console.error('Topups history error:', err);
    res.status(500).json({ error: 'Failed to retrieve top-up history.' });
  }
});

module.exports = router;
