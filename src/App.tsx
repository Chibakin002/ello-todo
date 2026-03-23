import { useEffect, useState } from 'react'
import { useAppStore } from './store'
import { TaskForm } from './components/TaskForm'
import { Board } from './components/Board'
import { FocusTimer } from './components/FocusTimer'
import { AnalyticsPanel } from './components/AnalyticsPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { ArchivePanel } from './components/ArchivePanel'
import { TrashPanel } from './components/TrashPanel'
import { DailyCheckIn } from './components/DailyCheckIn'
import { NowCard } from './components/NowCard'

function App() {
  const loadFromDb = useAppStore((s) => s.loadFromDb)
  const performUndo = useAppStore((s) => s.performUndo)
  const undo = useAppStore((s) => s.undo)
  const tasks = useAppStore(s => s.tasks)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFromDb().then(() => setLoading(false))
  }, [loadFromDb])

  if (loading) return <div className="app-shell" style={{ padding: '2rem' }}>Loading Database...</div>

  const todayCount = tasks.filter(t => t.status === 'active' && t.lane === 'today').length
  
  return (
    <div className="app-shell">
      <header className="topbar card">
        <div>
          <p className="label">Momentum Todo</p>
          <h1>Daily Command Center</h1>
        </div>
        <div className="stats">
          <article><span>Today</span><strong>{todayCount}</strong></article>
        </div>
      </header>

      {undo && (
         <section className="undo-banner card">
           <p>{undo.message}</p>
           <button type="button" className="soft-btn" onClick={performUndo}>Undo</button>
         </section>
      )}

      <DailyCheckIn />

      <main className="layout">
        <section className="card command-card">
          <div className="card-head">
            <h2>Your Tasks</h2>
            <span>{tasks.filter(t => t.status === 'active').length} active</span>
          </div>
          <TaskForm />
          <Board />
        </section>

        <aside className="right-column">
          <NowCard />
          <FocusTimer />
          <AnalyticsPanel />
          <SettingsPanel />
          <ArchivePanel />
          <TrashPanel />
        </aside>
      </main>
    </div>
  )
}

export default App
