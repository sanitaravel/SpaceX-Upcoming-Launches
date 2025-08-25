import useNow from '../hooks/useNow'
import { Link } from 'wouter'

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

function formatTime(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function formatOffset(date: Date) {
  const offset = -date.getTimezoneOffset() // minutes east of UTC
  const sign = offset >= 0 ? '+' : '-'
  const abs = Math.abs(offset)
  const hours = Math.floor(abs / 60)
  const minutes = abs % 60
  return `UTC${sign}${pad(hours)}:${pad(minutes)}`
}

export default function Topbar() {
  const now = useNow()
  const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000)
  return (
    <div className="flex items-center justify-between p-6">
      <h1 className="text-2xl font-bold">
        <Link href="/" className="!text-white !no-underline !hover:text-[var(--accent)] !transition-colors">
            SpaceX Upcoming Launches
        </Link>
      </h1>
      <div className="flex flex-col items-end text-gray-600">
        <div className="whitespace-nowrap">
          <span className="text-xs text-gray-400 mr-2">UTC</span>
          <span className="text-lg font-semibold time-mono" style={{ color: 'var(--accent)' }}>
            {formatTime(utc)}
          </span>
        </div>
        <div className="whitespace-nowrap">
          <span className="text-xs text-gray-400 mr-2">Local <span className="text-xs text-gray-400">({formatOffset(now)})</span></span>
          <span className="text-lg font-semibold time-mono" style={{ color: 'var(--accent)' }}>
            {formatTime(now)}
          </span>
        </div>
      </div>
    </div>
  )
}
