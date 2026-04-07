const { pool } = require('../db/connection');
const asyncHandler = require('../utils/asyncHandler');
const createHttpError = require('../utils/httpError');

// GET - Fetch all alerts from database
const getAlerts = asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM alerts ORDER BY timestamp DESC'
  );

  res.json({ alerts: result.rows });
});

// PUT - Mark an alert as resolved
const resolveAlert = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    'UPDATE alerts SET resolved = true WHERE id = $1 RETURNING *',
    [id]
  );

  if (result.rows.length === 0) {
    throw createHttpError(404, 'Alert not found');
  }

  const io = req.app.get('io');
  if (io) {
    io.emit('alert-resolved');
  }

  res.json({ message: "Alert resolved successfully", alert: result.rows[0] });
});

module.exports = { getAlerts, resolveAlert };
