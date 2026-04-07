const { pool } = require('../db/connection');
const asyncHandler = require('../utils/asyncHandler');

// GET - Calculate and return metrics from logs
const getMetrics = asyncHandler(async (req, res) => {
  // Calculate metrics from logs table
  const result = await pool.query(`
    SELECT 
      COALESCE(AVG(response_time), 0) as avg_response,
      COUNT(*) as total_requests,
      COUNT(error_message) as error_count,
      CASE 
        WHEN COUNT(*) > 0 THEN (COUNT(error_message)::FLOAT / COUNT(*)::FLOAT) * 100
        ELSE 0 
      END as error_rate
    FROM logs
  `);

  const metrics = {
    avg_response: parseFloat(result.rows[0].avg_response),
    total_requests: parseInt(result.rows[0].total_requests),
    error_count: parseInt(result.rows[0].error_count),
    error_rate: parseFloat(result.rows[0].error_rate),
  };

  res.json(metrics);
});

module.exports = { getMetrics };
