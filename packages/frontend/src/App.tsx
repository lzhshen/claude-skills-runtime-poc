import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppStateProvider } from './hooks/useAppState'
import { ErrorBoundary } from './components/ErrorBoundary'
import MainPage from './pages/MainPage'

function App() {
  return (
    <ErrorBoundary>
      <AppStateProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainPage />} />
          </Routes>
        </BrowserRouter>
      </AppStateProvider>
    </ErrorBoundary>
  )
}

export default App
