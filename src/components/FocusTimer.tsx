import { useMemo, useEffect, useState } from 'react'
import { useAppStore } from '../store'

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function modeLabel(mode: string): string {
  if (mode === 'short_break') return 'Short Break'
  if (mode === 'long_break') return 'Long Rest'
  if (mode === 'two_minute') return '2-Minute Launch'
  return 'Focus Sprint'
}

export function FocusTimer() {
  const activeTimer = useAppStore(s => s.activeTimer)
  const tasks = useAppStore(s => s.tasks)
  const stopFocus = useAppStore(s => s.stopFocus)
  const tickTimer = useAppStore(s => s.tickTimer)
  const startFocus = useAppStore(s => s.startFocus)
  const isAlarmRinging = useAppStore(s => s.isAlarmRinging)
  const stopAlarm = useAppStore(s => s.stopAlarm)
  
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!activeTimer) return
    const interval = setInterval(() => {
      const tick = Date.now()
      setNowMs(tick)
      tickTimer(tick) // let Zustand handle completion if time is up
    }, 1000)
    return () => clearInterval(interval)
  }, [activeTimer, tickTimer])

  const remaining = useMemo(() => {
    if (!activeTimer) return 0
    const elapsed = Math.floor((nowMs - Date.parse(activeTimer.startedAt)) / 1000)
    return Math.max(0, activeTimer.durationSec - elapsed)
  }, [activeTimer, nowMs])

  const progress = useMemo(() => {
    if (!activeTimer) return 0
    return Math.min(100, ((activeTimer.durationSec - remaining) / activeTimer.durationSec) * 100)
  }, [activeTimer, remaining])
  
  const timerTask = useMemo(() => {
    if (!activeTimer) return null
    return tasks.find(t => t.id === activeTimer.taskId) || null
  }, [activeTimer, tasks])

  // When timer turns null (finished), maybe prompt for break if the previous one wasn't a break

  // When timer turns null (finished), maybe prompt for break if the previous one wasn't a break
  // A simpler way: just show "Take a break?" buttons on the timer card when idle.

  return (
    <section className="card focus-card">
      <div className="card-head">
        <h2>Focus Timer</h2>
        <span>{activeTimer ? 'Running' : 'Idle'}</span>
      </div>

      {activeTimer ? (
        <div className="timer-block">
          <p className="mode">{modeLabel(activeTimer.mode)}</p>
          <h3>{timerTask?.title || 'Resting...'}</h3>
          <p className="time">{formatTimer(remaining)}</p>
          <div className="progress"><span style={{ width: `${progress}%` }} /></div>
          
          <div className="timer-actions-row">
            <button type="button" onClick={() => stopFocus(true)}>Complete</button>
            <button type="button" className="soft-btn" onClick={() => stopFocus(false)}>Cancel</button>
          </div>
        </div>
      ) : isAlarmRinging ? (
        <div className="timer-block empty-timer">
          <h3 style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '1.5rem', textTransform: 'uppercase' }}>⏰ Time is Up!</h3>
          <button 
            type="button" 
            onClick={stopAlarm} 
            style={{ 
              background: 'var(--danger)', 
              color: 'white', 
              padding: '1rem 2rem', 
              fontSize: '1.125rem',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
            }}
          >
            STOP BUZZER
          </button>
        </div>
      ) : (
        <div className="timer-block empty-timer">
          <p className="empty" style={{ marginBottom: "1rem" }}>Select a task and start focus to begin.</p>
          <div className="break-suggestions" style={{ marginTop: "1rem" }}>
             <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "0.5rem", fontWeight: 600, textTransform: "uppercase" }}>Need a break?</p>
             <div className="timer-actions-row">
                 <button type="button" className="soft-btn" onClick={() => startFocus(null, 'short_break')}>Short (5m)</button>
                 <button type="button" className="soft-btn" onClick={() => startFocus(null, 'long_break')}>Long (15m)</button>
             </div>
          </div>
        </div>
      )}
    </section>
  )
}
