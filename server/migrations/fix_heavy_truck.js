const { query, initializeDatabase } = require('../config/database');

(async () => {
  await initializeDatabase();

  // Fix rows where Class5_HeavyTruck became empty string after ENUM alter
  const fixed = await query(
    "UPDATE TariffRates SET VehicleClass = 'Class6_HeavyTruck', Amount = 3000.00 WHERE VehicleClass = '' OR Amount = 150.00"
  );
  console.log(`Fixed ${fixed.affectedRows} empty/old heavy truck rows`);

  // Ensure Class6_HeavyTruck exists for all gates
  const gates = await query('SELECT GateID FROM TollGates');
  let added = 0;
  for (const g of gates) {
    const ex = await query(
      "SELECT TariffID FROM TariffRates WHERE GateID = ? AND VehicleClass = 'Class6_HeavyTruck'",
      [g.GateID]
    );
    if (ex.length === 0) {
      await query(
        "INSERT INTO TariffRates (GateID, VehicleClass, Amount, Currency) VALUES (?, 'Class6_HeavyTruck', 3000.00, 'ZMW')",
        [g.GateID]
      );
      added++;
    }
  }
  console.log(`Added Class6_HeavyTruck to ${added} gate(s)`);

  // Also fix any vehicles that lost their class
  await query("UPDATE Vehicles SET VehicleClass = 'Class6_HeavyTruck' WHERE VehicleClass = ''");

  // Final verification
  const r = await query('SELECT DISTINCT VehicleClass, Amount FROM TariffRates ORDER BY VehicleClass');
  console.log('\nFinal tariff structure:');
  console.table(r);

  process.exit(0);
})();
