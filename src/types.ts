export type TaskStatus = 'active' | 'done' | 'trashed'
export type TaskLane = 'today' | 'next' | 'later'
export type RepeatRule = 'none' | 'daily' | 'weekly' | 'monthly'
export type SessionMode = 'sprint' | 'two_minute' | 'short_break' | 'long_break'
export type TaskEnergy = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  status: TaskStatus
  lane: TaskLane
  repeat: RepeatRule
  repeatDayOfWeek?: number
  repeatDayOfMonth?: number
  nextVisibleOn?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  trashedAt?: string
  tags?: string[]
  energy?: TaskEnergy
}

export interface FocusSession {
  id: string
  taskId: string | null
  mode: SessionMode
  durationSec: number
  startedAt: string
  endedAt: string
  completed: boolean
}

export interface Settings {
  sprintMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
}

export interface ActiveTimer {
  taskId: string | null
  mode: SessionMode
  durationSec: number
  startedAt: string
}

export interface PersistedState {
  tasks: Task[]
  sessions: FocusSession[]
  settings: Settings
  activeTimer: ActiveTimer | null
  lastDailyCheckKey: string | null
  xp: number
  level: number
}
