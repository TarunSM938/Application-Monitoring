const { pool } = require('../db/connection');
const asyncHandler = require('../utils/asyncHandler');

// POST - Create a new log entry
const createLog = asyncHandler(async (req, res) => {
  const logData = req.body;

  console.log("Received Log:");
  console.log(JSON.stringify(logData, null, 2));

  await pool.query(
    'INSERT INTO logs(api_name, response_time, status_code, error_message, timestamp, session_id, device_info, trace_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8)',
    [
      logData.api_name,
      logData.response_time ?? null,
      logData.status_code ?? null,
      logData.error_message ?? null,
      logData.timestamp,
      logData.session_id ?? null,
      logData.device_info ?? null,
      logData.trace_id ?? null,
    ]
  );

  console.log("Log saved to database");

  if (logData.error_message) {
    await pool.query(
      'INSERT INTO errors(timestamp, error_message, error_type, api_name, device_info, stack_trace, session_id, trace_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8)',
      [
        logData.timestamp,
        logData.error_message,
        'API_ERROR',
        logData.api_name,
        logData.device_info || 'Unknown device',
        logData.error_message,
        logData.session_id ?? null,
        logData.trace_id ?? null,
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
});

// GET - Fetch logs from database with pagination
const getLogs = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
  const offset = (page - 1) * limit;
  const traceId = req.query.trace_id || null;

  const countResult = await pool.query(
    'SELECT COUNT(*) FROM logs WHERE ($1::text IS NULL OR trace_id = $1)',
    [traceId]
  );
  const logsResult = await pool.query(
    'SELECT * FROM logs WHERE ($1::text IS NULL OR trace_id = $1) ORDER BY timestamp DESC LIMIT $2 OFFSET $3',
    [traceId, limit, offset]
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
});

const getTraceLogs = asyncHandler(async (req, res) => {
  const { traceId } = req.params;

  const result = await pool.query(
    'SELECT * FROM logs WHERE trace_id = $1 ORDER BY timestamp ASC',
    [traceId]
  );

  res.json({
    trace_id: traceId,
    logs: result.rows,
  });
});

module.exports = { createLog, getLogs, getTraceLogs };
