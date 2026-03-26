import { useMemo } from 'react'
import { useAppStore } from '../store'
import { getVisibleTasks } from '../tasks'
import { useTodayKey } from '../useTodayKey'

export function NowCard() {
  const tasks = useAppStore(s => s.tasks)
  const startFocus = useAppStore(s => s.startFocus)
  const activeTimer = useAppStore(s => s.activeTimer)
  const todayKey = useTodayKey()

  const active = useMemo(() => getVisibleTasks(tasks, todayKey), [tasks, todayKey])
  
  const recommended = useMemo(() => {
    const laneRank = { today: 0, next: 1, later: 2 }
    const ordered = [...active].sort((a, b) => laneRank[a.lane] - laneRank[b.lane] || Date.parse(a.updatedAt) - Date.parse(b.updatedAt))
    return ordered[0] ?? null
  }, [active])

  return (
    <section className="card now-card">
      <div className="card-head">
        <h2>Now</h2>
        <span>{recommended ? recommended.lane.charAt(0).toUpperCase() + recommended.lane.slice(1) : 'Idle'}</span>
      </div>
      {recommended ? (
        <>
          <h3>{recommended.title}</h3>
          <p>Next best task for momentum.</p>
          <div className="timer-actions-row">
            <button type="button" onClick={() => startFocus(recommended.id, 'sprint')} disabled={Boolean(activeTimer)}>Start Sprint</button>
            <button type="button" className="soft-btn" onClick={() => startFocus(recommended.id, 'two_minute')} disabled={Boolean(activeTimer)}>2-Min Launch</button>
          </div>
        </>
      ) : <p className="empty">Add tasks to get recommendation.</p>}
    </section>
  )
}
