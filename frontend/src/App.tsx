import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppStateProvider } from './hooks/useAppState'
import MainPage from './pages/MainPage'

function App() {
  return (
    <AppStateProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainPage />} />
        </Routes>
      </BrowserRouter>
    </AppStateProvider>
  )
}

export default App
