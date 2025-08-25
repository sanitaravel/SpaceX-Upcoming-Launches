import LaunchList from './components/LaunchList'
import Topbar from './components/Topbar'

function App() {
  // enable mock data only during local development
  const useMock = import.meta.env.DEV;

  return (
    <main className="min-h-screen w-full">
      {/* topbar contains site name and clocks */}
      <Topbar />
      <LaunchList useMock={useMock} />
    </main>
  )
}

export default App
