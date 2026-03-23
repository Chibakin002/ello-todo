import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { TaskItem } from './TaskItem'
import type { Task, TaskLane } from '../types'
import { AnimatePresence } from 'framer-motion'

interface Props {
  laneId: TaskLane
  title: string
  tasks: Task[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function TaskLaneColumn({ laneId, title, tasks, selectedId, onSelect }: Props) {
  const { setNodeRef } = useDroppable({ id: laneId })

  return (
    <section className="lane-column">
      <div className="lane-head">
        <h3>{title}</h3>
        <span>{tasks.length}</span>
      </div>
      
      <div ref={setNodeRef} className="task-list-container">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <ul className="task-list">
            <AnimatePresence>
              {tasks.map((task) => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  selected={selectedId === task.id} 
                  onSelect={onSelect} 
                />
              ))}
            </AnimatePresence>
            {tasks.length === 0 && <li className="empty">No tasks in this lane.</li>}
          </ul>
        </SortableContext>
      </div>
    </section>
  )
}
