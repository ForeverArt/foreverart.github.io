import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from '@/pages/HomePage'
import PlatformPage from '@/pages/PlatformPage'
import ListeningPage from '@/pages/ListeningPage'
import NewsPage from '@/pages/NewsPage'
import SpinTrackerPage from '@/pages/SpinTrackerPage'
import SpinAnalysisPage from '@/pages/SpinAnalysisPage'
import { IS_FS_DOMAIN, IS_NEWS_DOMAIN, fsUrl } from '@/lib/domain'

function ExternalRedirect({ url }: { url: string }) {
  useEffect(() => { window.location.href = url }, [url])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* News domain root → NewsPage */}
        {IS_NEWS_DOMAIN && (
          <Route path="/" element={<NewsPage />} />
        )}

        {/* Hub domain root */}
        {!IS_NEWS_DOMAIN && (
          <Route path="/" element={IS_FS_DOMAIN ? <PlatformPage /> : <HomePage />} />
        )}

        <Route path="/platforms/:platformId" element={<PlatformPage />} />

        {/* News — available on hub, on news domain it's just / */}
        <Route path="/news" element={<NewsPage />} />

        {/* Figure skating — on hub domain, redirect to app.foreverart.vip */}
        <Route path="/spin-tracker" element={IS_FS_DOMAIN ? <SpinTrackerPage /> : <ExternalRedirect url={fsUrl('/spin-tracker')} />} />
        <Route path="/spin-analysis" element={IS_FS_DOMAIN ? <SpinAnalysisPage /> : <ExternalRedirect url={fsUrl('/spin-analysis')} />} />

        {/* Life tools — on FS domain, redirect to hub */}
        <Route path="/listening" element={IS_FS_DOMAIN ? <ExternalRedirect url="https://foreverart.github.io/listening" /> : <ListeningPage />} />
      </Routes>
    </BrowserRouter>
  )
}
