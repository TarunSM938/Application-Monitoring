const { pool } = require('../db/connection');
const asyncHandler = require('../utils/asyncHandler');
const createHttpError = require('../utils/httpError');

const TIME_RANGE_TO_INTERVAL = {
  '15m': '15 minutes',
  '1h': '1 hour',
  '24h': '24 hours',
  '7d': '7 days',
};

const ensureIssueStateTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS issue_states (
      fingerprint TEXT PRIMARY KEY,
      resolved BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

const buildSeverityCase = (alias = 'e') => `
  CASE
    WHEN ${alias}.error_type IN ('UNHANDLED_APP_ERROR', 'SERVER_ERROR') THEN 'Critical'
    WHEN ${alias}.error_type IN ('TIMEOUT', 'BAD_RESPONSE') THEN 'High'
    ELSE 'Medium'
  END
`;

const buildBaseFilters = (query) => {
  const rawWhere = [];
  const computedWhere = [];
  const values = [];
  const interval = TIME_RANGE_TO_INTERVAL[query.time_range];

  if (interval) {
    rawWhere.push(`e.timestamp >= NOW() - INTERVAL '${interval}'`);
  }

  if (query.error_type) {
    values.push(query.error_type);
    rawWhere.push(`e.error_type = $${values.length}`);
  }

  if (query.api_name) {
    values.push(`%${query.api_name}%`);
    rawWhere.push(`e.api_name ILIKE $${values.length}`);
  }

  if (query.trace_id) {
    values.push(`%${query.trace_id}%`);
    rawWhere.push(`COALESCE(e.trace_id, '') ILIKE $${values.length}`);
  }

  if (query.session_id) {
    values.push(`%${query.session_id}%`);
    rawWhere.push(`COALESCE(e.session_id, '') ILIKE $${values.length}`);
  }

  if (query.severity) {
    values.push(query.severity);
    computedWhere.push(`severity = $${values.length}`);
  }

  if (query.q) {
    values.push(`%${query.q}%`);
    const idx = values.length;
    computedWhere.push(`(
      COALESCE(api_name, '') ILIKE $${idx}
      OR COALESCE(error_type, '') ILIKE $${idx}
      OR COALESCE(error_message, '') ILIKE $${idx}
      OR COALESCE(trace_id, '') ILIKE $${idx}
      OR COALESCE(session_id, '') ILIKE $${idx}
      OR COALESCE(device_info, '') ILIKE $${idx}
      OR fingerprint ILIKE $${idx}
      OR COALESCE(top_stack_frame, '') ILIKE $${idx}
    )`);
  }

  return {
    rawClause: rawWhere.length ? `WHERE ${rawWhere.join(' AND ')}` : '',
    computedClause: computedWhere.length ? `WHERE ${computedWhere.join(' AND ')}` : '',
    values,
  };
};

const buildAnalyticsCtes = (query) => {
  const { rawClause, computedClause, values } = buildBaseFilters(query);
  const severityCase = buildSeverityCase('e');

  return {
    values,
    ctes: `
      WITH base_errors AS (
        SELECT
          e.*,
          ${severityCase} AS severity,
          COALESCE(
            NULLIF(split_part(COALESCE(e.stack_trace, ''), E'\\n', 1), ''),
            e.error_message,
            'Unknown issue'
          ) AS top_stack_frame,
          md5(
            concat_ws(
              '||',
              COALESCE(e.error_type, ''),
              COALESCE(e.api_name, ''),
              COALESCE(
                NULLIF(split_part(COALESCE(e.stack_trace, ''), E'\\n', 1), ''),
                e.error_message,
                ''
              )
            )
          ) AS fingerprint
        FROM errors e
        ${rawClause}
      ),
      filtered_errors AS (
        SELECT *
        FROM base_errors
        ${computedClause}
      ),
      grouped_issues AS (
        SELECT
          fe.fingerprint,
          (array_agg(fe.api_name ORDER BY fe.timestamp DESC))[1] AS api_name,
          (array_agg(fe.error_type ORDER BY fe.timestamp DESC))[1] AS error_type,
          (array_agg(fe.severity ORDER BY fe.timestamp DESC))[1] AS severity,
          (array_agg(fe.top_stack_frame ORDER BY fe.timestamp DESC))[1] AS top_stack_frame,
          (array_agg(fe.error_message ORDER BY fe.timestamp DESC))[1] AS latest_error_message,
          (array_agg(fe.trace_id ORDER BY fe.timestamp DESC))[1] AS latest_trace_id,
          COUNT(*)::INT AS occurrences,
          MIN(fe.timestamp) AS first_seen,
          MAX(fe.timestamp) AS last_seen,
          CAST(COUNT(DISTINCT fe.session_id) FILTER (WHERE fe.session_id IS NOT NULL) AS INT) AS affected_sessions,
          CAST(COUNT(DISTINCT fe.device_info) FILTER (WHERE fe.device_info IS NOT NULL) AS INT) AS affected_devices,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT fe.session_id), NULL) AS session_ids,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT fe.device_info), NULL) AS device_examples
        FROM filtered_errors fe
        GROUP BY fe.fingerprint
      )
    `,
  };
};

const getStatusClause = (query, values, alias) => {
  if (query.status === 'resolved') {
    values.push(true);
    return `WHERE COALESCE(${alias}.resolved, FALSE) = $${values.length}`;
  }

  if (query.status === 'open') {
    values.push(false);
    return `WHERE COALESCE(${alias}.resolved, FALSE) = $${values.length}`;
  }

  return '';
};

const getAnalytics = asyncHandler(async (req, res) => {
  await ensureIssueStateTable();

  const { ctes, values } = buildAnalyticsCtes(req.query);
  const statusClause = getStatusClause(req.query, values, 'issue_state');

  const issueGroupsResult = await pool.query(
    `
      ${ctes}
      SELECT
        gi.*,
        COALESCE(issue_state.resolved, FALSE) AS resolved,
        issue_state.updated_at AS status_updated_at
      FROM grouped_issues gi
      LEFT JOIN issue_states issue_state ON issue_state.fingerprint = gi.fingerprint
      ${statusClause}
      ORDER BY gi.last_seen DESC
      LIMIT 100
    `,
    values
  );

  const errorsResult = await pool.query(
    `
      ${ctes}
      SELECT
        fe.*,
        COALESCE(issue_state.resolved, FALSE) AS resolved
      FROM filtered_errors fe
      LEFT JOIN issue_states issue_state ON issue_state.fingerprint = fe.fingerprint
      ${statusClause}
      ORDER BY fe.timestamp DESC
      LIMIT 50
    `,
    values
  );

  const slowValues = [];
  const slowWhere = [`l.response_time > 1000`];
  const interval = TIME_RANGE_TO_INTERVAL[req.query.time_range];

  if (interval) {
    slowWhere.push(`l.timestamp >= NOW() - INTERVAL '${interval}'`);
  }

  if (req.query.api_name) {
    slowValues.push(`%${req.query.api_name}%`);
    slowWhere.push(`l.api_name ILIKE $${slowValues.length}`);
  }

  if (req.query.trace_id) {
    slowValues.push(`%${req.query.trace_id}%`);
    slowWhere.push(`COALESCE(l.trace_id, '') ILIKE $${slowValues.length}`);
  }

  if (req.query.session_id) {
    slowValues.push(`%${req.query.session_id}%`);
    slowWhere.push(`COALESCE(l.session_id, '') ILIKE $${slowValues.length}`);
  }

  const slowApisResult = await pool.query(
    `
      SELECT *
      FROM logs l
      WHERE ${slowWhere.join(' AND ')}
      ORDER BY l.timestamp DESC
      LIMIT 50
    `,
    slowValues
  );

  const issueGroups = issueGroupsResult.rows;
  const summary = {
    total_groups: issueGroups.length,
    open_groups: issueGroups.filter((issue) => !issue.resolved).length,
    resolved_groups: issueGroups.filter((issue) => issue.resolved).length,
    total_errors: errorsResult.rows.length,
  };

  res.json({
    summary,
    slow_apis: slowApisResult.rows,
    errors: errorsResult.rows,
    issue_groups: issueGroups,
  });
});

const getIssueDetails = asyncHandler(async (req, res) => {
  await ensureIssueStateTable();

  const detailQuery = {
    ...req.query,
    trace_id: '',
  };

  const { ctes, values } = buildAnalyticsCtes(detailQuery);
  values.push(req.params.fingerprint);
  const fingerprintIndex = values.length;

  const issueResult = await pool.query(
    `
      ${ctes}
      SELECT
        gi.*,
        COALESCE(issue_state.resolved, FALSE) AS resolved,
        issue_state.updated_at AS status_updated_at
      FROM grouped_issues gi
      LEFT JOIN issue_states issue_state ON issue_state.fingerprint = gi.fingerprint
      WHERE gi.fingerprint = $${fingerprintIndex}
      LIMIT 1
    `,
    values
  );

  if (issueResult.rows.length === 0) {
    throw createHttpError(404, 'Issue group not found');
  }

  const occurrencesResult = await pool.query(
    `
      ${ctes}
      SELECT
        fe.*,
        COALESCE(issue_state.resolved, FALSE) AS resolved
      FROM filtered_errors fe
      LEFT JOIN issue_states issue_state ON issue_state.fingerprint = fe.fingerprint
      WHERE fe.fingerprint = $${fingerprintIndex}
      ORDER BY fe.timestamp DESC
      LIMIT 25
    `,
    values
  );

  const occurrences = occurrencesResult.rows;
  const selectedTraceId = req.query.related_trace_id || occurrences[0]?.trace_id || null;

  let relatedLogs = [];
  if (selectedTraceId) {
    const relatedLogsResult = await pool.query(
      `
        SELECT *
        FROM logs
        WHERE trace_id = $1
        ORDER BY timestamp ASC
        LIMIT 100
      `,
      [selectedTraceId]
    );

    relatedLogs = relatedLogsResult.rows;
  }

  res.json({
    issue: issueResult.rows[0],
    selected_trace_id: selectedTraceId,
    occurrences,
    related_logs: relatedLogs,
  });
});

const updateIssueStatus = asyncHandler(async (req, res) => {
  await ensureIssueStateTable();

  const { fingerprint } = req.params;
  const resolved = Boolean(req.body?.resolved);

  const result = await pool.query(
    `
      INSERT INTO issue_states (fingerprint, resolved, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (fingerprint)
      DO UPDATE SET resolved = EXCLUDED.resolved, updated_at = NOW()
      RETURNING *
    `,
    [fingerprint, resolved]
  );

  const io = req.app.get('io');
  if (io) {
    io.emit('issue-status-updated', {
      fingerprint,
      resolved,
    });
  }

  res.json({
    message: resolved ? 'Issue marked as resolved' : 'Issue reopened',
    issue_state: result.rows[0],
  });
});

module.exports = {
  getAnalytics,
  getIssueDetails,
  updateIssueStatus,
};
