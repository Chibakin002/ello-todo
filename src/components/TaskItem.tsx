import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { useAppStore } from '../store'
import type { Task, TaskLane } from '../types'

function cycleLane(lane: TaskLane): TaskLane {
  if (lane === 'today') return 'next'
  if (lane === 'next') return 'later'
  return 'today'
}

function cycleLabel(lane: TaskLane): string {
  if (lane === 'today') return 'Send Next'
  if (lane === 'next') return 'Send Later'
  return 'Bring Today'
}

function repeatLabel(repeat: string): string {
  if (repeat === 'daily') return 'Daily'
  if (repeat === 'weekly') return 'Weekly'
  if (repeat === 'monthly') return 'Monthly'
  return ''
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

interface Props {
  task: Task
  selected: boolean
  onSelect: (id: string) => void
}

export function TaskItem({ task, selected, onSelect }: Props) {
  const markDone = useAppStore(s => s.markDone)
  const startFocus = useAppStore(s => s.startFocus)
  const moveLane = useAppStore(s => s.moveLane)
  const toTrash = useAppStore(s => s.toTrash)
  const activeTimer = useAppStore(s => s.activeTimer)

  const runningHere = activeTimer?.taskId === task.id
  const disableFocus = Boolean(activeTimer && !runningHere)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  }

  return (
    <motion.li 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      ref={setNodeRef} 
      style={style} 
      className={`task-item ${selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`} 
      onClick={() => onSelect(task.id)}
    >
      <div className="task-drag-handle" {...attributes} {...listeners}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
      </div>

      <div className="task-main">
        <p className="task-title">{task.title}</p>
        <div className="task-tags">
          {task.tags?.map(tag => <span key={tag} className="tag">#{tag}</span>)}
          {task.energy && task.energy !== 'medium' && <span className={`tag energy-${task.energy}`}>{task.energy}</span>}
        </div>
        <div className="task-meta">
          {task.repeat !== 'none' && <small>{repeatLabel(task.repeat)}</small>}
          <small>Updated {formatDate(task.updatedAt)}</small>
        </div>
      </div>

      <div className="task-actions" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mini-btn" onClick={() => markDone(task.id)}>Done</button>
        <button type="button" className="mini-btn soft-btn" disabled={disableFocus} onClick={() => startFocus(task.id, 'sprint')}>
          {runningHere ? 'Running' : 'Focus'}
        </button>
        <button type="button" className="mini-btn soft-btn" onClick={() => moveLane(task.id, cycleLane(task.lane))}>
          {cycleLabel(task.lane)}
        </button>
        <button type="button" className="mini-btn ghost-btn" onClick={() => toTrash(task.id)}>Trash</button>
      </div>
    </motion.li>
  )
}
