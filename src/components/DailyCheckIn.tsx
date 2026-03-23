import { useMemo, useState, useEffect } from 'react'
import { useAppStore, dayKey } from '../store'

const laneRank = { today: 0, next: 1, later: 2 }

export function DailyCheckIn() {
  const tasks = useAppStore((s) => s.tasks)
  const lastDailyCheckKey = useAppStore((s) => s.lastDailyCheckKey)
  const applyPlan = useAppStore((s) => s.applyPlan)
  const skipPlan = useAppStore((s) => s.skipPlan)
  
  const [planIds, setPlanIds] = useState<string[]>([])

  const active = useMemo(() => tasks.filter((t) => t.status === 'active'), [tasks])
  const todayKey = dayKey(Date.now())
  const needsCheck = active.length > 0 && lastDailyCheckKey !== todayKey

  const plannerCandidates = useMemo(() => {
    return [...active].sort((a, b) => laneRank[a.lane] - laneRank[b.lane] || Date.parse(a.updatedAt) - Date.parse(b.updatedAt)).slice(0, 8)
  }, [active])

  useEffect(() => {
    if (!needsCheck) {
      setPlanIds([])
      return
    }
    const ids = plannerCandidates.map(t => t.id)
    setPlanIds(prev => {
      const keep = prev.filter(id => ids.includes(id))
      return keep.length ? keep : ids.filter(id => active.some(task => task.id === id && task.lane === 'today'))
    })
  }, [needsCheck, plannerCandidates, active])

  if (!needsCheck) return null

  function togglePlan(taskId: string) {
    setPlanIds(prev => prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId])
  }

  return (
    <section className="daily-check card">
      <div className="card-head">
        <h2>Daily Check-In</h2>
        <span>Pick your focus tasks</span>
      </div>
      <ul className="planner-list">
        {plannerCandidates.map((task) => {
          const checked = planIds.includes(task.id)
          return (
            <li key={task.id}>
              <label>
                <input type="checkbox" checked={checked} onChange={() => togglePlan(task.id)} />
                <span>
                  {task.title}
                  <small>{task.lane.charAt(0).toUpperCase() + task.lane.slice(1)}</small>
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      <div className="planner-actions">
        <button type="button" onClick={() => applyPlan(planIds, todayKey)}>Plan My Day</button>
        <button type="button" className="soft-btn" onClick={() => skipPlan(todayKey)}>Skip Today</button>
      </div>
    </section>
  )
}
