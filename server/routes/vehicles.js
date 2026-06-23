const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// ── GET /api/vehicles ──
// List all vehicles for the authenticated user
router.get('/', async (req, res) => {
  try {
    const vehicles = await query(
      'SELECT * FROM Vehicles WHERE UserID = ? ORDER BY DateAdded DESC',
      [req.user.userId]
    );
    res.json({ vehicles });
  } catch (err) {
    console.error('Get vehicles error:', err);
    res.status(500).json({ error: 'Failed to retrieve vehicles.' });
  }
});

// ── POST /api/vehicles ──
// FR03: Register a new vehicle
router.post('/', async (req, res) => {
  try {
    const { licencePlate, make, model, year, vehicleClass } = req.body;

    if (!licencePlate || !make || !model || !year || !vehicleClass) {
      return res.status(400).json({ error: 'All vehicle fields are required.' });
    }

    // Check for duplicate plate
    const existing = await query(
      'SELECT VehicleID FROM Vehicles WHERE LicencePlate = ?', [licencePlate]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'A vehicle with this licence plate is already registered.' });
    }

    const validClasses = ['Class1_Motorcycle', 'Class2_LightVehicle', 'Class3_Minibus', 'Class4_HeavyBus', 'Class5_LightTruck', 'Class6_HeavyTruck'];
    if (!validClasses.includes(vehicleClass)) {
      return res.status(400).json({ error: 'Invalid vehicle class.' });
    }

    const result = await query(
      'INSERT INTO Vehicles (UserID, LicencePlate, Make, Model, Year, VehicleClass) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.userId, licencePlate.toUpperCase(), make, model, year, vehicleClass]
    );

    res.status(201).json({
      message: 'Vehicle registered successfully.',
      vehicle: {
        vehicleId: result.insertId,
        licencePlate: licencePlate.toUpperCase(),
        make, model, year, vehicleClass
      }
    });
  } catch (err) {
    console.error('Register vehicle error:', err);
    res.status(500).json({ error: 'Failed to register vehicle.' });
  }
});

// ── PUT /api/vehicles/:id ──
// Update vehicle details
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { make, model, year, vehicleClass } = req.body;

    // Validate vehicleClass if provided
    if (vehicleClass) {
      const validClasses = ['Class1_Motorcycle', 'Class2_LightVehicle', 'Class3_Minibus', 'Class4_HeavyBus', 'Class5_LightTruck', 'Class6_HeavyTruck'];
      if (!validClasses.includes(vehicleClass)) {
        return res.status(400).json({ error: 'Invalid vehicle class.' });
      }
    }

    // Verify ownership
    const vehicles = await query(
      'SELECT * FROM Vehicles WHERE VehicleID = ? AND UserID = ?',
      [id, req.user.userId]
    );
    if (vehicles.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    await query(
      'UPDATE Vehicles SET Make = COALESCE(?, Make), Model = COALESCE(?, Model), Year = COALESCE(?, Year), VehicleClass = COALESCE(?, VehicleClass) WHERE VehicleID = ?',
      [make, model, year, vehicleClass, id]
    );

    res.json({ message: 'Vehicle updated successfully.' });
  } catch (err) {
    console.error('Update vehicle error:', err);
    res.status(500).json({ error: 'Failed to update vehicle.' });
  }
});

// ── DELETE /api/vehicles/:id ──
// Remove a vehicle
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const vehicles = await query(
      'SELECT * FROM Vehicles WHERE VehicleID = ? AND UserID = ?',
      [id, req.user.userId]
    );
    if (vehicles.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    await query('DELETE FROM Vehicles WHERE VehicleID = ?', [id]);
    res.json({ message: 'Vehicle removed successfully.' });
  } catch (err) {
    console.error('Delete vehicle error:', err);
    res.status(500).json({ error: 'Failed to remove vehicle.' });
  }
});

module.exports = router;
