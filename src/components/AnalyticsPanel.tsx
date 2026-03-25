import { useEffect, useMemo, useState } from 'react'
import { useAppStore, dayKey } from '../store'
import { getVisibleTasks } from '../tasks'

export function AnalyticsPanel() {
  const sessions = useAppStore(s => s.sessions)
  const tasks = useAppStore(s => s.tasks)
  const xp = useAppStore(s => s.xp)
  const level = useAppStore(s => s.level)

  const [nowMs, setNowMs] = useState(() => Date.now())
  const todayKeyStr = dayKey(nowMs)

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const sessionsToday = useMemo(() => {
    return sessions.filter(s => s.completed && dayKey(s.endedAt) === todayKeyStr).length
  }, [sessions, todayKeyStr])

  const focusMinToday = useMemo(() => {
    const totalSec = sessions
      .filter(s => s.completed && dayKey(s.endedAt) === todayKeyStr)
      .reduce((sum, s) => sum + s.durationSec, 0)
    return Math.round(totalSec / 60)
  }, [sessions, todayKeyStr])

  const done = useMemo(() => tasks.filter(t => t.status === 'done'), [tasks])
  const active = useMemo(() => getVisibleTasks(tasks), [tasks])

  const completion7d = useMemo(() => {
    const start = new Date(nowMs - 6 * 86_400_000)
    start.setHours(0, 0, 0, 0)
    const completed = done.filter(t => Date.parse(t.completedAt ?? t.updatedAt) >= start.getTime()).length
    return Math.round((completed / Math.max(1, completed + active.length)) * 100)
  }, [active.length, done, nowMs])

  const streak = useMemo(() => {
    const days = new Set(done.map(t => dayKey(t.completedAt ?? t.updatedAt)))
    let count = 0
    let cursor = new Date(nowMs)
    cursor.setHours(0, 0, 0, 0)
    while (days.has(dayKey(cursor))) {
      count += 1
      cursor = new Date(cursor.getTime() - 86_400_000)
    }
    return count
  }, [done, nowMs])

  const currentLevelXp = xp - ((level - 1) * 100)
  const xpProgress = Math.min(100, Math.max(0, (currentLevelXp / 100) * 100))

  return (
    <section className="card analytics-card">
      <div className="card-head">
        <h2>Micro Analytics</h2>
        <span>{sessionsToday} sessions today</span>
      </div>
      
      <div className="level-bar-container">
        <div className="level-header">
           <span className="level-badge">Lvl {level}</span>
           <span>{currentLevelXp} / 100 XP</span>
        </div>
        <div className="progress xp-progress"><span style={{ width: `${xpProgress}%` }} /></div>
      </div>

      <div className="analytics-grid" style={{ marginTop: '1rem' }}>
        <article><span>Current streak</span><strong>{streak} days</strong></article>
        <article><span>7-day completion</span><strong>{completion7d}%</strong></article>
        <article><span>Focus minutes</span><strong>{focusMinToday} min</strong></article>
      </div>
    </section>
  )
}
