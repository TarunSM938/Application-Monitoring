const express = require('express');
const router = express.Router();
const { createLog, getLogs } = require('../controllers/logsController');

// POST /api/logs - Create a new log entry
router.post('/', createLog);

// GET /api/logs - Fetch logs from database
router.get('/', getLogs);

module.exports = router;
