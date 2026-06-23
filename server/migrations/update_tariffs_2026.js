const { query, initializeDatabase } = require('../config/database');

async function migrate() {
  await initializeDatabase();

  // 1. Alter Vehicles ENUM to add new classes
  try {
    await query(
      "ALTER TABLE Vehicles MODIFY COLUMN VehicleClass ENUM('Class1_Motorcycle','Class2_LightVehicle','Class3_Minibus','Class4_HeavyBus','Class5_LightTruck','Class6_HeavyTruck') NOT NULL DEFAULT 'Class2_LightVehicle'"
    );
    console.log('✅ Vehicles table ENUM updated');
  } catch (e) {
    console.log('⏭️  Vehicles:', e.message);
  }

  // 2. Alter TariffRates ENUM
  try {
    await query(
      "ALTER TABLE TariffRates MODIFY COLUMN VehicleClass ENUM('Class1_Motorcycle','Class2_LightVehicle','Class3_Minibus','Class4_HeavyBus','Class5_LightTruck','Class6_HeavyTruck') NOT NULL"
    );
    console.log('✅ TariffRates table ENUM updated');
  } catch (e) {
    console.log('⏭️  TariffRates:', e.message);
  }

  // 3. Migrate existing Class5_HeavyTruck → Class6_HeavyTruck
  try {
    const r1 = await query("UPDATE Vehicles SET VehicleClass='Class6_HeavyTruck' WHERE VehicleClass='Class5_HeavyTruck'");
    console.log(`✅ Migrated ${r1.affectedRows || 0} vehicles from Class5 to Class6`);
  } catch (e) {
    console.log('⏭️  Vehicle migration:', e.message);
  }

  try {
    const r2 = await query("UPDATE TariffRates SET VehicleClass='Class6_HeavyTruck' WHERE VehicleClass='Class5_HeavyTruck'");
    console.log(`✅ Migrated ${r2.affectedRows || 0} tariff rows from Class5 to Class6`);
  } catch (e) {
    console.log('⏭️  Tariff migration:', e.message);
  }

  // 4. Update tariff amounts to match NRFA 2026 Public Notice
  try {
    await query("UPDATE TariffRates SET Amount = 20.00 WHERE VehicleClass = 'Class1_Motorcycle'");
    await query("UPDATE TariffRates SET Amount = 40.00 WHERE VehicleClass = 'Class2_LightVehicle'");
    await query("UPDATE TariffRates SET Amount = 50.00 WHERE VehicleClass = 'Class3_Minibus'");
    await query("UPDATE TariffRates SET Amount = 200.00 WHERE VehicleClass = 'Class4_HeavyBus'");
    await query("UPDATE TariffRates SET Amount = 3000.00 WHERE VehicleClass = 'Class6_HeavyTruck'");
    console.log('✅ Updated all tariff amounts to NRFA 2026 rates');
  } catch (e) {
    console.log('❌ Amount update error:', e.message);
  }

  // 5. Add Class5_LightTruck tariff to all gates (new class)
  try {
    const gates = await query('SELECT GateID FROM TollGates');
    let added = 0;
    for (const g of gates) {
      const existing = await query(
        "SELECT TariffID FROM TariffRates WHERE GateID = ? AND VehicleClass = 'Class5_LightTruck'",
        [g.GateID]
      );
      if (existing.length === 0) {
        await query(
          "INSERT INTO TariffRates (GateID, VehicleClass, Amount, Currency) VALUES (?, 'Class5_LightTruck', 300.00, 'ZMW')",
          [g.GateID]
        );
        added++;
      }
    }
    console.log(`✅ Added Class5_LightTruck (K300) tariff to ${added} gate(s)`);
  } catch (e) {
    console.log('❌ LightTruck tariff error:', e.message);
  }

  console.log('\n🎉 Migration complete! New NRFA 2026 tariff structure applied.\n');
  process.exit(0);
}

migrate().catch(e => {
  console.error('❌ Migration failed:', e);
  process.exit(1);
});
