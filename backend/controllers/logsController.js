const { pool } = require('../db/connection');
const asyncHandler = require('../utils/asyncHandler');

const buildErrorDetails = (logData) => {
  const errorType = logData.error_type || (
    logData.status_code >= 500 ? 'SERVER_ERROR' : 'APPLICATION_ERROR'
  );

  if (errorType === 'TIMEOUT') {
    return {
      alertType: 'Timeout',
      message: `${logData.api_name} timed out`,
      severity: 'High',
    };
  }

  if (errorType === 'BAD_RESPONSE') {
    return {
      alertType: 'Bad Response',
      message: `${logData.api_name} returned invalid JSON`,
      severity: 'High',
    };
  }

  if (errorType === 'UNHANDLED_APP_ERROR') {
    return {
      alertType: 'Unhandled Error',
      message: `${logData.api_name} crashed outside request handling`,
      severity: 'Critical',
    };
  }

  if (logData.status_code >= 500 || errorType === 'SERVER_ERROR') {
    return {
      alertType: 'Server Error',
      message: `${logData.api_name} failed with status ${logData.status_code || 500}`,
      severity: 'Critical',
    };
  }

  return {
    alertType: 'Application Error',
    message: `${logData.api_name} failed`,
    severity: 'High',
  };
};

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
    const errorDetails = buildErrorDetails(logData);

    await pool.query(
      'INSERT INTO errors(timestamp, error_message, error_type, api_name, device_info, stack_trace, session_id, trace_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8)',
      [
        logData.timestamp,
        logData.error_message,
        logData.error_type || 'APPLICATION_ERROR',
        logData.api_name,
        logData.device_info || 'Unknown device',
        logData.stack_trace || logData.error_message,
        logData.session_id ?? null,
        logData.trace_id ?? null,
      ]
    );
    console.log("Error stored in DB");

    await pool.query(
      'INSERT INTO alerts(timestamp, alert_type, message, severity) VALUES($1, $2, $3, $4)',
      [logData.timestamp, errorDetails.alertType, errorDetails.message, errorDetails.severity]
    );
    console.log("Alert created: Error issue detected");
  }

  if (logData.response_time && logData.response_time > 3000) {
    await pool.query(
      'INSERT INTO alerts(timestamp, alert_type, message, severity) VALUES($1, $2, $3, $4)',
      [logData.timestamp, 'Performance', 'Slow API detected', 'High']
    );
    console.log("Alert created: Performance issue detected");
  }

  if (!logData.error_message && logData.status_code && logData.status_code >= 500) {
    await pool.query(
      'INSERT INTO alerts(timestamp, alert_type, message, severity) VALUES($1, $2, $3, $4)',
      [logData.timestamp, 'Server Error', 'Server error detected', 'Critical']
    );
    console.log("Alert created: Server error detected");
  }

  const io = req.app.get('io');
  if (io) {
    io.emit('log-created');

    if (logData.error_message) {
      io.emit('error-created');
      io.emit('alert-created');
    }

    if (logData.response_time && logData.response_time > 3000) {
      io.emit('alert-created');
    }

    if (!logData.error_message && logData.status_code && logData.status_code >= 500) {
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
    `SELECT
      l.*,
      e.error_type,
      e.stack_trace
    FROM logs l
    LEFT JOIN LATERAL (
      SELECT error_type, stack_trace
      FROM errors e
      WHERE e.trace_id IS NOT DISTINCT FROM l.trace_id
        AND e.timestamp = l.timestamp
      ORDER BY e.timestamp DESC
      LIMIT 1
    ) e ON l.error_message IS NOT NULL
    WHERE ($1::text IS NULL OR l.trace_id = $1)
    ORDER BY l.timestamp DESC
    LIMIT $2 OFFSET $3`,
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
    `SELECT
      l.*,
      e.error_type,
      e.stack_trace
    FROM logs l
    LEFT JOIN LATERAL (
      SELECT error_type, stack_trace
      FROM errors e
      WHERE e.trace_id IS NOT DISTINCT FROM l.trace_id
        AND e.timestamp = l.timestamp
      ORDER BY e.timestamp DESC
      LIMIT 1
    ) e ON l.error_message IS NOT NULL
    WHERE l.trace_id = $1
    ORDER BY l.timestamp ASC`,
    [traceId]
  );

  res.json({
    trace_id: traceId,
    logs: result.rows,
  });
});

module.exports = { createLog, getLogs, getTraceLogs };
