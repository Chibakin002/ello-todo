import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { TaskLaneColumn } from './TaskLane'
import { TaskItem } from './TaskItem'
import { useAppStore } from '../store'

export function Board() {
  const tasks = useAppStore(s => s.tasks)
  const moveLane = useAppStore(s => s.moveLane)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const active = tasks
    .filter(t => t.status === 'active')
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
  
  const todayTasks = active.filter(t => t.lane === 'today')
  const nextTasks = active.filter(t => t.lane === 'next')
  const laterTasks = active.filter(t => t.lane === 'later')

  const activeTask = activeId ? active.find(t => t.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    
    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string
    
    // Check if dragging over a lane
    if (['today', 'next', 'later'].includes(overId)) {
       moveLane(taskId, overId as any)
       return
    }

    // Checking if dragging over another task
    const overTask = tasks.find(t => t.id === overId)
    if (overTask && overTask.lane) {
       moveLane(taskId, overTask.lane)
    }
  }

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCorners} 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="lanes-grid">
        <TaskLaneColumn laneId="today" title="Today" tasks={todayTasks} selectedId={selectedId} onSelect={setSelectedId} />
        <TaskLaneColumn laneId="next" title="Next" tasks={nextTasks} selectedId={selectedId} onSelect={setSelectedId} />
        <TaskLaneColumn laneId="later" title="Later" tasks={laterTasks} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      <DragOverlay>
        {activeTask ? (
           <ul className="task-list"><TaskItem task={activeTask} selected={false} onSelect={() => {}} /></ul>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
