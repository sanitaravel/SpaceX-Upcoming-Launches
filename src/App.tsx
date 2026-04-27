import LaunchList from './components/LaunchList'
import Topbar from './components/Topbar'
import BottomBar from './components/BottomBar'
import { Route, Router } from 'wouter'
import Privacy from './pages/Privacy'
import Author from './pages/Author'
import LaunchDetail from './pages/LaunchDetail'

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col w-full">
        <Topbar />

  <main className="flex-1 px-6 py-6">
          <Route path="/">
            <LaunchList />
          </Route>

          <Route path="/launch/:id">
            <LaunchDetail />
          </Route>

          <Route path="/privacy">
            <Privacy />
          </Route>

          <Route path="/author">
            <Author />
          </Route>
        </main>

        <BottomBar />
      </div>
    </Router>
  )
}

export default App
