import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAppStore } from '../store'
import { formatDayLabel, ordinal, weekdayOptions } from '../tasks'
import type { TaskLane, RepeatRule, TaskEnergy } from '../types'

export function TaskForm() {
  const addTask = useAppStore((s) => s.addTask)
  const [title, setTitle] = useState('')
  const [lane, setLane] = useState<TaskLane>('today')
  const [repeat, setRepeat] = useState<RepeatRule>('none')
  const [repeatDayOfWeek, setRepeatDayOfWeek] = useState(() => new Date().getDay())
  const [repeatDayOfMonth, setRepeatDayOfMonth] = useState(() => new Date().getDate())
  const [showOnDate, setShowOnDate] = useState('')
  const [energy, setEnergy] = useState<TaskEnergy>('medium')
  const [tagsInput, setTagsInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const taskTitle = title.trim()
    if (!taskTitle) {
      setError('Task name is required.')
      return
    }

    const tags = tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    
    addTask({
      title: taskTitle,
      lane,
      repeat,
      repeatDayOfWeek: repeat === 'weekly' ? repeatDayOfWeek : undefined,
      repeatDayOfMonth: repeat === 'monthly' ? repeatDayOfMonth : undefined,
      showOnDate: showOnDate || undefined,
      tags,
      energy,
    })

    setTitle('')
    setTagsInput('')
    setRepeat('none')
    setShowOnDate('')
    const resetDate = new Date()
    setRepeatDayOfWeek(resetDate.getDay())
    setRepeatDayOfMonth(resetDate.getDate())
    setEnergy('medium')
    setError(null)
    titleRef.current?.focus()
  }

  return (
    <form className="task-form form-expanded" onSubmit={handleSubmit}>
      <div className="form-row main-row">
        <input 
          ref={titleRef} 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          placeholder="What needs to be done?" 
          aria-label="Task name" 
          autoFocus 
        />
        <button type="submit">Add Task</button>
      </div>
      
      <div className="form-row meta-row">
        <select value={lane} onChange={(e) => setLane(e.target.value as TaskLane)} aria-label="Task lane">
          <option value="today">Today</option>
          <option value="next">Next</option>
          <option value="later">Later</option>
        </select>
        
        <select value={energy} onChange={(e) => setEnergy(e.target.value as TaskEnergy)} aria-label="Energy level">
          <option value="low">Low Energy</option>
          <option value="medium">Medium Energy</option>
          <option value="high">High Energy</option>
        </select>

        <select value={repeat} onChange={(e) => setRepeat(e.target.value as RepeatRule)} aria-label="Repeat">
          <option value="none">No repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>

        <input
          type="date"
          value={showOnDate}
          onChange={(e) => setShowOnDate(e.target.value)}
          aria-label="Show on date"
        />
        
        <input 
          className="tags-input"
          value={tagsInput} 
          onChange={(e) => setTagsInput(e.target.value)} 
          placeholder="Tags (comma separated)" 
          aria-label="Tags" 
        />
      </div>

      {repeat !== 'none' && (
        <div className="form-row repeat-row">
          {repeat === 'weekly' && (
            <label className="repeat-config">
              <span>Repeats every</span>
              <select value={repeatDayOfWeek} onChange={(e) => setRepeatDayOfWeek(Number(e.target.value))} aria-label="Repeat weekday">
                {weekdayOptions.map((day, index) => (
                  <option key={day} value={index}>{day}</option>
                ))}
              </select>
            </label>
          )}

          {repeat === 'monthly' && (
            <label className="repeat-config">
              <span>Repeats on the</span>
              <select value={repeatDayOfMonth} onChange={(e) => setRepeatDayOfMonth(Number(e.target.value))} aria-label="Repeat date of month">
                {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                  <option key={day} value={day}>{ordinal(day)}</option>
                ))}
              </select>
            </label>
          )}

          <p className="repeat-hint">
            When you complete it, it disappears and comes back on its next scheduled date.
          </p>
        </div>
      )}

      {showOnDate && (
        <p className="repeat-hint">
          Scheduled for {formatDayLabel(showOnDate)}. It will appear on that date.
        </p>
      )}
      
      {error && <p className="error-text">{error}</p>}
    </form>
  )
}
