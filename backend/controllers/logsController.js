const { pool } = require('../db/connection');

// POST - Create a new log entry
const createLog = async (req, res) => {
  const logData = req.body;

  console.log("Received Log:");
  console.log(JSON.stringify(logData, null, 2));

  try {
    // Insert log data into database using parameterized query
    const insertResult = await pool.query(
      'INSERT INTO logs(api_name, response_time, status_code, error_message, timestamp) VALUES($1, $2, $3, $4, $5)',
      [
        logData.api_name,
        logData.response_time || null,
        logData.status_code || null,
        logData.error_message || null,
        logData.timestamp,
      ]
    );

    console.log("Log saved to database");

    // If log contains error_message, insert into errors table
    console.log("Checking error:", logData.error_message);
    if (logData.error_message) {
      await pool.query(
        'INSERT INTO errors(timestamp, error_message, error_type, api_name, device_info, stack_trace) VALUES($1, $2, $3, $4, $5, $6)',
        [
          logData.timestamp,
          logData.error_message,
          'API_ERROR',
          logData.api_name,
          'Flutter Web',
          logData.error_message,
        ]
      );
      console.log("Error stored in DB");
    }

    // Check for alert conditions and create alerts
    if (logData.response_time && logData.response_time > 3000) {
      await pool.query(
        'INSERT INTO alerts(timestamp, alert_type, message, severity) VALUES($1, $2, $3, $4)',
        [logData.timestamp, 'Performance', 'Slow API detected', 'High']
      );
      console.log("Alert created: Performance issue detected");
    }

    if (logData.status_code && logData.status_code >= 500) {
      await pool.query(
        'INSERT INTO alerts(timestamp, alert_type, message, severity) VALUES($1, $2, $3, $4)',
        [logData.timestamp, 'Server Error', 'Server error detected', 'Critical']
      );
      console.log("Alert created: Server error detected");
    }

    res.json({ message: "Log received successfully" });
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// GET - Fetch logs from database
const getLogs = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM logs ORDER BY timestamp DESC LIMIT 50'
    );

    res.json({ logs: result.rows });
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
};

module.exports = { createLog, getLogs };
