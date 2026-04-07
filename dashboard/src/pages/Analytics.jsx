import { useState, useEffect } from 'react'
import axios from 'axios'
import { Gauge, Bug, Radio, AlertTriangle, TrendingUp, Shield } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { socket } from '../socket'

const API = 'http://localhost:5000'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tip">
      <div style={{ color: 'var(--text2)', marginBottom: 4, fontSize: 11 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.fill || 'var(--text)', fontWeight: 700 }}>
          {p.name === 'avgTime' ? `${p.value}ms` : `${p.value} errors`}
        </div>
      ))}
    </div>
  )
}

const classifyError = (msg = '') => {
  const m = msg.toLowerCase()
  if (m.includes('500') || m.includes('server')) return { label: 'Server Error', color: 'var(--red)', bg: 'var(--red-dim)' }
  if (m.includes('404')) return { label: 'Not Found', color: 'var(--yellow)', bg: 'var(--yellow-dim)' }
  if (m.includes('timeout') || m.includes('network')) return { label: 'Network Error', color: 'var(--purple)', bg: '#2d1f4d' }
  if (m.includes('simulated') || m.includes('failure')) return { label: 'Simulated Failure', color: 'var(--blue)', bg: 'var(--blue-dim)' }
  return { label: 'Client Error', color: 'var(--yellow)', bg: 'var(--yellow-dim)' }
}

export default function Analytics() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = async () => {
    try {
      const r = await axios.get(`${API}/api/analytics`)
      setData(r.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
    const t = setInterval(fetchAnalytics, 30000)
    const refresh = () => fetchAnalytics()

    socket.on('log-created', refresh)

    return () => {
      clearInterval(t)
      socket.off('log-created', refresh)
    }
  }, [])


  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <span>Loading analytics...</span>
    </div>
  )

  // Group slow APIs
  const slowMap = {}
  ;(data?.slow_apis || []).forEach(l => {
    const n = l.api_name || 'Unknown'
    if (!slowMap[n]) slowMap[n] = { name: n, count: 0, total: 0 }
    slowMap[n].count++; slowMap[n].total += l.response_time || 0
  })
  const slowChart = Object.values(slowMap).map(d => ({ name: d.name, avgTime: Math.round(d.total / d.count), count: d.count }))

  // Group errors by api
  const errMap = {}
  ;(data?.errors || []).forEach(e => {
    const n = e.api_name || 'Unknown'
    if (!errMap[n]) errMap[n] = { name: n, count: 0 }
    errMap[n].count++
  })
  const errChart = Object.values(errMap)

  const ERR_COLORS = ['var(--red)', 'var(--yellow)', 'var(--blue)', 'var(--purple)', 'var(--green)']

  return (
    <div style={{ padding: '32px' }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Analytics</h2>
          <p className="page-sub">Performance breakdown and error analysis</p>
        </div>
      </div>

      {/* Summary */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 28 }}>
        {[
          { label: 'Slow API Events', value: data?.slow_apis?.length ?? 0, Icon: Gauge, color: 'var(--yellow)', bg: 'var(--yellow-dim)' },
          { label: 'Total Errors', value: data?.total_errors ?? 0, Icon: Bug, color: 'var(--red)', bg: 'var(--red-dim)' },
          { label: 'APIs Affected', value: Object.keys(slowMap).length, Icon: Radio, color: 'var(--blue)', bg: 'var(--blue-dim)' },
        ].map(({ label, value, Icon, color, bg }) => (
          <div className="stat-card" key={label}>
            <div className="stat-card-top">
              <span className="stat-label">{label}</span>
              <div className="stat-icon" style={{ background: bg }}><Icon size={15} color={color} strokeWidth={2} /></div>
            </div>
            <div className="stat-value" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Slow APIs Chart */}
      <div className="panel">
        <div className="panel-title">
          <div className="panel-icon" style={{ background: 'var(--yellow-dim)' }}>
            <TrendingUp size={14} color="var(--yellow)" />
          </div>
          Slow APIs — Average Response Time
        </div>
        {slowChart.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><TrendingUp size={20} /></div>
            <p>No slow API events recorded yet.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={slowChart} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text3)" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text3)" tick={{ fontSize: 11, fontFamily: 'var(--mono)' }} tickLine={false} axisLine={false} unit="ms" width={60} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface2)' }} />
              <Bar dataKey="avgTime" radius={[5, 5, 0, 0]} fill="var(--yellow)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Errors by API Chart */}
      <div className="panel">
        <div className="panel-title">
          <div className="panel-icon" style={{ background: 'var(--red-dim)' }}>
            <Bug size={14} color="var(--red)" />
          </div>
          Error Count by API
        </div>
        {errChart.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><Bug size={20} /></div>
            <p>No errors logged yet.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={errChart} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text3)" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text3)" tick={{ fontSize: 11, fontFamily: 'var(--mono)' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface2)' }} />
              <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                {errChart.map((_, i) => <Cell key={i} fill={ERR_COLORS[i % ERR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* RCA Error Table */}
      <div className="panel">
        <div className="panel-title">
          <div className="panel-icon" style={{ background: 'var(--blue-dim)' }}>
            <Shield size={14} color="var(--blue)" />
          </div>
          Root Cause Analysis — Recent Errors
        </div>
        {(data?.errors || []).length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><Shield size={20} /></div>
            <p>No errors to analyze.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th><th>API</th><th>Error Type</th>
                  <th>Message</th><th>Classification</th>
                </tr>
              </thead>
              <tbody>
                {(data?.errors || []).slice(0, 15).map((err, i) => {
                  const cls = classifyError(err.error_message)
                  return (
                    <tr key={i}>
                      <td className="mono" style={{ color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                        {err.timestamp ? new Date(err.timestamp).toLocaleString() : '—'}
                      </td>
                      <td style={{ color: 'var(--blue)', fontWeight: 600 }}>{err.api_name}</td>
                      <td style={{ color: 'var(--text2)' }}>{err.error_type || 'API_ERROR'}</td>
                      <td style={{ color: 'var(--red)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {err.error_message || '—'}
                      </td>
                      <td>
                        <span className="badge" style={{ background: cls.bg, color: cls.color }}>
                          <AlertTriangle size={10} />
                          {cls.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
