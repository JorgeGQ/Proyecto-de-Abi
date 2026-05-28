const { Sequelize } = require('sequelize');
const path = require('path');

const databaseUrl = process.env.DATABASE_URL;
let sequelize;

if (databaseUrl) {
  // Use PostgreSQL in production (e.g. Supabase, Neon)
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Required for secure connections on cloud databases
      },
    },
    logging: false,
  });
} else {
  // Fall back to SQLite locally
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'database', 'postres_abi.db'),
    logging: false,
  });
}

module.exports = sequelize;
