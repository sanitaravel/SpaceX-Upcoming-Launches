import { useEffect, useState } from 'react'

// Module-scoped now + subscribers to ensure a single interval for the whole app.
let now = new Date()
const subs = new Set<(d: Date) => void>()
let timer: ReturnType<typeof setInterval> | null = null

function tick() {
  now = new Date()
  for (const s of subs) s(now)
}

function ensureTimer() {
  if (timer) return
  timer = setInterval(tick, 1000)
}

export default function useNow() {
  const [t, setT] = useState(now)
  useEffect(() => {
    subs.add(setT)
    // push current value immediately
    setT(now)
    ensureTimer()
    return () => {
      subs.delete(setT)
    }
  }, [])
  return t
}
