import useNow from '../hooks/useNow'
import { Link } from 'wouter'
import { Rocket } from 'lucide-react'

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

function formatTime(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}


export default function Topbar() {
  const now = useNow()
  const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000)
  return (
    <header
      role="banner"
      aria-label="Top bar"
      className="flex items-center justify-between p-3 sm:p-6 gap-3 w-full"
    >
      <h1 className="flex-1 min-w-0 text-sm md:text-base lg:text-2xl font-bold">
        <Link
          href="/"
          aria-label="Home — SpaceX Upcoming Launches"
          className="!text-white !no-underline !hover:text-[var(--accent)] !transition-colors block px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] overflow-hidden"
        >
          {/*
            - Rocket icon on small screens (up to md-1)
            - Truncated title on md screens
            - Full title on lg and up
          */}
          <Rocket className="block md:hidden w-6 h-6 text-white" aria-hidden="true" />
          {/* On md (iPad Mini) allow the title to wrap to two lines; on lg show single-line title */}
          <span className="hidden md:inline-block md:text-3xl lg:hidden whitespace-normal leading-tight">SpaceX Upcoming Launches</span>
          <span className="hidden lg:inline-block lg:text-4xl truncate">SpaceX Upcoming Launches</span>
        </Link>
      </h1>

      <div className="flex flex-col items-end text-gray-600 ml-4 space-y-0" aria-hidden={false}>
        {/* UTC time (first line) */}
        <div className="flex place-items-baseline whitespace-nowrap" aria-live="polite" aria-atomic="true">
          <span className="sr-only">Coordinated Universal Time</span>
          <span className="text-xs sm:text-xs text-gray-400 mr-1">UTC</span>
          <time
            dateTime={utc.toISOString()}
            className="text-base sm:text-lg font-semibold time-mono"
            style={{ color: 'var(--accent)' }}
          >
            {formatTime(utc)}
          </time>
        </div>

        {/* Local time with offset (second line) */}
        <div className="flex place-items-baseline whitespace-nowrap" aria-live="polite" aria-atomic="true">
          <span className="sr-only">Local time and timezone offset</span>
          <span aria-hidden className="text-xs sm:text-xs text-gray-400 mr-1">
            {Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local'}
          </span>
          <time
            dateTime={now.toISOString()}
            className="text-base sm:text-lg font-semibold time-mono"
            style={{ color: 'var(--accent)' }}
          >
            {formatTime(now)}
          </time>
        </div>
      </div>
    </header>
  )
}
