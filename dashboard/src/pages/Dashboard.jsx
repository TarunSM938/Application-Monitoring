import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Activity, Clock, XCircle, TrendingDown, Bell,
  RefreshCw, Wifi, CheckCircle, AlertTriangle
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { socket } from '../socket'

const API = 'http://localhost:5000'

function StatCard({ label, value, sub, subOk, color, bg, Icon }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        <div className="stat-icon" style={{ background: bg }}>
          <Icon size={15} color={color} strokeWidth={2.2} />
        </div>
      </div>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-sub">
        {subOk
          ? <CheckCircle size={12} color="var(--green)" />
          : <AlertTriangle size={12} color="var(--yellow)" />}
        {sub}
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tip">
      <div style={{ color: 'var(--text2)', marginBottom: 4, fontSize: 11 }}>{label}</div>
      <div style={{ color: 'var(--blue)', fontWeight: 700 }}>{payload[0].value}ms</div>
    </div>
  )
}

export default function Dashboard() {
  const [metrics, setMetrics]   = useState(null)
  const [logs, setLogs]         = useState([])
  const [alerts, setAlerts]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [updated, setUpdated]   = useState('')
  const [spinning, setSpinning] = useState(false)

  const fetchAll = async () => {
    setSpinning(true)
    try {
      const [m, l, a] = await Promise.all([
        axios.get(`${API}/api/metrics`),
        axios.get(`${API}/api/logs`),
        axios.get(`${API}/api/alerts`),
      ])
      setMetrics(m.data)
      setLogs(l.data.logs || [])
      setAlerts((a.data.alerts || []).filter(x => !x.resolved))
      setUpdated(new Date().toLocaleTimeString())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setTimeout(() => setSpinning(false), 500)
    }
  }

  useEffect(() => {
  fetchAll();
  const t = setInterval(fetchAll, 30000);
  const refresh = () => fetchAll();

  socket.on('log-created', refresh);
  socket.on('alert-created', refresh);
  socket.on('alert-resolved', refresh);

  return () => {
    clearInterval(t);
    socket.off('log-created', refresh);
    socket.off('alert-created', refresh);
    socket.off('alert-resolved', refresh);
  };
}, []);


  const chartData = [...logs].reverse().slice(-20).map((l, i) => ({
    name: i + 1,
    time: l.timestamp ? new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    responseTime: l.response_time || 0,
  }))

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <span>Connecting to monitoring server...</span>
    </div>
  )

  const avgMs    = metrics ? Math.round(metrics.avg_response) : 0
  const errRate  = metrics ? metrics.error_rate : 0

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Overview</h2>
          <p className="page-sub">Real-time application health &amp; performance</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {updated && <span style={{ fontSize: 12, color: 'var(--text3)' }}>Updated {updated}</span>}
          <button className="btn btn-ghost" onClick={fetchAll} disabled={spinning}>
            <RefreshCw size={14} strokeWidth={2} style={{ transition: 'transform 0.5s', transform: spinning ? 'rotate(360deg)' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <StatCard
          label="Total Requests" value={metrics?.total_requests ?? 0}
          sub="All time" subOk={true}
          color="var(--blue)" bg="var(--blue-dim)" Icon={Wifi}
        />
        <StatCard
          label="Avg Response Time" value={avgMs ? `${avgMs}ms` : '—'}
          sub={avgMs > 1000 ? 'Above threshold' : 'Within normal range'} subOk={avgMs <= 1000}
          color={avgMs > 1000 ? 'var(--yellow)' : 'var(--green)'}
          bg={avgMs > 1000 ? 'var(--yellow-dim)' : 'var(--green-dim)'} Icon={Clock}
        />
        <StatCard
          label="Error Count" value={metrics?.error_count ?? 0}
          sub="Total errors recorded" subOk={metrics?.error_count === 0}
          color="var(--red)" bg="var(--red-dim)" Icon={XCircle}
        />
        <StatCard
          label="Error Rate" value={errRate ? `${errRate.toFixed(1)}%` : '0%'}
          sub={errRate > 10 ? 'Exceeds 10% threshold' : 'Within safe range'} subOk={errRate <= 10}
          color={errRate > 10 ? 'var(--red)' : 'var(--green)'}
          bg={errRate > 10 ? 'var(--red-dim)' : 'var(--green-dim)'} Icon={TrendingDown}
        />
        <StatCard
          label="Active Alerts" value={alerts.length}
          sub={alerts.length > 0 ? 'Needs attention' : 'System healthy'} subOk={alerts.length === 0}
          color={alerts.length > 0 ? 'var(--yellow)' : 'var(--green)'}
          bg={alerts.length > 0 ? 'var(--yellow-dim)' : 'var(--green-dim)'} Icon={Bell}
        />
      </div>

      {/* Response Time Chart */}
      <div className="panel">
        <div className="panel-title">
          <div className="panel-icon" style={{ background: 'var(--blue-dim)' }}>
            <Activity size={14} color="var(--blue)" />
          </div>
          Response Time — Last 20 Requests
          <span className="badge" style={{ background: 'var(--blue-dim)', color: 'var(--blue)', marginLeft: 'auto' }}>
            ms
          </span>
        </div>

        {chartData.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><Activity size={22} /></div>
            <p>No requests yet. Trigger API calls from the Flutter app.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b8cf8" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b8cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="time" stroke="var(--text3)" tick={{ fontSize: 11, fontFamily: 'var(--mono)' }} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text3)" tick={{ fontSize: 11, fontFamily: 'var(--mono)' }} tickLine={false} axisLine={false} unit="ms" width={55} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border2)', strokeWidth: 1 }} />
              <Line
                type="monotone" dataKey="responseTime"
                stroke="var(--blue)" strokeWidth={2}
                dot={{ fill: 'var(--blue)', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: 'var(--blue)', stroke: 'var(--surface)', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="panel" style={{ borderColor: 'var(--yellow-dim)' }}>
          <div className="panel-title">
            <div className="panel-icon" style={{ background: 'var(--yellow-dim)' }}>
              <Bell size={14} color="var(--yellow)" />
            </div>
            Active Alerts
            <span className="badge" style={{ background: 'var(--yellow-dim)', color: 'var(--yellow)', marginLeft: 'auto' }}>
              {alerts.length} open
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alerts.slice(0, 5).map(a => (
              <div key={a.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', background: 'var(--surface2)', borderRadius: 8,
                borderLeft: `3px solid ${a.severity === 'Critical' ? 'var(--red)' : 'var(--yellow)'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertTriangle size={14} color={a.severity === 'Critical' ? 'var(--red)' : 'var(--yellow)'} />
                  <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{a.alert_type}</span>
                  <span style={{ color: 'var(--text2)', fontSize: 13 }}>{a.message}</span>
                </div>
                <span className="badge" style={{
                  background: a.severity === 'Critical' ? 'var(--red-dim)' : 'var(--yellow-dim)',
                  color: a.severity === 'Critical' ? 'var(--red)' : 'var(--yellow)'
                }}>{a.severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}