const { pool } = require('../db/connection');

// GET - Fetch all alerts from database
const getAlerts = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM alerts ORDER BY timestamp DESC'
    );

    res.json({ alerts: result.rows });
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// PUT - Mark an alert as resolved
const resolveAlert = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'UPDATE alerts SET resolved = true WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Alert not found" });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('alert-resolved');
    }

    res.json({ message: "Alert resolved successfully", alert: result.rows[0] });
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
};

module.exports = { getAlerts, resolveAlert };
