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
import { getVisibleTasks } from './tasks'
import { useTodayKey } from './useTodayKey'

function App() {
  const loadFromDb = useAppStore((s) => s.loadFromDb)
  const performUndo = useAppStore((s) => s.performUndo)
  const clearUndo = useAppStore((s) => s.clearUndo)
  const undo = useAppStore((s) => s.undo)
  const tasks = useAppStore(s => s.tasks)
  const [loading, setLoading] = useState(true)
  const todayKey = useTodayKey()

  useEffect(() => {
    loadFromDb().then(() => setLoading(false))
  }, [loadFromDb])

  useEffect(() => {
    if (!undo) return

    const remainingMs = undo.expiresAt - Date.now()
    if (remainingMs <= 0) {
      clearUndo()
      return
    }

    const timeoutId = window.setTimeout(() => clearUndo(), remainingMs)
    return () => window.clearTimeout(timeoutId)
  }, [undo, clearUndo])

  if (loading) return <div className="app-shell" style={{ padding: '2rem' }}>Loading Database...</div>

  const visibleTasks = getVisibleTasks(tasks, todayKey)
  const todayCount = visibleTasks.filter(t => t.lane === 'today').length
  const scheduledCount = tasks.filter((task) => task.status === 'active' && task.nextVisibleOn && task.nextVisibleOn > todayKey).length
  
  return (
    <div className="app-shell">
      <header className="topbar card">
        <div>
          <p className="label">Momentum Todo</p>
          <h1>Daily Command Center</h1>
        </div>
        <div className="stats">
          <article><span>Today</span><strong>{todayCount}</strong></article>
          <article><span>Scheduled</span><strong>{scheduledCount}</strong></article>
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
            <span>{visibleTasks.length} active now</span>
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
