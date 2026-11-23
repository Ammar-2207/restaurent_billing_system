const mongoose = require('mongoose');

const getDatabaseStatus = () => {
  const readyState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    stateCode: readyState,
    status: states[readyState] || 'unknown',
    isConnected: readyState === 1,
  };
};

const getHealthStatus = (req, res) => {
  const dbStatus = getDatabaseStatus();
  const isHealthy = dbStatus.isConnected;

  const responsePayload = {
    success: isHealthy,
    status: isHealthy ? 'healthy' : 'degraded',
    message: isHealthy
      ? 'Restaurant Billing Management System API is operational and database is connected'
      : 'Restaurant Billing Management System API is running, but database is disconnected',
    timestamp: new Date().toISOString(),
    uptime: `${process.uptime().toFixed(2)}s`,
    environment: process.env.NODE_ENV || 'development',
    mongodb: {
      status: dbStatus.status,
      readyState: dbStatus.stateCode,
    },
  };

  const statusCode = isHealthy ? 200 : 503;
  return res.status(statusCode).json(responsePayload);
};

module.exports = {
  getHealthStatus,
};
