import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from '@/pages/HomePage'
import PlatformPage from '@/pages/PlatformPage'
import ListeningPage from '@/pages/ListeningPage'
import SpinTrackerPage from '@/pages/SpinTrackerPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/platforms/:platformId" element={<PlatformPage />} />
        <Route path="/listening" element={<ListeningPage />} />
        <Route path="/spin-tracker" element={<SpinTrackerPage />} />
      </Routes>
    </BrowserRouter>
  )
}
