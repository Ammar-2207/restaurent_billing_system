const mongoose = require('mongoose');
const Settings = require('../models/settings.model');

/**
 * Controller: Get current system settings
 * GET /api/settings
 */
const getSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getSingleton();
    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Update system settings (Admin Only)
 * PUT /api/settings
 */
const updateSettings = async (req, res, next) => {
  try {
    const {
      restaurantName,
      tagline,
      contactPhone,
      contactEmail,
      address,
      gstin,
      currencySymbol,
      defaultGstRate,
      cgstRate,
      sgstRate,
      billPrefix,
      timezone,
      enableRoundOff,
    } = req.body;

    const settings = await Settings.getSingleton();

    if (restaurantName !== undefined) settings.restaurantName = restaurantName.trim();
    if (tagline !== undefined) settings.tagline = tagline.trim();
    if (contactPhone !== undefined) settings.contactPhone = contactPhone.trim();
    if (contactEmail !== undefined) settings.contactEmail = contactEmail.trim().toLowerCase();
    if (address !== undefined) settings.address = address.trim();
    if (gstin !== undefined) settings.gstin = gstin.trim().toUpperCase();
    if (currencySymbol !== undefined) settings.currencySymbol = currencySymbol.trim();
    if (defaultGstRate !== undefined) {
      const gst = parseFloat(defaultGstRate);
      if (isNaN(gst) || gst < 0) {
        return res.status(400).json({ success: false, message: 'Invalid GST rate' });
      }
      settings.defaultGstRate = gst;
      settings.cgstRate = Number((gst / 2).toFixed(2));
      settings.sgstRate = Number((gst / 2).toFixed(2));
    }
    if (cgstRate !== undefined) settings.cgstRate = parseFloat(cgstRate);
    if (sgstRate !== undefined) settings.sgstRate = parseFloat(sgstRate);
    if (billPrefix !== undefined) settings.billPrefix = billPrefix.trim().toUpperCase();
    if (timezone !== undefined) settings.timezone = timezone.trim();
    if (enableRoundOff !== undefined) settings.enableRoundOff = Boolean(enableRoundOff);

    await settings.save();

    return res.status(200).json({
      success: true,
      message: 'System settings updated successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get live server & database diagnostics (Admin Only)
 * GET /api/settings/diagnostics
 */
const getSystemDiagnostics = async (req, res, next) => {
  try {
    const dbStateMap = {
      0: 'Disconnected',
      1: 'Connected',
      2: 'Connecting',
      3: 'Disconnecting',
    };

    const startTime = Date.now();
    let pingLatencyMs = 0;
    try {
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
        pingLatencyMs = Date.now() - startTime;
      }
    } catch {
      pingLatencyMs = -1;
    }

    const uptimeSeconds = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    const uptimeFormatted = `${hours}h ${minutes}m ${seconds}s`;

    const memoryUsage = process.memoryUsage();

    return res.status(200).json({
      success: true,
      data: {
        server: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          uptime: uptimeFormatted,
          uptimeSeconds,
          environment: process.env.NODE_ENV || 'development',
          memoryRssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
          memoryHeapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
        },
        database: {
          status: dbStateMap[mongoose.connection.readyState] || 'Unknown',
          host: mongoose.connection.host || 'Atlas Cluster',
          name: mongoose.connection.name || 'restaurant_billing',
          pingLatencyMs,
        },
        systemTime: {
          utc: new Date().toISOString(),
          timezone: 'Asia/Kolkata',
          localFormatted: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getSystemDiagnostics,
};
