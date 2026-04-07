import { useEffect, useState } from 'react'
import axios from 'axios'
import { GitBranch, Search, RefreshCw, Clock, Activity } from 'lucide-react'
import { socket } from '../socket'

const API = 'http://localhost:5000'

const formatTime = (value) => value ? new Date(value).toLocaleString() : '—'

export default function Traces() {
  const [traceId, setTraceId] = useState('')
  const [selectedTrace, setSelectedTrace] = useState('')
  const [traceLogs, setTraceLogs] = useState([])
  const [recentTraces, setRecentTraces] = useState([])
  const [loading, setLoading] = useState(true)
  const [spinning, setSpinning] = useState(false)

  const fetchRecentTraces = async () => {
    try {
      const r = await axios.get(`${API}/api/logs?limit=50`)
      const recent = []
      const seen = new Set()

      ;(r.data.logs || []).forEach((log) => {
        if (!log.trace_id || seen.has(log.trace_id)) return
        seen.add(log.trace_id)
        recent.push(log)
      })

      setRecentTraces(recent)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchTrace = async (id) => {
    if (!id) {
      setTraceLogs([])
      return
    }

    setSpinning(true)
    try {
      const r = await axios.get(`${API}/api/logs/trace/${id}`)
      setTraceLogs(r.data.logs || [])
    } catch (e) {
      console.error(e)
      setTraceLogs([])
    } finally {
      setLoading(false)
      setTimeout(() => setSpinning(false), 400)
    }
  }

  useEffect(() => {
    const initialize = async () => {
      await fetchRecentTraces()
      setLoading(false)
    }

    initialize()
    const refresh = async () => {
      await fetchRecentTraces()
      if (selectedTrace) {
        await fetchTrace(selectedTrace)
      }
    }

    socket.on('log-created', refresh)

    return () => {
      socket.off('log-created', refresh)
    }
  }, [selectedTrace])

  const handleSearch = async (id = traceId) => {
    const normalized = id.trim()
    setSelectedTrace(normalized)
    setTraceId(normalized)
    await fetchTrace(normalized)
  }

  return (
    <div style={{ padding: '32px' }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Trace Explorer</h2>
          <p className="page-sub">Inspect all log events that belong to one request flow</p>
        </div>
        <button className="btn btn-ghost" onClick={() => handleSearch(selectedTrace)} disabled={spinning || !selectedTrace}>
          <RefreshCw size={14} style={{ transition: 'transform 0.5s', transform: spinning ? 'rotate(360deg)' : 'none' }} />
          Refresh
        </button>
      </div>

      <div className="panel">
        <div className="panel-title">
          <div className="panel-icon" style={{ background: 'var(--blue-dim)' }}>
            <Search size={14} color="var(--blue)" />
          </div>
          Find Trace
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            className="input"
            placeholder="Paste a trace ID..."
            value={traceId}
            onChange={(e) => setTraceId(e.target.value)}
            style={{ flex: '1 1 320px' }}
          />
          <button className="btn btn-primary" onClick={() => handleSearch()} disabled={!traceId.trim()}>
            <GitBranch size={14} />
            Load Trace
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <div className="panel-icon" style={{ background: 'var(--yellow-dim)' }}>
            <Clock size={14} color="var(--yellow)" />
          </div>
          Recent Traces
        </div>
        {recentTraces.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><GitBranch size={20} /></div>
            <p>No recent traces found yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentTraces.slice(0, 8).map((log) => (
              <button
                key={log.id}
                className="btn btn-ghost"
                onClick={() => handleSearch(log.trace_id)}
                style={{ justifyContent: 'space-between', padding: '12px 14px' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <GitBranch size={14} />
                  <span className="mono" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 }}>
                    {log.trace_id}
                  </span>
                </span>
                <span style={{ color: 'var(--text3)', fontSize: 12 }}>{log.api_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-title">
          <div className="panel-icon" style={{ background: 'var(--green-dim)' }}>
            <Activity size={14} color="var(--green)" />
          </div>
          {selectedTrace ? `Trace Timeline: ${selectedTrace}` : 'Trace Timeline'}
        </div>
        {loading ? (
          <div className="loading-screen">
            <div className="spinner" />
            <span>Loading traces...</span>
          </div>
        ) : traceLogs.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><Activity size={20} /></div>
            <p>{selectedTrace ? 'No logs found for this trace ID.' : 'Select a recent trace or search by trace ID.'}</p>
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
                {traceLogs.map((log, index) => (
                  <tr key={log.id || index}>
                    <td className="mono" style={{ color: 'var(--text3)', whiteSpace: 'nowrap' }}>{formatTime(log.timestamp)}</td>
                    <td style={{ color: 'var(--blue)', fontWeight: 600 }}>{log.api_name}</td>
                    <td className="mono" style={{ color: 'var(--text2)' }}>{log.status_code ?? '—'}</td>
                    <td className="mono" style={{ color: log.response_time > 1000 ? 'var(--yellow)' : 'var(--green)' }}>
                      {log.response_time != null ? `${log.response_time}ms` : '—'}
                    </td>
                    <td className="mono" style={{ color: 'var(--text2)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.session_id ?? '—'}</td>
                    <td style={{ color: 'var(--text2)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.device_info ?? '—'}</td>
                    <td style={{ color: 'var(--red)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.error_message ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
