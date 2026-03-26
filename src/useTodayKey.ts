import { useEffect, useState } from 'react'
import { dayKey } from './store'

export function useTodayKey(): string {
  const [todayKey, setTodayKey] = useState(() => dayKey(Date.now()))

  useEffect(() => {
    const intervalId = window.setInterval(() => setTodayKey(dayKey(Date.now())), 60_000)
    return () => window.clearInterval(intervalId)
  }, [])

  return todayKey
}
