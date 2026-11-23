const User = require('../models/user.model');
const seedMenuItems = require('./menuSeed');
const seedTables = require('./tableSeed');

/**
 * Automatically seed baseline Admin, Cashier, Menu items, and Tables if they do not exist
 */
const seedUsers = async () => {
  try {
    // 1. Seed Administrator Account
    const existingAdmin = await User.findOne({
      $or: [{ username: 'admin' }, { role: 'admin' }],
    });

    if (!existingAdmin) {
      await User.create({
        name: 'System Administrator',
        username: 'admin',
        email: 'admin@restaurant.com',
        password: 'Admin@123',
        role: 'admin',
        isActive: true,
      });
      console.log('[Seed] Admin user created: admin / Admin@123');
    } else {
      console.log(`[Seed] Admin user verified (${existingAdmin.username})`);
    }

    // 2. Seed Cashier Account
    const existingCashier = await User.findOne({
      $or: [{ username: 'cashier' }, { email: 'cashier@restaurant.com' }],
    });

    if (!existingCashier) {
      await User.create({
        name: 'Front Cashier',
        username: 'cashier',
        email: 'cashier@restaurant.com',
        password: 'Cashier@123',
        role: 'cashier',
        isActive: true,
      });
      console.log('[Seed] Cashier user created: cashier / Cashier@123');
    } else {
      console.log(`[Seed] Cashier user verified (${existingCashier.username})`);
    }

    // 3. Seed Menu Items
    await seedMenuItems();

    // 4. Seed Tables (T1 through T10)
    await seedTables();
  } catch (error) {
    console.error('[Seed Error] Failed to initialize default users, menu, and tables:', error.message);
  }
};

module.exports = seedUsers;
