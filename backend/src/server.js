const dns = require('dns');

// Configure Node.js DNS servers to Google Public DNS to resolve MongoDB Atlas SRV records
dns.setServers(['8.8.8.8', '8.8.4.4']);

const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');
const seedUsers = require('./config/seed');

const PORT = process.env.PORT || 5000;

// Start Express HTTP server
const server = app.listen(PORT, () => {
  console.log(`[Server] Restaurant Billing System Backend listening on port ${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
});

// Initialize database connection & seed baseline accounts
connectDB()
  .then(() => seedUsers())
  .catch((err) => {
    console.warn(`[Server Warning] MongoDB connection attempt failed: ${err.message}`);
    console.warn('[Server Warning] API running in degraded mode. Health check will report disconnected database.');
  });

// Graceful shutdown handling
const handleShutdown = (signal) => {
  console.log(`\n[Server] ${signal} signal received: closing HTTP server`);
  server.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err);
});
