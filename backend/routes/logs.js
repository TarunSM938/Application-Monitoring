const express = require('express');
const router = express.Router();
const { createLog, getLogs, getTraceLogs } = require('../controllers/logsController');
const validateLog = require('../middleware/validateLog');

router.post('/', validateLog, createLog);
router.get('/trace/:traceId', getTraceLogs);
router.get('/', getLogs);

module.exports = router;
