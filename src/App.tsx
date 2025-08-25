import LaunchList from './components/LaunchList'
import Topbar from './components/Topbar'

function App() {
  return (
    <main className="min-h-screen w-full">
      {/* topbar contains site name and clocks */}
      <Topbar />
      <LaunchList useMock={true} />
    </main>
  )
}

export default App
