import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db } from './db'
import { playBeep, playSuccess, playBuzzer, stopBuzzer } from './audio'
import confetti from 'canvas-confetti'
import type { Task, FocusSession, ActiveTimer, Settings, TaskLane, RepeatRule, SessionMode, TaskEnergy } from './types'
import { computeNextVisibleOn, normalizeRepeatSchedule } from './tasks'

const DAY_MS = 86_400_000
const UNDO_MS = 10_000
const TRASH_DAYS = 7
const TRASH_MS = TRASH_DAYS * DAY_MS

export const defaultSettings: Settings = {
  sprintMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
}

export type UndoState = { snapshot: { tasks: Task[]; sessions: FocusSession[]; activeTimer: ActiveTimer | null }; message: string; expiresAt: number }

export function createId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function dayKey(value: string | number | Date): string {
  const date = new Date(value)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildSession(timer: ActiveTimer, completed: boolean, endedAt: string): FocusSession {
  const elapsed = Math.max(1, Math.min(timer.durationSec, Math.floor((Date.parse(endedAt) - Date.parse(timer.startedAt)) / 1000)))
  return {
    id: createId(),
    taskId: timer.taskId,
    mode: timer.mode,
    durationSec: completed ? timer.durationSec : elapsed,
    startedAt: timer.startedAt,
    endedAt,
    completed,
  }
}

interface AppState {
  tasks: Task[]
  sessions: FocusSession[]
  settings: Settings
  activeTimer: ActiveTimer | null
  lastDailyCheckKey: string | null
  xp: number
  level: number
  undo: UndoState | null
  isAlarmRinging: boolean

  // Initialization
  loadFromDb: () => Promise<void>
  
  // Tasks
  addTask: (input: {
    title: string
    lane: TaskLane
    repeat: RepeatRule
    repeatDayOfWeek?: number
    repeatDayOfMonth?: number
    tags?: string[]
    energy?: TaskEnergy
  }) => Promise<void>
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>
  moveLane: (taskId: string, target: TaskLane) => Promise<void>
  markDone: (taskId: string) => Promise<void>
  reopen: (taskId: string) => Promise<void>
  toTrash: (taskId: string) => Promise<void>
  restore: (taskId: string) => Promise<void>
  deleteFromTrash: (taskId: string) => Promise<void>
  cleanupTrash: () => Promise<void>
  
  // Timer & Sessions
  startFocus: (taskId: string | null, mode: SessionMode) => void
  stopFocus: (completed: boolean) => Promise<void>
  tickTimer: (nowMs: number) => Promise<void>

  // Planning
  applyPlan: (planIds: string[], todayKey: string) => Promise<void>
  skipPlan: (todayKey: string) => void
  
  // Settings & Gamification
  updateSettings: (settings: Partial<Settings>) => void
  addXp: (amount: number) => void
  performUndo: () => Promise<void>
  clearUndo: () => void
  stopAlarm: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tasks: [],
      sessions: [],
      settings: defaultSettings,
      activeTimer: null,
      lastDailyCheckKey: null,
      xp: 0,
      level: 1,
      undo: null,
      isAlarmRinging: false,

      loadFromDb: async () => {
        const tasks = await db.tasks.toArray()
        const sessions = await db.sessions.toArray()
        set({ tasks, sessions })
      },

      addTask: async ({ title, lane, repeat, repeatDayOfWeek, repeatDayOfMonth, tags = [], energy = 'medium' }) => {
        const stamp = new Date().toISOString()
        const schedule = normalizeRepeatSchedule(repeat, { repeatDayOfWeek, repeatDayOfMonth }, stamp)
        const task: Task = {
          id: createId(),
          title,
          status: 'active',
          lane,
          repeat,
          ...schedule,
          tags,
          energy,
          createdAt: stamp,
          updatedAt: stamp,
        }
        await db.tasks.add(task)
        set((state) => ({ tasks: [task, ...state.tasks] }))
      },

      updateTask: async (taskId, updates) => {
        const stamp = new Date().toISOString()
        await db.tasks.update(taskId, { ...updates, updatedAt: stamp })
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, ...updates, updatedAt: stamp } : t)),
        }))
      },

      moveLane: async (taskId, target) => {
        const { tasks } = get()
        const task = tasks.find((t) => t.id === taskId && t.status === 'active')
        if (!task || task.lane === target) return
        
        const stamp = new Date().toISOString()
        await db.tasks.update(taskId, { lane: target, updatedAt: stamp })
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, lane: target, updatedAt: stamp } : t)),
        }))
      },

      markDone: async (taskId) => {
        const { tasks, activeTimer, sessions } = get()
        const task = tasks.find((t) => t.id === taskId && t.status === 'active')
        if (!task) return
        
        const stamp = new Date().toISOString()
        let nextSessions = [...sessions]
        let nextTimer = activeTimer
        
        // Save undo snapshot
        const snapshot = { tasks, sessions, activeTimer }
        
        if (activeTimer?.taskId === taskId) {
          const session = buildSession(activeTimer, false, stamp)
          await db.sessions.add(session)
          nextSessions = [session, ...nextSessions]
          nextTimer = null
        }

        const doneUpdate = { status: 'done' as const, completedAt: stamp, updatedAt: stamp }
        await db.tasks.update(taskId, doneUpdate)
        const doneTasks = tasks.map((t) => t.id === taskId ? { ...t, ...doneUpdate } : t)

        let repeatedTasks: Task[] = []
        if (task.repeat !== 'none') {
          const schedule = normalizeRepeatSchedule(
            task.repeat,
            { repeatDayOfWeek: task.repeatDayOfWeek, repeatDayOfMonth: task.repeatDayOfMonth },
            stamp,
          )
          const repeatedTask: Task = {
            id: createId(),
            title: task.title,
            status: 'active',
            lane: task.lane,
            repeat: task.repeat,
            ...schedule,
            nextVisibleOn: computeNextVisibleOn({ repeat: task.repeat, ...schedule }, stamp),
            tags: task.tags,
            energy: task.energy,
            createdAt: stamp,
            updatedAt: stamp,
          }
          await db.tasks.add(repeatedTask)
          repeatedTasks = [repeatedTask]
        }

        const nextTasks = [...repeatedTasks, ...doneTasks]
        
        set((state) => {
          // Play success effects
          playSuccess()
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } })

          // Add XP for completing a task
          const newXp = state.xp + 10
          return {
            tasks: nextTasks,
            sessions: nextSessions,
            activeTimer: nextTimer,
            xp: newXp,
            level: Math.floor(newXp / 100) + 1,
            undo: { snapshot, message: `Marked "${task.title}" done.`, expiresAt: Date.now() + UNDO_MS }
          }
        })
      },

      reopen: async (taskId) => {
        const stamp = new Date().toISOString()
        await db.tasks.update(taskId, { status: 'active', lane: 'today', completedAt: undefined, trashedAt: undefined, nextVisibleOn: undefined, updatedAt: stamp })
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, status: 'active', lane: 'today', completedAt: undefined, trashedAt: undefined, nextVisibleOn: undefined, updatedAt: stamp } : t
          ),
        }))
      },

      toTrash: async (taskId) => {
        const { tasks, activeTimer, sessions } = get()
        const task = tasks.find((t) => t.id === taskId)
        if (!task || task.status === 'trashed') return
        
        const stamp = new Date().toISOString()
        const snapshot = { tasks, sessions, activeTimer }
        
        let nextSessions = [...sessions]
        let nextTimer = activeTimer
        
        if (activeTimer?.taskId === taskId) {
          const session = buildSession(activeTimer, false, stamp)
          await db.sessions.add(session)
          nextSessions = [session, ...nextSessions]
          nextTimer = null
        }

        await db.tasks.update(taskId, { status: 'trashed', trashedAt: stamp, updatedAt: stamp })
        
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, status: 'trashed', trashedAt: stamp, updatedAt: stamp } : t)),
          sessions: nextSessions,
          activeTimer: nextTimer,
          undo: { snapshot, message: `Moved "${task.title}" to trash.`, expiresAt: Date.now() + UNDO_MS },
        }))
      },

      restore: async (taskId) => {
        const stamp = new Date().toISOString()
        await db.tasks.update(taskId, { status: 'active', lane: 'today', completedAt: undefined, trashedAt: undefined, nextVisibleOn: undefined, updatedAt: stamp })
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, status: 'active', lane: 'today', completedAt: undefined, trashedAt: undefined, nextVisibleOn: undefined, updatedAt: stamp } : t
          ),
        }))
      },

      deleteFromTrash: async (taskId) => {
        const { tasks, activeTimer, sessions } = get()
        const task = tasks.find((t) => t.id === taskId && t.status === 'trashed')
        if (!task) return
        
        const snapshot = { tasks, sessions, activeTimer }

        // Also delete associated sessions? 
        const sessionIds = sessions.filter(s => s.taskId === taskId).map(s => s.id)
        if (sessionIds.length) await db.sessions.bulkDelete(sessionIds)
        await db.tasks.delete(taskId)

        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== taskId),
          sessions: state.sessions.filter((s) => s.taskId !== taskId),
          activeTimer: state.activeTimer?.taskId === taskId ? null : state.activeTimer,
          undo: { snapshot, message: `Deleted "${task.title}" permanently.`, expiresAt: Date.now() + UNDO_MS }
        }))
      },

      cleanupTrash: async () => {
        const { tasks } = get()
        const nowMs = Date.now()
        let changed = false
        const toDeleteIds: string[] = []

        const next = tasks.filter((t) => {
          if (t.status !== 'trashed') return true
          if (!t.trashedAt) {
            changed = true
            return false
          }
          const at = Date.parse(t.trashedAt)
          if (Number.isNaN(at) || nowMs - at >= TRASH_MS) {
            toDeleteIds.push(t.id)
            changed = true
            return false
          }
          return true
        })

        if (changed) {
          if (toDeleteIds.length) {
             await db.tasks.bulkDelete(toDeleteIds)
             // Also delete associated sessions
             const { sessions } = get()
             const toDeleteIdsSet = new Set(toDeleteIds)
             const sessionIds = sessions.filter(s => s.taskId && toDeleteIdsSet.has(s.taskId)).map(s => s.id)
             if (sessionIds.length) await db.sessions.bulkDelete(sessionIds)
          }
          set((state) => {
            const validIds = new Set(next.map(t => t.id))
            return {
              tasks: next,
              sessions: state.sessions.filter((s) => s.taskId && validIds.has(s.taskId)),
              activeTimer: state.activeTimer && state.activeTimer.taskId && validIds.has(state.activeTimer.taskId) ? state.activeTimer : null,
            }
          })
        }
      },

      startFocus: (taskId, mode) => {
        const { tasks, activeTimer, settings } = get()
        if (activeTimer) return
        
        if (taskId) {
            const task = tasks.find((t) => t.id === taskId && t.status === 'active')
            if (!task) return
        }
        
        let durationSec = 120
        if (mode === 'sprint') durationSec = settings.sprintMinutes * 60
        else if (mode === 'short_break') durationSec = settings.shortBreakMinutes * 60
        else if (mode === 'long_break') durationSec = settings.longBreakMinutes * 60

        const stamp = new Date().toISOString()
        set({
          activeTimer: { taskId, mode, durationSec, startedAt: stamp },
          // immediately update task updatedAt via set, no DB ping needed until complete
          tasks: taskId ? tasks.map((t) => (t.id === taskId ? { ...t, updatedAt: stamp } : t)) : tasks,
        })
        if (taskId) db.tasks.update(taskId, { updatedAt: stamp }) // async fire and forget
      },

      stopFocus: async (completed) => {
        const { activeTimer } = get()
        if (!activeTimer) return
        
        const stamp = new Date().toISOString()
        const session = buildSession(activeTimer, completed, stamp)
        await db.sessions.add(session)
        
        // Add XP logic
        let xpGained = 0
        if (completed) {
            if (activeTimer.mode === 'sprint') xpGained = 20
            else if (activeTimer.mode === 'two_minute') xpGained = 5
        }

        set((state) => {
          const newXp = state.xp + xpGained
          return {
            sessions: [session, ...state.sessions],
            activeTimer: null,
            tasks: activeTimer.taskId ? state.tasks.map((t) => (t.id === activeTimer.taskId ? { ...t, updatedAt: stamp } : t)) : state.tasks,
            xp: newXp,
            level: Math.floor(newXp / 100) + 1,
          }
        })
        const tId1 = activeTimer.taskId
        if (tId1) db.tasks.update(tId1, { updatedAt: stamp })
      },

      tickTimer: async (nowMs) => {
        const { activeTimer } = get()
        if (!activeTimer) return
        
        const elapsed = Math.floor((nowMs - Date.parse(activeTimer.startedAt)) / 1000)
        if (elapsed < activeTimer.durationSec) return
        
        const isBreak = activeTimer.mode === 'short_break' || activeTimer.mode === 'long_break'
        
        // Play sound when timer auto options (rest or focus) expire
        if (isBreak) {
            playBuzzer()
        } else {
            playBeep()
        }

        // Auto-complete
        const stamp = new Date(nowMs).toISOString()
        const session = buildSession(activeTimer, true, stamp)
        await db.sessions.add(session)

        let xpGained = 0
        if (activeTimer.mode === 'sprint') xpGained = 20
        else if (activeTimer.mode === 'two_minute') xpGained = 5

        set((state) => {
          const newXp = state.xp + xpGained
          return {
            sessions: [session, ...state.sessions],
            activeTimer: null,
            tasks: activeTimer.taskId ? state.tasks.map((t) => (t.id === activeTimer.taskId ? { ...t, updatedAt: stamp } : t)) : state.tasks,
            xp: newXp,
            level: Math.floor(newXp / 100) + 1,
            isAlarmRinging: isBreak,
          }
        })
        const tId2 = activeTimer.taskId
        if (tId2) db.tasks.update(tId2, { updatedAt: stamp })
      },

      applyPlan: async (planIds, todayKey) => {
        const { tasks } = get()
        const selectedSet = new Set(planIds)
        if (selectedSet.size === 0) {
          set({ lastDailyCheckKey: todayKey })
          return
        }
        
        const stamp = new Date().toISOString()
        const updates: { key: string, changes: Partial<Task> }[] = []
        
        const next: Task[] = tasks.map((t) => {
          if (t.status !== 'active') return t
          if (selectedSet.has(t.id) && t.lane !== 'today') {
            const changes = { lane: 'today' as const, updatedAt: stamp }
            updates.push({ key: t.id, changes })
            return { ...t, ...changes }
          }
          return t
        })

        // Bulk update db
        await Promise.all(updates.map(u => db.tasks.update(u.key, u.changes)))
        
        set({ tasks: next, lastDailyCheckKey: todayKey })
      },

      skipPlan: (todayKey) => {
        set({ lastDailyCheckKey: todayKey })
      },

      updateSettings: (settings) => {
        set((state) => ({ settings: { ...state.settings, ...settings } }))
      },
      
      addXp: (amount) => {
          set((state) => {
              const newXp = state.xp + amount
              return { xp: newXp, level: Math.floor(newXp / 100) + 1 }
          })
      },

      performUndo: async () => {
        const { undo } = get()
        if (!undo) return
        
        // Complex sync back to DB:
        // Clear everything first in dexie and dump the snapshot backwards
        await db.tasks.clear()
        await db.sessions.clear()
        
        if (undo.snapshot.tasks.length) await db.tasks.bulkAdd(undo.snapshot.tasks)
        if (undo.snapshot.sessions.length) await db.sessions.bulkAdd(undo.snapshot.sessions)
        
        set({
          tasks: undo.snapshot.tasks,
          sessions: undo.snapshot.sessions,
          activeTimer: undo.snapshot.activeTimer,
          undo: null
        })
      },

      clearUndo: () => {
        set({ undo: null })
      },

      stopAlarm: () => {
        stopBuzzer()
        set({ isAlarmRinging: false })
      }
    }),
    {
      name: 'momentum-todo-state-zustand',
      partialize: (state) => ({
        // only persist non-db stuff to local storage
        settings: state.settings,
        activeTimer: state.activeTimer,
        lastDailyCheckKey: state.lastDailyCheckKey,
        xp: state.xp,
        level: state.level
        // note: tasks and sessions are saved to dexie manually, so we don't save them in local storage.
      })
    }
  )
)
