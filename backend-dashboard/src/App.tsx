import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './styles.css'
import LoginGate, { AuthProvider } from './LoginGate'
import Sidebar from './Sidebar'
import DashboardPage      from './pages/DashboardPage'
import KnowledgePage      from './pages/KnowledgePage'
import KnowledgeGraphPage from './pages/KnowledgeGraphPage'
import FeatureLabPage     from './pages/FeatureLabPage'
import RuleStudioPage     from './pages/RuleStudioPage'
import PromptCenterPage   from './pages/PromptCenterPage'
import PoseVisualizerPage from './pages/PoseVisualizerPage'
import AnalysisViewerPage from './pages/AnalysisViewerPage'
import DatasetPage        from './pages/DatasetPage'
import ValidationLabPage  from './pages/ValidationLabPage'
import AIWorkspacePage    from './pages/AIWorkspacePage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/dashboard">
        <LoginGate>
          <div className="layout">
            <Sidebar />
            <main className="main">
              <Routes>
                <Route path="/"           element={<DashboardPage />} />
                <Route path="/knowledge"  element={<KnowledgePage />} />
                <Route path="/graph"      element={<KnowledgeGraphPage />} />
                <Route path="/features"   element={<FeatureLabPage />} />
                <Route path="/rules"      element={<RuleStudioPage />} />
                <Route path="/prompts"    element={<PromptCenterPage />} />
                <Route path="/pose"       element={<PoseVisualizerPage />} />
                <Route path="/analysis"   element={<AnalysisViewerPage />} />
                <Route path="/dataset"    element={<DatasetPage />} />
                <Route path="/validation" element={<ValidationLabPage />} />
                <Route path="/workspace"  element={<AIWorkspacePage />} />
              </Routes>
            </main>
          </div>
        </LoginGate>
      </BrowserRouter>
    </AuthProvider>
  )
}
