const express = require('express');
const authRoutes = require('./auth.routes');
const donorRoutes = require('./donor.routes');
const requestRoutes = require('./request.routes');
const dashboardRoutes = require('./dashboard.routes');
const config = require('../config/env');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', env: config.env, time: new Date().toISOString() } });
});

router.use('/auth', authRoutes);
router.use('/donors', donorRoutes);
router.use('/requests', requestRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
