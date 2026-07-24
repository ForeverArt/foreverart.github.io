import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './styles.css'
import Sidebar from './Sidebar'
import DashboardPage      from './pages/DashboardPage'
import KnowledgePage      from './pages/KnowledgePage'
import FeatureLabPage     from './pages/FeatureLabPage'
import RuleStudioPage     from './pages/RuleStudioPage'
import AnalysisViewerPage from './pages/AnalysisViewerPage'
import DatasetPage        from './pages/DatasetPage'
import ValidationLabPage  from './pages/ValidationLabPage'
import AIWorkspacePage    from './pages/AIWorkspacePage'

export default function App() {
  return (
    <BrowserRouter basename="/dashboard">
      <div className="layout">
        <Sidebar />
        <main className="main">
          <Routes>
            <Route path="/"           element={<DashboardPage />} />
            <Route path="/knowledge"  element={<KnowledgePage />} />
            <Route path="/features"   element={<FeatureLabPage />} />
            <Route path="/rules"      element={<RuleStudioPage />} />
            <Route path="/analysis"   element={<AnalysisViewerPage />} />
            <Route path="/dataset"    element={<DatasetPage />} />
            <Route path="/validation" element={<ValidationLabPage />} />
            <Route path="/workspace"  element={<AIWorkspacePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
