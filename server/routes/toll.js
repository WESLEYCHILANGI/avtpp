const express = require('express');
const router = express.Router();
const { query, getPool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { authenticateGate } = require('../middleware/gateAuth');

// ── Core toll deduction logic (shared by both entry points) ──
// Given an open connection plus a resolved vehicle and gate row, looks up the
// tariff, locks the owner's wallet, deducts (or records a failed attempt),
// writes the transaction and notifications, and commits.
// Returns { ok, code, body } — the caller maps this to an HTTP response.
async function executeToll(conn, vehicle, gate) {
  // Look up tariff for this vehicle class at this gate
  const [tariffs] = await conn.execute(
    'SELECT * FROM TariffRates WHERE GateID = ? AND VehicleClass = ?',
    [gate.GateID, vehicle.VehicleClass]
  );
  if (tariffs.length === 0) {
    return { ok: false, code: 404, body: { error: 'No tariff configured for this vehicle class at this gate.' } };
  }
  const tariffAmount = parseFloat(tariffs[0].Amount);

  // Atomic balance operations
  await conn.beginTransaction();
  try {
    // Lock the owner's wallet row
    const [accounts] = await conn.execute(
      'SELECT * FROM Accounts WHERE UserID = ? FOR UPDATE',
      [vehicle.UserID]
    );
    if (accounts.length === 0) {
      await conn.rollback();
      return { ok: false, code: 404, body: { error: 'Wallet not found for the vehicle owner.' } };
    }
    const account = accounts[0];
    const currentBalance = parseFloat(account.Balance);

    if (currentBalance >= tariffAmount) {
      // Sufficient balance — deduct
      const newBalance = currentBalance - tariffAmount;

      await conn.execute(
        'UPDATE Accounts SET Balance = ? WHERE AccountID = ?',
        [newBalance, account.AccountID]
      );

      const [txResult] = await conn.execute(
        'INSERT INTO Transactions (AccountID, VehicleID, GateID, Amount, Status, Currency, BalanceAfter) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [account.AccountID, vehicle.VehicleID, gate.GateID, tariffAmount, 'Completed', 'ZMW', newBalance]
      );

      await conn.execute(
        'INSERT INTO Notifications (UserID, Title, Message, Type) VALUES (?, ?, ?, ?)',
        [vehicle.UserID, 'Toll Payment Processed',
         `K${tariffAmount.toFixed(2)} deducted at ${gate.GateName} for vehicle ${vehicle.LicencePlate}. Balance: K${newBalance.toFixed(2)}.`,
         'toll_deduction']
      );

      // Low-balance warning
      if (newBalance < parseFloat(account.LowBalanceThreshold)) {
        await conn.execute(
          'INSERT INTO Notifications (UserID, Title, Message, Type) VALUES (?, ?, ?, ?)',
          [vehicle.UserID, 'Low Balance Warning',
           `Your wallet balance is K${newBalance.toFixed(2)}, below your threshold of K${parseFloat(account.LowBalanceThreshold).toFixed(2)}. Please top up.`,
           'low_balance']
        );
      }

      await conn.commit();

      return {
        ok: true,
        code: 200,
        body: {
          message: 'Toll payment processed successfully.',
          transaction: {
            transactionId: txResult.insertId,
            gate: gate.GateName,
            vehicle: vehicle.LicencePlate,
            amount: tariffAmount,
            currency: 'ZMW',
            newBalance,
            status: 'Completed',
            barrierSignal: 'RAISE'
          }
        }
      };
    } else {
      // Insufficient balance — record failed transaction
      await conn.execute(
        'INSERT INTO Transactions (AccountID, VehicleID, GateID, Amount, Status, Currency, BalanceAfter) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [account.AccountID, vehicle.VehicleID, gate.GateID, tariffAmount, 'Failed', 'ZMW', currentBalance]
      );

      await conn.execute(
        'INSERT INTO Notifications (UserID, Title, Message, Type) VALUES (?, ?, ?, ?)',
        [vehicle.UserID, 'Toll Payment Failed — Insufficient Balance',
         `Could not process K${tariffAmount.toFixed(2)} toll at ${gate.GateName}. Current balance: K${currentBalance.toFixed(2)}. Please top up.`,
         'low_balance']
      );

      await conn.commit();

      return {
        ok: false,
        code: 402,
        body: {
          error: 'Insufficient wallet balance.',
          required: tariffAmount,
          currentBalance,
          shortfall: tariffAmount - currentBalance,
          barrierSignal: 'CLOSED'
        }
      };
    }
  } catch (txErr) {
    await conn.rollback();
    throw txErr;
  }
}

// ── POST /api/toll/process ──
// FR05: User-initiated toll simulation (self-service). Authenticated road user
// passes one of their own registered vehicles and a gate.
router.post('/process', authenticateToken, async (req, res) => {
  const conn = await (await getPool()).getConnection();
  try {
    const { vehicleId, gateId } = req.body;
    if (!vehicleId || !gateId) {
      return res.status(400).json({ error: 'Vehicle ID and Gate ID are required.' });
    }

    const startTime = Date.now();

    // Verify vehicle belongs to the authenticated user
    const [vehicles] = await conn.execute(
      'SELECT * FROM Vehicles WHERE VehicleID = ? AND UserID = ?',
      [vehicleId, req.user.userId]
    );
    if (vehicles.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found or not registered to your account.' });
    }

    // Verify gate exists and is active
    const [gates] = await conn.execute(
      'SELECT * FROM TollGates WHERE GateID = ? AND IsActive = TRUE',
      [gateId]
    );
    if (gates.length === 0) {
      return res.status(404).json({ error: 'Toll gate not found or inactive.' });
    }

    const result = await executeToll(conn, vehicles[0], gates[0]);
    const processingTimeMs = Date.now() - startTime;

    return res.status(result.code).json({ ...result.body, processingTimeMs });
  } catch (err) {
    console.error('Toll processing error:', err);
    res.status(500).json({ error: 'Toll processing failed.' });
  } finally {
    conn.release();
  }
});

// ── POST /api/toll/gate-trigger ──
// FR05 / §4.4.1 / §4.4.2: Automated gate flow. The (simulated) roadside device
// transmits a licence plate and gate ID; the system resolves the plate to a
// registered vehicle and its owner's wallet, then deducts automatically.
// Authenticated by a gate device key, NOT a user session.
router.post('/gate-trigger', authenticateGate, async (req, res) => {
  const conn = await (await getPool()).getConnection();
  try {
    const { licencePlate, gateId } = req.body;
    if (!licencePlate || !gateId) {
      return res.status(400).json({ error: 'Licence plate and Gate ID are required.' });
    }

    const startTime = Date.now();
    const plate = String(licencePlate).toUpperCase().trim();

    // Resolve the plate to a registered vehicle (the gate has no user context)
    const [vehicles] = await conn.execute(
      'SELECT * FROM Vehicles WHERE LicencePlate = ?',
      [plate]
    );
    if (vehicles.length === 0) {
      // No AVTPP account is linked to this plate — barrier stays closed.
      return res.status(404).json({
        error: 'Unregistered vehicle. No AVTPP account is linked to this licence plate.',
        licencePlate: plate,
        barrierSignal: 'CLOSED'
      });
    }

    // Verify gate exists and is active
    const [gates] = await conn.execute(
      'SELECT * FROM TollGates WHERE GateID = ? AND IsActive = TRUE',
      [gateId]
    );
    if (gates.length === 0) {
      return res.status(404).json({ error: 'Toll gate not found or inactive.' });
    }

    const result = await executeToll(conn, vehicles[0], gates[0]);
    const processingTimeMs = Date.now() - startTime;

    return res.status(result.code).json({ ...result.body, processingTimeMs });
  } catch (err) {
    console.error('Gate trigger error:', err);
    res.status(500).json({ error: 'Toll processing failed.' });
  } finally {
    conn.release();
  }
});

// ── GET /api/toll/gates ──
// List all active toll gates
router.get('/gates', async (req, res) => {
  try {
    const gates = await query(
      'SELECT * FROM TollGates WHERE IsActive = TRUE ORDER BY Province, GateName'
    );
    res.json({ gates });
  } catch (err) {
    console.error('Get gates error:', err);
    res.status(500).json({ error: 'Failed to retrieve toll gates.' });
  }
});

// ── GET /api/toll/tariffs/:gateId ──
// Get tariff rates for a specific gate
router.get('/tariffs/:gateId', async (req, res) => {
  try {
    const tariffs = await query(
      'SELECT tr.*, tg.GateName FROM TariffRates tr JOIN TollGates tg ON tr.GateID = tg.GateID WHERE tr.GateID = ?',
      [req.params.gateId]
    );
    res.json({ tariffs });
  } catch (err) {
    console.error('Get tariffs error:', err);
    res.status(500).json({ error: 'Failed to retrieve tariffs.' });
  }
});

module.exports = router;
