import { Link } from 'wouter'

export default function BottomBar() {
  return (
    <footer className="w-full bg-[#242424] text-gray-200 py-4 px-6 border-t border-gray-700">
      <div className="max-w-5xl mx-auto flex items-center justify-between text-sm">
        <div>
          <Link href="/privacy" className="underline decoration-dotted decoration-1 hover:text-white">Privacy Policy</Link>
        </div>
        <div>
          <Link href="/author" className="underline decoration-dotted decoration-1 hover:text-white">Author</Link>
        </div>
      </div>
    </footer>
  )
}
