import LaunchCard from './LaunchCard'
import { useUpcomingLaunches } from '../hooks/useUpcomingLaunches'

export default function LaunchList() {
  const { data, loading, error } = useUpcomingLaunches()

  if (loading) return <div className="p-6">Loading upcoming launches…</div>
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>
  if (!data || data.length === 0) return <div className="p-6">No upcoming launches found.</div>

  const sorted = [...data].sort((a, b) => {
    // compare dates
    const da = a.launchDate
    const db = b.launchDate
    if (da < db) return -1
    if (da > db) return 1
    // if same day, compare times (nullable)
    const ta = a.launchTime ?? ''
    const tb = b.launchTime ?? ''
    if (ta < tb) return -1
    if (ta > tb) return 1
    return 0
  })

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 auto-rows-min">
      {sorted.map((l) => (
        <LaunchCard key={l.id} launch={l} />
      ))}
    </div>
  )
}
