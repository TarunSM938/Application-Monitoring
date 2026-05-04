const express = require('express');
const router = express.Router();
const {
  getAnalytics,
  getIssueDetails,
  updateIssueStatus,
} = require('../controllers/analyticsController');

// GET /api/analytics - Fetch analytics data
router.get('/', getAnalytics);
router.get('/issues/:fingerprint', getIssueDetails);
router.put('/issues/:fingerprint/status', updateIssueStatus);

module.exports = router;
