import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ClientProvider } from './context/ClientContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/AppShell'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import BankingPage from './pages/banking/BankingPage'
import WantsAnalysisPage from './pages/wants-analysis/WantsAnalysisPage'
import RetirementPage from './pages/retirement/RetirementPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ClientProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <Routes>
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/banking" element={<BankingPage />} />
                      <Route path="/wants-analysis" element={<WantsAnalysisPage />} />
                      <Route path="/retirement" element={<RetirementPage />} />
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </AppShell>
                </ProtectedRoute>
              }
            />
          </Routes>
        </ClientProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
