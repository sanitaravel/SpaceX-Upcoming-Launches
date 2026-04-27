export default function LaunchCardSkeleton() {
  return (
    <article className="border rounded-md p-4 h-full shadow-sm animate-pulse" style={{backgroundColor: 'transparent'}}>
      {/* Desktop */}
      <div className="hidden md:flex items-center gap-6 h-full">
        <div className="w-56 h-60 rounded-md flex-shrink-0 skeleton" />
        <div className="flex-1">
          <div className="h-6 rounded w-3/5 mb-3 skeleton" />
          <div className="h-4 rounded w-1/3 mb-2 skeleton-2" />
          <div className="h-4 rounded w-1/4 mb-2 skeleton-2" />
          <div className="h-4 rounded w-2/3 mt-3 skeleton" />
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden flex gap-4 items-center">
        <div className="w-28 h-24 rounded skeleton" />
        <div className="flex-1">
          <div className="h-5 rounded w-3/4 mb-2 skeleton" />
          <div className="h-4 rounded w-1/2 skeleton-2" />
        </div>
      </div>
    </article>
  )
}
