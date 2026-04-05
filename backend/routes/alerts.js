const express = require('express');
const router = express.Router();
const { getAlerts, resolveAlert } = require('../controllers/alertsController');

// GET /api/alerts - Fetch all alerts
router.get('/', getAlerts);

// PUT /api/alerts/:id/resolve - Mark alert as resolved
router.put('/:id/resolve', resolveAlert);

module.exports = router;
