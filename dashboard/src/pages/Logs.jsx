import { useState, useEffect } from 'react'
import axios from 'axios'
import { RefreshCw, Download, Search, ScrollText, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react'

const API = 'http://localhost:5000'

const getStatus = (log) => {
  if (log.error_message)        return { label: 'Error',  color: 'var(--red)',    bg: 'var(--red-dim)',    Icon: XCircle }
  if (log.response_time > 3000) return { label: 'Critical',color: 'var(--red)',   bg: 'var(--red-dim)',    Icon: AlertTriangle }
  if (log.response_time > 1000) return { label: 'Slow',   color: 'var(--yellow)', bg: 'var(--yellow-dim)', Icon: Clock }
  return                               { label: 'OK',     color: 'var(--green)',  bg: 'var(--green-dim)', Icon: CheckCircle }
}

const FILTERS = [
  { id: 'all',   label: 'All' },
  { id: 'ok',    label: 'OK' },
  { id: 'slow',  label: 'Slow' },
  { id: 'error', label: 'Errors' },
]

export default function Logs() {
  const [logs, setLogs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [spinning, setSpinning] = useState(false)
  const [search, setSearch]     = useState('')
  const [statusF, setStatusF]   = useState('all')

  const fetchLogs = async () => {
    setSpinning(true)
    try { const r = await axios.get(`${API}/api/logs`); setLogs(r.data.logs || []) }
    catch (e) { console.error(e) }
    finally { setLoading(false); setTimeout(() => setSpinning(false), 400) }
  }

  useEffect(() => { fetchLogs(); const t = setInterval(fetchLogs, 30000); return () => clearInterval(t) }, [])

  const filtered = logs.filter(l => {
    const txt = search === '' || (l.api_name || '').toLowerCase().includes(search.toLowerCase())
    const st  =
      statusF === 'error' ? !!l.error_message :
      statusF === 'slow'  ? (l.response_time > 1000 && !l.error_message) :
      statusF === 'ok'    ? (!l.error_message && l.response_time <= 1000) : true
    return txt && st
  })

  const exportCSV = () => {
    const hdr  = ['ID', 'Timestamp', 'API Name', 'Response Time (ms)', 'Status Code', 'Error Message']
    const rows = filtered.map(l => [l.id, l.timestamp, l.api_name, l.response_time ?? '', l.status_code ?? '', l.error_message ?? ''])
    const csv  = [hdr, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const a    = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `logs_${Date.now()}.csv` })
    a.click()
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

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            className="input"
            placeholder="Search API name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32, width: 220 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map(f => (
            <button
              key={f.id}
              className={`btn ${statusF === f.id ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '7px 14px' }}
              onClick={() => setStatusF(f.id)}
            >
              {f.id === 'ok'    && <CheckCircle  size={13} />}
              {f.id === 'slow'  && <Clock        size={13} />}
              {f.id === 'error' && <XCircle      size={13} />}
              {f.id === 'all'   && <ScrollText   size={13} />}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Timestamp</th><th>API Name</th>
              <th>Response</th><th>Status Code</th><th>State</th><th>Error</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty">
                    <div className="empty-icon"><ScrollText size={20} /></div>
                    <p>No logs found. Make API calls from the Flutter app.</p>
                  </div>
                </td>
              </tr>
            ) : filtered.map((log, i) => {
              const s = getStatus(log)
              return (
                <tr key={log.id || i}>
                  <td className="mono" style={{ color: 'var(--text3)' }}>#{log.id}</td>
                  <td className="mono" style={{ color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                  </td>
                  <td style={{ color: 'var(--blue)', fontWeight: 600 }}>{log.api_name}</td>
                  <td className="mono" style={{ color: log.response_time > 1000 ? 'var(--yellow)' : 'var(--green)', fontWeight: 600 }}>
                    {log.response_time != null ? `${log.response_time}ms` : '—'}
                  </td>
                  <td className="mono" style={{ color: 'var(--text2)' }}>{log.status_code ?? '—'}</td>
                  <td>
                    <span className="badge" style={{ background: s.bg, color: s.color }}>
                      <s.Icon size={10} strokeWidth={2.5} />
                      {s.label}
                    </span>
                  </td>
                  <td style={{ color: 'var(--red)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {log.error_message ?? <span style={{ color: 'var(--text3)' }}>—</span>}
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