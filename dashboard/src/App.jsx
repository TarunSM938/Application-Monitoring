import { useState } from 'react'
import { LayoutDashboard, BarChart2, ScrollText, Bell, Zap, ChevronRight, GitBranch } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import Logs from './pages/Logs'
import Alerts from './pages/Alerts'
import Traces from './pages/Traces'
import './App.css'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', Icon: BarChart2 },
  { id: 'logs',      label: 'Logs',      Icon: ScrollText },
  { id: 'traces',    label: 'Traces',    Icon: GitBranch },
  { id: 'alerts',    label: 'Alerts',    Icon: Bell },
]

export default function App() {
  const [active, setActive] = useState('dashboard')
  const Page = { dashboard: Dashboard, analytics: Analytics, logs: Logs, traces: Traces, alerts: Alerts }[active]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon"><Zap size={18} strokeWidth={2.5} /></div>
          <div>
            <div className="brand-name">AppPulse</div>
            <div className="brand-sub">Monitoring System</div>
          </div>
        </div>

        <div className="sidebar-divider" />

        <nav className="sidebar-nav">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`nav-item ${active === id ? 'nav-item--active' : ''}`}
              onClick={() => setActive(id)}
            >
              <Icon size={16} strokeWidth={2} />
              <span>{label}</span>
              {active === id && <ChevronRight size={13} className="nav-chevron" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="status-dot" />
          <span>Live monitoring active</span>
        </div>
      </aside>

      <main className="main-content">
        <Page />
      </main>
    </div>
  )
}
