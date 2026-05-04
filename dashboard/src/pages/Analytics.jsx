import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  AlertTriangle, Bug, Clock3, Filter, RefreshCw,
  Search, ShieldAlert, ShieldCheck, X, ChevronRight, GitBranch
} from 'lucide-react'
import { socket } from '../socket'

const API = 'http://localhost:5000'

const TIME_RANGES = [
  { id: '15m', label: 'Last 15 min' },
  { id: '1h', label: 'Last 1 hour' },
  { id: '24h', label: 'Last 24 hours' },
  { id: '7d', label: 'Last 7 days' },
]

const EMPTY_FILTERS = {
  time_range: '24h',
  q: '',
  error_type: '',
  api_name: '',
  trace_id: '',
  session_id: '',
  severity: '',
  status: '',
}

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '-')

const severityStyle = (severity) => {
  if (severity === 'Critical') return { color: 'var(--red)', bg: 'var(--red-dim)' }
  if (severity === 'High') return { color: 'var(--yellow)', bg: 'var(--yellow-dim)' }
  return { color: 'var(--blue)', bg: 'var(--blue-dim)' }
}

const buildParams = (filters, extra = {}) => {
  const merged = { ...filters, ...extra }
  return Object.fromEntries(
    Object.entries(merged).filter(([, value]) => value !== '' && value != null)
  )
}

export default function Analytics() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [spinning, setSpinning] = useState(false)
  const [details, setDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const fetchAnalytics = async () => {
    setSpinning(true)
    try {
      const response = await axios.get(`${API}/api/analytics`, {
        params: buildParams(filters),
      })
      setData(response.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
      setTimeout(() => setSpinning(false), 300)
    }
  }

  const fetchIssueDetails = async (fingerprint, traceId) => {
    setDetailsLoading(true)
    try {
      const response = await axios.get(`${API}/api/analytics/issues/${fingerprint}`, {
        params: buildParams(filters, { related_trace_id: traceId || '' }),
      })
      setDetails(response.data)
    } catch (error) {
      console.error(error)
    } finally {
      setDetailsLoading(false)
    }
  }

  const updateIssueStatus = async (fingerprint, resolved) => {
    try {
      await axios.put(`${API}/api/analytics/issues/${fingerprint}/status`, { resolved })
      await fetchAnalytics()

      if (details?.issue?.fingerprint === fingerprint) {
        await fetchIssueDetails(fingerprint, details.selected_trace_id)
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [filters])

  useEffect(() => {
    const refresh = async () => {
      await fetchAnalytics()
      if (details?.issue?.fingerprint) {
        await fetchIssueDetails(details.issue.fingerprint, details.selected_trace_id)
      }
    }

    socket.on('error-created', refresh)
    socket.on('issue-status-updated', refresh)
    socket.on('log-created', refresh)

    return () => {
      socket.off('error-created', refresh)
      socket.off('issue-status-updated', refresh)
      socket.off('log-created', refresh)
    }
  }, [details?.issue?.fingerprint, details?.selected_trace_id, filters])

  const errorTypeOptions = useMemo(() => {
    const options = new Set()
    ;(data?.issue_groups || []).forEach((issue) => options.add(issue.error_type))
    ;(data?.errors || []).forEach((error) => options.add(error.error_type))
    return [...options].filter(Boolean).sort()
  }, [data])

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Loading issue center...</span>
      </div>
    )
  }

  return (
    <>
      <div style={{ padding: '32px' }}>
        <div className="page-header">
          <div>
            <h2 className="page-title">Crash And Error Center</h2>
            <p className="page-sub">Grouped issues, realtime filters, and trace-level crash analysis</p>
          </div>
          <button className="btn btn-ghost" onClick={fetchAnalytics} disabled={spinning}>
            <RefreshCw size={14} style={{ transition: 'transform 0.5s', transform: spinning ? 'rotate(360deg)' : 'none' }} />
            Refresh
          </button>
        </div>

        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
          {[
            { label: 'Issue Groups', value: data?.summary?.total_groups ?? 0, Icon: Bug, color: 'var(--blue)', bg: 'var(--blue-dim)' },
            { label: 'Open Issues', value: data?.summary?.open_groups ?? 0, Icon: ShieldAlert, color: 'var(--red)', bg: 'var(--red-dim)' },
            { label: 'Resolved', value: data?.summary?.resolved_groups ?? 0, Icon: ShieldCheck, color: 'var(--green)', bg: 'var(--green-dim)' },
            { label: 'Filtered Errors', value: data?.summary?.total_errors ?? 0, Icon: AlertTriangle, color: 'var(--yellow)', bg: 'var(--yellow-dim)' },
          ].map(({ label, value, Icon, color, bg }) => (
            <div className="stat-card" key={label}>
              <div className="stat-card-top">
                <span className="stat-label">{label}</span>
                <div className="stat-icon" style={{ background: bg }}>
                  <Icon size={15} color={color} strokeWidth={2} />
                </div>
              </div>
              <div className="stat-value" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="panel-title">
            <div className="panel-icon" style={{ background: 'var(--blue-dim)' }}>
              <Filter size={14} color="var(--blue)" />
            </div>
            Filters
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {TIME_RANGES.map((range) => (
              <button
                key={range.id}
                className={`btn ${filters.time_range === range.id ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilters((current) => ({ ...current, time_range: range.id }))}
              >
                <Clock3 size={13} />
                {range.label}
              </button>
            ))}
          </div>

          <div className="filter-grid">
            <div>
              <label className="stat-label" style={{ display: 'block', marginBottom: 6 }}>Search</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                <input
                  className="input"
                  value={filters.q}
                  placeholder="message, trace, session, fingerprint..."
                  onChange={(e) => setFilters((current) => ({ ...current, q: e.target.value }))}
                  style={{ width: '100%', paddingLeft: 32 }}
                />
              </div>
            </div>

            <div>
              <label className="stat-label" style={{ display: 'block', marginBottom: 6 }}>Error Type</label>
              <select
                className="input"
                value={filters.error_type}
                onChange={(e) => setFilters((current) => ({ ...current, error_type: e.target.value }))}
                style={{ width: '100%' }}
              >
                <option value="">All error types</option>
                {errorTypeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="stat-label" style={{ display: 'block', marginBottom: 6 }}>API Name</label>
              <input
                className="input"
                value={filters.api_name}
                placeholder="GET /api/demo/error"
                onChange={(e) => setFilters((current) => ({ ...current, api_name: e.target.value }))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label className="stat-label" style={{ display: 'block', marginBottom: 6 }}>Trace ID</label>
              <input
                className="input"
                value={filters.trace_id}
                placeholder="Search trace"
                onChange={(e) => setFilters((current) => ({ ...current, trace_id: e.target.value }))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label className="stat-label" style={{ display: 'block', marginBottom: 6 }}>Session ID</label>
              <input
                className="input"
                value={filters.session_id}
                placeholder="Search session"
                onChange={(e) => setFilters((current) => ({ ...current, session_id: e.target.value }))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label className="stat-label" style={{ display: 'block', marginBottom: 6 }}>Severity</label>
              <select
                className="input"
                value={filters.severity}
                onChange={(e) => setFilters((current) => ({ ...current, severity: e.target.value }))}
                style={{ width: '100%' }}
              >
                <option value="">All severities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
              </select>
            </div>

            <div>
              <label className="stat-label" style={{ display: 'block', marginBottom: 6 }}>Status</label>
              <select
                className="input"
                value={filters.status}
                onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))}
                style={{ width: '100%' }}
              >
                <option value="">Open + resolved</option>
                <option value="open">Open only</option>
                <option value="resolved">Resolved only</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'end' }}>
              <button className="btn btn-ghost" onClick={() => setFilters(EMPTY_FILTERS)}>
                <X size={13} />
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            <div className="panel-icon" style={{ background: 'var(--red-dim)' }}>
              <Bug size={14} color="var(--red)" />
            </div>
            Grouped Issues
          </div>

          {(data?.issue_groups || []).length === 0 ? (
            <div className="empty">
              <div className="empty-icon"><Bug size={20} /></div>
              <p>No issue groups match the current filters.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Issue</th><th>API</th><th>Severity</th><th>Count</th><th>First Seen</th><th>Last Seen</th>
                    <th>Sessions</th><th>Devices</th><th>Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.issue_groups.map((issue) => {
                    const sev = severityStyle(issue.severity)
                    return (
                      <tr key={issue.fingerprint}>
                        <td style={{ maxWidth: 280 }}>
                          <button
                            className="btn btn-ghost"
                            onClick={() => fetchIssueDetails(issue.fingerprint)}
                            style={{ padding: '6px 10px', width: '100%', justifyContent: 'space-between' }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {issue.top_stack_frame || issue.latest_error_message}
                            </span>
                            <ChevronRight size={13} />
                          </button>
                        </td>
                        <td style={{ color: 'var(--blue)', fontWeight: 600 }}>{issue.api_name || '-'}</td>
                        <td>
                          <span className="badge" style={{ background: sev.bg, color: sev.color }}>
                            {issue.severity}
                          </span>
                        </td>
                        <td className="mono">{issue.occurrences}</td>
                        <td className="mono">{formatDateTime(issue.first_seen)}</td>
                        <td className="mono">{formatDateTime(issue.last_seen)}</td>
                        <td className="mono">{issue.affected_sessions}</td>
                        <td className="mono">{issue.affected_devices}</td>
                        <td>
                          <span className="badge" style={{
                            background: issue.resolved ? 'var(--green-dim)' : 'var(--red-dim)',
                            color: issue.resolved ? 'var(--green)' : 'var(--red)',
                          }}>
                            {issue.resolved ? 'Resolved' : 'Open'}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`btn ${issue.resolved ? 'btn-ghost' : 'btn-success'}`}
                            onClick={() => updateIssueStatus(issue.fingerprint, !issue.resolved)}
                          >
                            {issue.resolved ? 'Reopen' : 'Resolve'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-title">
            <div className="panel-icon" style={{ background: 'var(--yellow-dim)' }}>
              <AlertTriangle size={14} color="var(--yellow)" />
            </div>
            Recent Error Occurrences
          </div>

          {(data?.errors || []).length === 0 ? (
            <div className="empty">
              <div className="empty-icon"><AlertTriangle size={20} /></div>
              <p>No recent occurrences match the current filters.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th><th>API</th><th>Error Type</th><th>Trace</th><th>Session</th><th>Status</th><th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {data.errors.map((error, index) => (
                    <tr key={`${error.fingerprint}-${index}`}>
                      <td className="mono">{formatDateTime(error.timestamp)}</td>
                      <td style={{ color: 'var(--blue)', fontWeight: 600 }}>{error.api_name}</td>
                      <td className="mono">{error.error_type || '-'}</td>
                      <td className="mono" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {error.trace_id || '-'}
                      </td>
                      <td className="mono" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {error.session_id || '-'}
                      </td>
                      <td>
                        <span className="badge" style={{
                          background: error.resolved ? 'var(--green-dim)' : 'var(--red-dim)',
                          color: error.resolved ? 'var(--green)' : 'var(--red)',
                        }}>
                          {error.resolved ? 'Resolved' : 'Open'}
                        </span>
                      </td>
                      <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text2)' }}>
                        {error.error_message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {(details || detailsLoading) && (
        <div className="drawer-backdrop" onClick={() => !detailsLoading && setDetails(null)}>
          <aside className="drawer" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <div className="page-title" style={{ fontSize: 18 }}>
                  {details?.issue?.top_stack_frame || 'Loading issue...'}
                </div>
                <div className="page-sub">
                  {details?.issue?.fingerprint || 'Fetching issue details'}
                </div>
              </div>
              <button className="btn btn-ghost" onClick={() => setDetails(null)}>
                <X size={14} />
                Close
              </button>
            </div>

            {detailsLoading || !details ? (
              <div className="loading-screen" style={{ height: '100%', minHeight: 240 }}>
                <div className="spinner" />
                <span>Loading issue details...</span>
              </div>
            ) : (
              <div className="drawer-body">
                <div className="detail-grid">
                  <div className="panel" style={{ marginBottom: 0 }}>
                    <div className="panel-title">Issue Summary</div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div><span className="stat-label">API</span><div>{details.issue.api_name || '-'}</div></div>
                      <div><span className="stat-label">Error Type</span><div>{details.issue.error_type || '-'}</div></div>
                      <div><span className="stat-label">Severity</span><div>{details.issue.severity || '-'}</div></div>
                      <div><span className="stat-label">Occurrences</span><div>{details.issue.occurrences}</div></div>
                      <div><span className="stat-label">Status</span><div>{details.issue.resolved ? 'Resolved' : 'Open'}</div></div>
                      <div><span className="stat-label">First Seen</span><div>{formatDateTime(details.issue.first_seen)}</div></div>
                      <div><span className="stat-label">Last Seen</span><div>{formatDateTime(details.issue.last_seen)}</div></div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                        <button
                          className={`btn ${details.issue.resolved ? 'btn-ghost' : 'btn-success'}`}
                          onClick={() => updateIssueStatus(details.issue.fingerprint, !details.issue.resolved)}
                        >
                          {details.issue.resolved ? 'Reopen Issue' : 'Resolve Issue'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="panel" style={{ marginBottom: 0 }}>
                    <div className="panel-title">Occurrences</div>
                    <div className="detail-list">
                      {details.occurrences.map((occurrence, index) => {
                        const active = details.selected_trace_id === occurrence.trace_id
                        return (
                          <button
                            key={`${occurrence.trace_id}-${index}`}
                            className={`detail-list-item ${active ? 'detail-list-item--active' : ''}`}
                            onClick={() => fetchIssueDetails(details.issue.fingerprint, occurrence.trace_id)}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                              <span className="mono">{formatDateTime(occurrence.timestamp)}</span>
                              <span className="badge" style={{
                                background: active ? 'var(--blue-dim)' : 'var(--surface2)',
                                color: active ? 'var(--blue)' : 'var(--text2)',
                              }}>
                                <GitBranch size={10} />
                                {occurrence.trace_id || 'No trace'}
                              </span>
                            </div>
                            <div style={{ color: 'var(--text2)', textAlign: 'left', marginTop: 6 }}>
                              Session: {occurrence.session_id || '-'}
                            </div>
                            <div style={{ color: 'var(--text3)', textAlign: 'left', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {occurrence.error_message}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-title">Selected Occurrence Details</div>
                  {details.occurrences.length === 0 ? (
                    <div className="empty">
                      <div className="empty-icon"><AlertTriangle size={20} /></div>
                      <p>No occurrences available for this issue.</p>
                    </div>
                  ) : (
                    (() => {
                      const activeOccurrence = details.occurrences.find((occurrence) => occurrence.trace_id === details.selected_trace_id) || details.occurrences[0]
                      return (
                        <div className="detail-grid">
                          <div>
                            <div><span className="stat-label">Exact Timestamp</span><div>{formatDateTime(activeOccurrence.timestamp)}</div></div>
                            <div style={{ marginTop: 12 }}><span className="stat-label">Device Info</span><div>{activeOccurrence.device_info || '-'}</div></div>
                            <div style={{ marginTop: 12 }}><span className="stat-label">Session ID</span><div className="mono">{activeOccurrence.session_id || '-'}</div></div>
                            <div style={{ marginTop: 12 }}><span className="stat-label">Trace ID</span><div className="mono">{activeOccurrence.trace_id || '-'}</div></div>
                          </div>
                          <div>
                            <div><span className="stat-label">Full Stack Trace</span></div>
                            <pre className="stack-trace-box">{activeOccurrence.stack_trace || activeOccurrence.error_message || '-'}</pre>
                          </div>
                        </div>
                      )
                    })()
                  )}
                </div>

                <div className="panel">
                  <div className="panel-title">Related Logs For Selected Trace</div>
                  {(details.related_logs || []).length === 0 ? (
                    <div className="empty">
                      <div className="empty-icon"><GitBranch size={20} /></div>
                      <p>No related logs were found for the selected trace.</p>
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Timestamp</th><th>API</th><th>Status</th><th>Response</th><th>Session</th><th>Device</th><th>Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {details.related_logs.map((log, index) => (
                            <tr key={log.id || index}>
                              <td className="mono">{formatDateTime(log.timestamp)}</td>
                              <td style={{ color: 'var(--blue)', fontWeight: 600 }}>{log.api_name}</td>
                              <td className="mono">{log.status_code ?? '-'}</td>
                              <td className="mono">{log.response_time != null ? `${log.response_time}ms` : '-'}</td>
                              <td className="mono">{log.session_id ?? '-'}</td>
                              <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.device_info ?? '-'}</td>
                              <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.error_message ?? '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  )
}
