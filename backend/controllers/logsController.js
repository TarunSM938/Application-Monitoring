const { pool } = require('../db/connection');

// POST - Create a new log entry
const createLog = async (req, res) => {
  const logData = req.body;

  console.log("Received Log:");
  console.log(JSON.stringify(logData, null, 2));

  try {
    await pool.query(
      'INSERT INTO logs(api_name, response_time, status_code, error_message, timestamp, session_id, device_info) VALUES($1, $2, $3, $4, $5, $6, $7)',
      [
        logData.api_name,
        logData.response_time ?? null,
        logData.status_code ?? null,
        logData.error_message ?? null,
        logData.timestamp,
        logData.session_id ?? null,
        logData.device_info ?? null,
      ]
    );

    console.log("Log saved to database");

    if (logData.error_message) {
      await pool.query(
        'INSERT INTO errors(timestamp, error_message, error_type, api_name, device_info, stack_trace, session_id) VALUES($1, $2, $3, $4, $5, $6, $7)',
        [
          logData.timestamp,
          logData.error_message,
          'API_ERROR',
          logData.api_name,
          logData.device_info || 'Unknown device',
          logData.error_message,
          logData.session_id ?? null,
        ]
      );
      console.log("Error stored in DB");
    }

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

    const io = req.app.get('io');
    if (io) {
      io.emit('log-created');

      if (logData.response_time && logData.response_time > 3000) {
        io.emit('alert-created');
      }

      if (logData.status_code && logData.status_code >= 500) {
        io.emit('alert-created');
      }
    }


    res.json({ message: "Log received successfully" });
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// GET - Fetch logs from database with pagination
const getLogs = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
  const offset = (page - 1) * limit;

  try {
    const countResult = await pool.query('SELECT COUNT(*) FROM logs');
    const logsResult = await pool.query(
      'SELECT * FROM logs ORDER BY timestamp DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    const total = parseInt(countResult.rows[0].count, 10);

    res.json({
      logs: logsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
};

module.exports = { createLog, getLogs };
