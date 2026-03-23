import { useMemo } from 'react'
import { useAppStore, dayKey } from '../store'
import type { Task } from '../types'

export function ArchivePanel() {
  const tasks = useAppStore(s => s.tasks)
  const reopen = useAppStore(s => s.reopen)
  const toTrash = useAppStore(s => s.toTrash)

  const done = useMemo(() => tasks.filter((t) => t.status === 'done').sort((a, b) => Date.parse(b.completedAt ?? b.updatedAt) - Date.parse(a.completedAt ?? a.updatedAt)), [tasks])

  return (
    <section className="card archive-card">
      <div className="card-head">
        <h2>Completed Archive</h2>
        <span>{done.length}</span>
      </div>
      {done.length === 0 ? (
        <p className="empty">Done tasks appear here.</p>
      ) : (
        <div className="archive-groups">
          {Array.from(
            done.reduce<Map<string, Task[]>>((map, task) => {
              const key = dayKey(task.completedAt ?? task.updatedAt)
              const list = map.get(key)
              if (list) list.push(task)
              else map.set(key, [task])
              return map
            }, new Map()).entries()
          )
            .sort((a, b) => b[0].localeCompare(a[0]))
            .slice(0, 6)
            .map(([key, items]) => (
              <article key={key}>
                <h3>{new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${key}T12:00:00`))}</h3>
                <ul>
                  {items.slice(0, 6).map((task) => (
                    <li key={task.id}>
                      <span>{task.title}</span>
                      <div className="archive-actions">
                        <button type="button" className="mini-btn soft-btn" onClick={() => reopen(task.id)}>Reopen</button>
                        <button type="button" className="mini-btn ghost-btn" onClick={() => toTrash(task.id)}>Trash</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
        </div>
      )}
    </section>
  )
}
