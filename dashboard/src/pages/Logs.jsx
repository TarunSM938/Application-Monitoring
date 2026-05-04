import { useState, useEffect } from 'react'
import axios from 'axios'
import { RefreshCw, Download, Search, ScrollText, CheckCircle, AlertTriangle, XCircle, Clock, GitBranch } from 'lucide-react'
import { socket } from '../socket'

const API = 'http://localhost:5000'

const getStatus = (log) => {
  if (log.error_message) {
    if (log.error_type === 'TIMEOUT') return { label: 'Timeout', color: 'var(--yellow)', bg: 'var(--yellow-dim)', Icon: Clock }
    if (log.error_type === 'BAD_RESPONSE') return { label: 'Bad JSON', color: 'var(--purple)', bg: '#2d1f4d', Icon: AlertTriangle }
    return { label: 'Error', color: 'var(--red)', bg: 'var(--red-dim)', Icon: XCircle }
  }
  if (log.response_time > 3000) return { label: 'Critical', color: 'var(--red)', bg: 'var(--red-dim)', Icon: AlertTriangle }
  if (log.response_time > 1000) return { label: 'Slow', color: 'var(--yellow)', bg: 'var(--yellow-dim)', Icon: Clock }
  return { label: 'OK', color: 'var(--green)', bg: 'var(--green-dim)', Icon: CheckCircle }
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'ok', label: 'OK' },
  { id: 'slow', label: 'Slow' },
  { id: 'error', label: 'Errors' },
]

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [spinning, setSpinning] = useState(false)
  const [search, setSearch] = useState('')
  const [statusF, setStatusF] = useState('all')

  const fetchLogs = async () => {
    setSpinning(true)
    try {
      const r = await axios.get(`${API}/api/logs`)
      setLogs(r.data.logs || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setTimeout(() => setSpinning(false), 400)
    }
  }

  useEffect(() => {
    fetchLogs()
    const t = setInterval(fetchLogs, 30000)
    const refresh = () => fetchLogs()

    socket.on('log-created', refresh)
    socket.on('error-created', refresh)

    return () => {
      clearInterval(t)
      socket.off('log-created', refresh)
      socket.off('error-created', refresh)
    }
  }, [])

  const filtered = logs.filter((log) => {
    const term = search.toLowerCase()
    const textMatch =
      search === '' ||
      (log.api_name || '').toLowerCase().includes(term) ||
      (log.trace_id || '').toLowerCase().includes(term) ||
      (log.error_type || '').toLowerCase().includes(term)

    const statusMatch =
      statusF === 'error' ? !!log.error_message
        : statusF === 'slow' ? (log.response_time > 1000 && !log.error_message)
          : statusF === 'ok' ? (!log.error_message && log.response_time <= 1000)
            : true

    return textMatch && statusMatch
  })

  const exportCSV = () => {
    const headers = ['ID', 'Timestamp', 'API Name', 'Trace ID', 'Response Time (ms)', 'Status Code', 'Session ID', 'Device Info', 'Error Type', 'Error Message']
    const rows = filtered.map((log) => [
      log.id,
      log.timestamp,
      log.api_name,
      log.trace_id ?? '',
      log.response_time ?? '',
      log.status_code ?? '',
      log.session_id ?? '',
      log.device_info ?? '',
      log.error_type ?? '',
      log.error_message ?? '',
    ])

    const csv = [headers, ...rows].map((row) => row.map((value) => `"${value}"`).join(',')).join('\n')
    const anchor = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `logs_${Date.now()}.csv`,
    })
    anchor.click()
  }

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <span>Fetching logs...</span>
    </div>
  )

  return (
    <div style={{ padding: '32px' }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">API Logs</h2>
          <p className="page-sub">{filtered.length} of {logs.length} records shown</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={fetchLogs} disabled={spinning}>
            <RefreshCw size={14} style={{ transition: 'transform 0.5s', transform: spinning ? 'rotate(360deg)' : 'none' }} />
            Refresh
          </button>
          <button className="btn btn-primary" onClick={exportCSV}>
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            className="input"
            placeholder="Search API name, trace ID, or error type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 32, width: 280 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              className={`btn ${statusF === filter.id ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '7px 14px' }}
              onClick={() => setStatusF(filter.id)}
            >
              {filter.id === 'ok' && <CheckCircle size={13} />}
              {filter.id === 'slow' && <Clock size={13} />}
              {filter.id === 'error' && <XCircle size={13} />}
              {filter.id === 'all' && <ScrollText size={13} />}
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Timestamp</th><th>API Name</th><th>Trace</th>
              <th>Response</th><th>Status Code</th><th>Session</th><th>Device</th><th>State</th><th>Error Type</th><th>Error</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11}>
                  <div className="empty">
                    <div className="empty-icon"><ScrollText size={20} /></div>
                    <p>No logs found. Make API calls from the Flutter app.</p>
                  </div>
                </td>
              </tr>
            ) : filtered.map((log, i) => {
              const status = getStatus(log)
              return (
                <tr key={log.id || i}>
                  <td className="mono" style={{ color: 'var(--text3)' }}>#{log.id}</td>
                  <td className="mono" style={{ color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
                  </td>
                  <td style={{ color: 'var(--blue)', fontWeight: 600 }}>{log.api_name}</td>
                  <td className="mono" style={{ color: 'var(--text2)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <GitBranch size={12} />
                      {log.trace_id ?? '-'}
                    </span>
                  </td>
                  <td className="mono" style={{ color: log.response_time > 1000 ? 'var(--yellow)' : 'var(--green)', fontWeight: 600 }}>
                    {log.response_time != null ? `${log.response_time}ms` : '-'}
                  </td>
                  <td className="mono" style={{ color: 'var(--text2)' }}>{log.status_code ?? '-'}</td>
                  <td className="mono" style={{ color: 'var(--text2)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.session_id ?? '-'}
                  </td>
                  <td style={{ color: 'var(--text2)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {log.device_info ?? '-'}
                  </td>
                  <td>
                    <span className="badge" style={{ background: status.bg, color: status.color }}>
                      <status.Icon size={10} strokeWidth={2.5} />
                      {status.label}
                    </span>
                  </td>
                  <td className="mono" style={{ color: 'var(--text2)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.error_type ?? '-'}
                  </td>
                  <td style={{ color: 'var(--red)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {log.error_message ?? '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
