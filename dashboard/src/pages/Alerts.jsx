import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Bell, BellOff, CheckCircle, AlertTriangle, AlertOctagon,
  Clock, RefreshCw, Lightbulb, ShieldCheck, Zap
} from 'lucide-react'

const API = 'http://localhost:5000'

const SEV = {
  Critical: { color: 'var(--red)',    bg: 'var(--red-dim)',    border: '#5a1a1a', Icon: AlertOctagon  },
  High:     { color: 'var(--yellow)', bg: 'var(--yellow-dim)', border: '#4a3000', Icon: AlertTriangle },
  Medium:   { color: 'var(--blue)',   bg: 'var(--blue-dim)',   border: '#1a3060', Icon: Bell          },
  Low:      { color: 'var(--green)',  bg: 'var(--green-dim)',  border: '#0a2f1a', Icon: Bell          },
}

export default function Alerts() {
  const [alerts, setAlerts]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [spinning, setSpinning] = useState(false)
  const [resolving, setResolving] = useState(null)
  const [showResolved, setShowResolved] = useState(false)

  const fetchAlerts = async () => {
    setSpinning(true)
    try { const r = await axios.get(`${API}/api/alerts`); setAlerts(r.data.alerts || []) }
    catch (e) { console.error(e) }
    finally { setLoading(false); setTimeout(() => setSpinning(false), 400) }
  }

  const resolve = async (id) => {
    setResolving(id)
    try { await axios.put(`${API}/api/alerts/${id}/resolve`); await fetchAlerts() }
    catch (e) { console.error(e) }
    finally { setResolving(null) }
  }

  useEffect(() => { fetchAlerts(); const t = setInterval(fetchAlerts, 30000); return () => clearInterval(t) }, [])

  const active   = alerts.filter(a => !a.resolved)
  const resolved = alerts.filter(a =>  a.resolved)
  const list     = showResolved ? resolved : active

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <span>Loading alerts...</span>
    </div>
  )

  return (
    <div style={{ padding: '32px' }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Alerts</h2>
          <p className="page-sub">{active.length} active &nbsp;·&nbsp; {resolved.length} resolved</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchAlerts} disabled={spinning}>
          <RefreshCw size={14} style={{ transition: 'transform 0.5s', transform: spinning ? 'rotate(360deg)' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { label: 'Critical', count: active.filter(a => a.severity === 'Critical').length, ...SEV.Critical },
          { label: 'High',     count: active.filter(a => a.severity === 'High').length,     ...SEV.High },
          { label: 'Active',   count: active.length,   color: 'var(--blue)',  bg: 'var(--blue-dim)',  border: '#1a3060', Icon: Bell },
          { label: 'Resolved', count: resolved.length, color: 'var(--green)', bg: 'var(--green-dim)', border: '#0a2f1a', Icon: ShieldCheck },
        ].map(({ label, count, color, bg, border, Icon }) => (
          <div key={label} style={{
            background: bg, border: `1px solid ${border}`, borderRadius: 10,
            padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 140
          }}>
            <Icon size={18} color={color} strokeWidth={2} />
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color, letterSpacing: '-0.04em' }}>{count}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[false, true].map(r => (
          <button key={String(r)} className={`btn ${showResolved === r ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setShowResolved(r)}>
            {r ? <ShieldCheck size={14} /> : <Bell size={14} />}
            {r ? `Resolved (${resolved.length})` : `Active (${active.length})`}
          </button>
        ))}
      </div>

      {/* Alert Cards */}
      {list.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <div className="empty-icon">
              {showResolved ? <BellOff size={22} /> : <ShieldCheck size={22} />}
            </div>
            <p>{showResolved ? 'No resolved alerts yet.' : 'All clear — no active alerts.'}</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(alert => {
            const s = SEV[alert.severity] || SEV.Low
            return (
              <div key={alert.id} style={{
                background: s.bg, border: `1px solid ${s.border}`,
                borderRadius: 12, padding: '18px 22px',
                display: 'flex', alignItems: 'center', gap: 16,
                transition: 'border-color 0.2s'
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 9,
                  background: `${s.color}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <s.Icon size={18} color={s.color} strokeWidth={2} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{alert.alert_type}</span>
                    <span className="badge" style={{ background: `${s.color}20`, color: s.color }}>
                      <Zap size={9} />
                      {alert.severity}
                    </span>
                    {alert.resolved && (
                      <span className="badge" style={{ background: 'var(--green-dim)', color: 'var(--green)' }}>
                        <CheckCircle size={9} />
                        Resolved
                      </span>
                    )}
                  </div>
                  <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 6 }}>{alert.message}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text3)', fontSize: 11 }}>
                    <Clock size={11} />
                    {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : '—'}
                  </div>
                </div>

                {!alert.resolved && (
                  <button
                    className="btn btn-success"
                    onClick={() => resolve(alert.id)}
                    disabled={resolving === alert.id}
                    style={{ flexShrink: 0 }}
                  >
                    <CheckCircle size={14} />
                    {resolving === alert.id ? 'Resolving...' : 'Resolve'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* RCA Tips */}
      {active.length > 0 && (
        <div className="panel" style={{ marginTop: 24, borderColor: 'var(--blue-dim)' }}>
          <div className="panel-title">
            <div className="panel-icon" style={{ background: 'var(--blue-dim)' }}>
              <Lightbulb size={14} color="var(--blue)" />
            </div>
            Root Cause Analysis — Quick Guide
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: AlertTriangle, color: 'var(--yellow)', tip: 'Performance alerts (>3000ms) indicate backend or database bottlenecks. Check the Analytics page for slow API breakdown.' },
              { icon: AlertOctagon,  color: 'var(--red)',    tip: 'Server Error alerts (5xx) mean backend failures. Check your Node.js server console for stack traces.' },
              { icon: Bell,          color: 'var(--blue)',   tip: 'Cross-reference alert timestamps with the Logs page to identify correlated failing requests.' },
            ].map(({ icon: Icon, color, tip }, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8 }}>
                <Icon size={14} color={color} style={{ marginTop: 2, flexShrink: 0 }} />
                <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6 }}>{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}