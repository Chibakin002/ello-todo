import { useMemo, useEffect, useState } from 'react'
import { useAppStore } from '../store'

const DAY_MS = 86_400_000
const TRASH_DAYS = 7

export function TrashPanel() {
  const tasks = useAppStore(s => s.tasks)
  const restore = useAppStore(s => s.restore)
  const deleteFromTrash = useAppStore(s => s.deleteFromTrash)
  const cleanupTrash = useAppStore(s => s.cleanupTrash)
  
  const [nowMs, setNowMs] = useState(() => Date.now())

  // Run cleanup periodically
  useEffect(() => {
    const id = setInterval(() => {
      setNowMs(Date.now())
      cleanupTrash()
    }, 60_000)
    return () => clearInterval(id)
  }, [cleanupTrash])

  const trash = useMemo(() => tasks.filter((t) => t.status === 'trashed').sort((a, b) => Date.parse(b.trashedAt ?? b.updatedAt) - Date.parse(a.trashedAt ?? a.updatedAt)), [tasks])

  function trashDaysLeft(trashedAt?: string): number {
    if (!trashedAt) return TRASH_DAYS
    const days = Math.floor(Math.max(0, nowMs - Date.parse(trashedAt)) / DAY_MS)
    return Math.max(0, TRASH_DAYS - days)
  }

  return (
    <section className="card trash-card">
      <div className="card-head">
        <h2>Trash</h2>
        <span>{trash.length}</span>
      </div>
      {trash.length === 0 ? (
        <p className="empty">Trash is empty.</p>
      ) : (
        <ul className="trash-list">
          {trash.map((task) => (
            <li key={task.id}>
              <div>
                <p>{task.title}</p>
                <small>Auto-removes in {trashDaysLeft(task.trashedAt)}d</small>
              </div>
              <div className="trash-actions">
                <button type="button" className="mini-btn soft-btn" onClick={() => restore(task.id)}>Restore</button>
                <button type="button" className="mini-btn ghost-btn" onClick={() => deleteFromTrash(task.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
