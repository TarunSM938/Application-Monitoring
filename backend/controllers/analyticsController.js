const { pool } = require('../db/connection');

// GET - Fetch analytics data (slow APIs and errors)
const getAnalytics = async (req, res) => {
  try {
    // Fetch slow APIs (response_time > 1000ms)
    const slowApisResult = await pool.query(
      'SELECT * FROM logs WHERE response_time > 1000 ORDER BY timestamp DESC'
    );

    // Fetch all errors from errors table
    const errorsResult = await pool.query(
      'SELECT * FROM errors ORDER BY timestamp DESC'
    );

    // Get total errors count
    const totalErrorsCount = errorsResult.rows.length;

    const analytics = {
      slow_apis: slowApisResult.rows,
      errors: errorsResult.rows,
      total_errors: totalErrorsCount,
    };

    res.json(analytics);
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
};

module.exports = { getAnalytics };
