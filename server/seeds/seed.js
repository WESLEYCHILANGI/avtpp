const bcrypt = require('bcryptjs');
const { initializeDatabase, query, queryRaw } = require('../config/database');
require('dotenv').config();

async function seed() {
  console.log('🌱 Starting database seed...\n');
  
  await initializeDatabase();

  // ── SEED TOLL GATES (Real NRFA toll gates across Zambia's 10 provinces) ──
  const tollGates = [
    // Lusaka Province
    { name: 'Shimabala Toll Plaza', location: 'Shimabala, Kafue Road', route: 'T3 - Kafue Road', province: 'Lusaka' },
    { name: 'Kenneth Kaunda Toll Plaza', location: 'Great East Road, Lusaka', route: 'T4 - Great East Road', province: 'Lusaka' },
    // Copperbelt Province
    { name: 'Katuba Toll Plaza', location: 'Katuba, Kabwe Road', route: 'T2 - Great North Road', province: 'Central' },
    { name: 'Kapiri Mposhi Toll Plaza', location: 'Kapiri Mposhi', route: 'T2 - Great North Road', province: 'Central' },
    // Southern Province
    { name: 'Batoka Toll Plaza', location: 'Batoka, Livingstone Road', route: 'T3 - Livingstone Road', province: 'Southern' },
    { name: 'Zimba Toll Plaza', location: 'Zimba', route: 'T3 - Livingstone Road', province: 'Southern' },
    // Northern Province
    { name: 'Mpika Toll Plaza', location: 'Mpika', route: 'T2 - Great North Road', province: 'Muchinga' },
    { name: 'Serenje Toll Plaza', location: 'Serenje', route: 'T2 - Great North Road', province: 'Central' },
    // Eastern Province
    { name: 'Luangwa Bridge Toll', location: 'Luangwa Bridge', route: 'T4 - Great East Road', province: 'Lusaka' },
    { name: 'Manyumbi Toll Plaza', location: 'Manyumbi', route: 'T4 - Great East Road', province: 'Eastern' },
    // Northwestern Province
    { name: 'Solwezi Toll Plaza', location: 'Solwezi', route: 'M8 - Solwezi Road', province: 'Northwestern' },
    // Ports of Entry
    { name: 'Kazungula Border Toll', location: 'Kazungula', route: 'M10 - Kazungula Road', province: 'Southern' },
    { name: 'Chirundu Border Toll', location: 'Chirundu', route: 'T2 - Great North Road', province: 'Southern' },
    { name: 'Nakonde Border Toll', location: 'Nakonde', route: 'T2 - Great North Road', province: 'Muchinga' },
    { name: 'Kasumbalesa Border Toll', location: 'Kasumbalesa', route: 'T3 - Copperbelt Road', province: 'Copperbelt' },
  ];

  // Tariff rates per vehicle class (in ZMW - Zambian Kwacha)
  // Based on NRFA Public Notice effective 1st January 2026
  const tariffsByClass = {
    Class1_Motorcycle: 20.00,
    Class2_LightVehicle: 40.00,
    Class3_Minibus: 50.00,
    Class4_HeavyBus: 200.00,
    Class5_LightTruck: 300.00,
    Class6_HeavyTruck: 3000.00,
  };

  // Insert toll gates
  for (const gate of tollGates) {
    const existing = await query(
      'SELECT GateID FROM TollGates WHERE GateName = ?', [gate.name]
    );
    if (existing.length === 0) {
      const result = await query(
        'INSERT INTO TollGates (GateName, Location, Route, Province, IsActive) VALUES (?, ?, ?, ?, TRUE)',
        [gate.name, gate.location, gate.route, gate.province]
      );
      const gateId = result.insertId;

      // Insert tariff rates for each vehicle class at this gate
      for (const [vehicleClass, amount] of Object.entries(tariffsByClass)) {
        await query(
          'INSERT INTO TariffRates (GateID, VehicleClass, Amount, Currency) VALUES (?, ?, ?, ?)',
          [gateId, vehicleClass, amount, 'ZMW']
        );
      }
      console.log(`  ✅ Toll gate: ${gate.name} (${gate.province})`);
    } else {
      console.log(`  ⏭️  Toll gate already exists: ${gate.name}`);
    }
  }

  // ── SEED ADMIN ACCOUNT ──
  const adminEmail = 'admin@nrfa.gov.zm';
  const existingAdmin = await query('SELECT AdminID FROM Admins WHERE Email = ?', [adminEmail]);
  if (existingAdmin.length === 0) {
    const adminHash = await bcrypt.hash('Admin@2026', 12);
    await query(
      'INSERT INTO Admins (Name, Email, PasswordHash, Role) VALUES (?, ?, ?, ?)',
      ['NRFA Administrator', adminEmail, adminHash, 'SuperAdmin']
    );
    console.log('\n  ✅ Admin account: admin@nrfa.gov.zm / Admin@2026');
  } else {
    console.log('\n  ⏭️  Admin account already exists');
  }

  // ── SEED DEMO USER ──
  const demoEmail = 'demo@avtpp.zm';
  const existingUser = await query('SELECT UserID FROM Users WHERE Email = ?', [demoEmail]);
  if (existingUser.length === 0) {
    const userHash = await bcrypt.hash('Demo@2026', 12);
    const userResult = await query(
      'INSERT INTO Users (FirstName, LastName, Email, PasswordHash, PhoneNumber) VALUES (?, ?, ?, ?, ?)',
      ['Chanda', 'Mwamba', demoEmail, userHash, '+260971234567']
    );
    const userId = userResult.insertId;

    // Create wallet with demo balance
    await query(
      'INSERT INTO Accounts (UserID, Balance, LowBalanceThreshold) VALUES (?, ?, ?)',
      [userId, 500.00, 50.00]
    );

    // Add demo vehicles
    const vehicles = [
      { plate: 'BAA 1234 ZM', make: 'Toyota', model: 'Corolla', year: 2020, vclass: 'Class2_LightVehicle' },
      { plate: 'ABB 5678 ZM', make: 'Isuzu', model: 'NQR', year: 2019, vclass: 'Class6_HeavyTruck' },
    ];
    for (const v of vehicles) {
      await query(
        'INSERT INTO Vehicles (UserID, LicencePlate, Make, Model, Year, VehicleClass) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, v.plate, v.make, v.model, v.year, v.vclass]
      );
    }

    console.log('  ✅ Demo user: demo@avtpp.zm / Demo@2026');
    console.log('  ✅ Demo vehicles: BAA 1234 ZM (Corolla), ABB 5678 ZM (NQR)');
    console.log('  ✅ Demo wallet: K500.00 ZMW');
  } else {
    console.log('  ⏭️  Demo user already exists');
  }

  console.log('\n🎉 Seed completed successfully!\n');
}

module.exports = { seed };

// Allow running directly: `node seeds/seed.js`
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Seed failed:', err);
      process.exit(1);
    });
}
