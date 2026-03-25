import { useMemo, useState, useEffect } from 'react'
import { useAppStore, dayKey } from '../store'
import { getRepeatLabel, getVisibleTasks } from '../tasks'

const laneRank = { today: 0, next: 1, later: 2 }

export function DailyCheckIn() {
  const tasks = useAppStore((s) => s.tasks)
  const lastDailyCheckKey = useAppStore((s) => s.lastDailyCheckKey)
  const applyPlan = useAppStore((s) => s.applyPlan)
  const skipPlan = useAppStore((s) => s.skipPlan)
  
  const [manualPlan, setManualPlan] = useState<{ dayKey: string; ids: string[] } | null>(null)
  const [todayKey, setTodayKey] = useState(() => dayKey(Date.now()))

  const active = useMemo(() => getVisibleTasks(tasks), [tasks])
  const needsCheck = active.length > 0 && lastDailyCheckKey !== todayKey

  const plannerCandidates = useMemo(() => {
    return [...active].sort((a, b) => laneRank[a.lane] - laneRank[b.lane] || Date.parse(a.updatedAt) - Date.parse(b.updatedAt)).slice(0, 8)
  }, [active])

  const candidateIds = useMemo(() => plannerCandidates.map((task) => task.id), [plannerCandidates])

  const defaultPlanIds = useMemo(() => {
    if (!needsCheck) return []
    return candidateIds.filter((id) => active.some((task) => task.id === id && task.lane === 'today'))
  }, [active, candidateIds, needsCheck])

  const planIds = useMemo(() => {
    if (!needsCheck) return []
    if (manualPlan?.dayKey === todayKey) {
      const keep = manualPlan.ids.filter((id) => candidateIds.includes(id))
      if (keep.length) return keep
    }
    return defaultPlanIds
  }, [candidateIds, defaultPlanIds, manualPlan, needsCheck, todayKey])

  useEffect(() => {
    const id = setInterval(() => setTodayKey(dayKey(Date.now())), 60_000)
    return () => clearInterval(id)
  }, [])

  if (!needsCheck) return null

  function togglePlan(taskId: string) {
    const nextIds = planIds.includes(taskId) ? planIds.filter((id) => id !== taskId) : [...planIds, taskId]
    setManualPlan({ dayKey: todayKey, ids: nextIds })
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
          const repeatLabel = getRepeatLabel(task)
          return (
            <li key={task.id} className={checked ? 'is-selected' : ''}>
              <label className="planner-option">
                <input type="checkbox" checked={checked} onChange={() => togglePlan(task.id)} />
                <span className="planner-copy">
                  <strong>{task.title}</strong>
                  <small>{repeatLabel ?? 'One-time task'}</small>
                </span>
                <span className="planner-pill">{task.lane.charAt(0).toUpperCase() + task.lane.slice(1)}</span>
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
