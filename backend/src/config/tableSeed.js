const Table = require('../models/table.model');

const EXPECTED_TABLES = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10'];

/**
 * Idempotently seed exactly 10 restaurant tables (T1 through T10)
 */
const seedTables = async () => {
  try {
    let createdCount = 0;

    for (const tableNum of EXPECTED_TABLES) {
      const existing = await Table.findOne({ tableNumber: tableNum });
      if (!existing) {
        await Table.create({
          tableNumber: tableNum,
          status: 'free',
          currentOrder: null,
        });
        createdCount++;
      }
    }

    const totalTables = await Table.countDocuments();
    if (createdCount > 0) {
      console.log(`[Table Seed] Initialized ${createdCount} tables. Total tables: ${totalTables}`);
    } else {
      console.log(`[Table Seed] Tables verified (${totalTables} tables active: ${EXPECTED_TABLES.join(', ')})`);
    }
  } catch (error) {
    console.error('[Table Seed Error] Failed to seed tables:', error.message);
  }
};

module.exports = seedTables;
