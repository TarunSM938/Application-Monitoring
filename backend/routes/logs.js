const express = require('express');
const router = express.Router();
const { createLog, getLogs } = require('../controllers/logsController');
const validateLog = require('../middleware/validateLog');

router.post('/', validateLog, createLog);
router.get('/', getLogs);

module.exports = router;
