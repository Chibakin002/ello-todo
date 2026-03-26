import type { RepeatRule, Task } from './types'

export const weekdayOptions = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function dayKey(value: string | number | Date): string {
  const date = new Date(value)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toLocalMidday(value: string | number | Date): Date {
  const date = new Date(value)
  date.setHours(12, 0, 0, 0)
  return date
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

export function ordinal(value: number): string {
  const mod10 = value % 10
  const mod100 = value % 100
  if (mod10 === 1 && mod100 !== 11) return `${value}st`
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`
  return `${value}th`
}

export function normalizeRepeatSchedule(
  repeat: RepeatRule,
  options: { repeatDayOfWeek?: number; repeatDayOfMonth?: number } = {},
  referenceValue: string | number | Date = Date.now(),
): Pick<Task, 'repeatDayOfWeek' | 'repeatDayOfMonth'> {
  const reference = new Date(referenceValue)

  if (repeat === 'weekly') {
    const day = typeof options.repeatDayOfWeek === 'number' && options.repeatDayOfWeek >= 0 && options.repeatDayOfWeek <= 6
      ? options.repeatDayOfWeek
      : reference.getDay()
    return { repeatDayOfWeek: day, repeatDayOfMonth: undefined }
  }

  if (repeat === 'monthly') {
    const rawDay = typeof options.repeatDayOfMonth === 'number' ? options.repeatDayOfMonth : reference.getDate()
    const day = Math.min(31, Math.max(1, Math.floor(rawDay)))
    return { repeatDayOfWeek: undefined, repeatDayOfMonth: day }
  }

  return { repeatDayOfWeek: undefined, repeatDayOfMonth: undefined }
}

export function computeNextVisibleOn(
  task: Pick<Task, 'repeat' | 'repeatDayOfWeek' | 'repeatDayOfMonth'>,
  completedAt: string | number | Date,
): string | undefined {
  const completedDate = toLocalMidday(completedAt)

  if (task.repeat === 'daily') {
    completedDate.setDate(completedDate.getDate() + 1)
    return dayKey(completedDate)
  }

  if (task.repeat === 'weekly') {
    const targetDay = typeof task.repeatDayOfWeek === 'number' ? task.repeatDayOfWeek : completedDate.getDay()
    const delta = (targetDay - completedDate.getDay() + 7) % 7 || 7
    completedDate.setDate(completedDate.getDate() + delta)
    return dayKey(completedDate)
  }

  if (task.repeat === 'monthly') {
    const targetDay = typeof task.repeatDayOfMonth === 'number' ? task.repeatDayOfMonth : completedDate.getDate()
    let year = completedDate.getFullYear()
    let month = completedDate.getMonth()
    let candidateDay = Math.min(targetDay, daysInMonth(year, month))

    if (candidateDay <= completedDate.getDate()) {
      month += 1
      if (month > 11) {
        month = 0
        year += 1
      }
      candidateDay = Math.min(targetDay, daysInMonth(year, month))
    }

    return dayKey(new Date(year, month, candidateDay, 12))
  }

  return undefined
}

export function normalizeNextVisibleOn(
  nextVisibleOn?: string,
  referenceValue: string | number | Date = Date.now(),
): string | undefined {
  if (!nextVisibleOn || !DAY_KEY_PATTERN.test(nextVisibleOn)) return undefined
  const referenceDay = dayKey(referenceValue)
  return nextVisibleOn > referenceDay ? nextVisibleOn : undefined
}

export function isTaskVisible(task: Task, todayKey: string = dayKey(Date.now())): boolean {
  return task.status === 'active' && (!task.nextVisibleOn || task.nextVisibleOn <= todayKey)
}

export function getVisibleTasks(tasks: Task[], todayKey: string = dayKey(Date.now())): Task[] {
  return tasks.filter((task) => isTaskVisible(task, todayKey))
}

export function formatDayLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`))
}

export function getRepeatLabel(task: Pick<Task, 'repeat' | 'repeatDayOfWeek' | 'repeatDayOfMonth' | 'createdAt'>): string | null {
  if (task.repeat === 'none') return null
  if (task.repeat === 'daily') return 'Daily'
  if (task.repeat === 'weekly') {
    const fallbackDay = task.createdAt ? new Date(task.createdAt).getDay() : 0
    return `Weekly on ${weekdayOptions[task.repeatDayOfWeek ?? fallbackDay]}`
  }
  const fallbackDay = task.createdAt ? new Date(task.createdAt).getDate() : 1
  return `Monthly on the ${ordinal(task.repeatDayOfMonth ?? fallbackDay)}`
}

export function getVisibilityLabel(task: Pick<Task, 'nextVisibleOn'>): string | null {
  return task.nextVisibleOn ? `Starts ${formatDayLabel(task.nextVisibleOn)}` : null
}
