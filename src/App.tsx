import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BmaasLandingPage } from './pages/BmaasLandingPage'
import { ProviderAdminWorkspacePage } from './pages/ProviderAdminWorkspacePage'
import { ProviderLoginPage } from './pages/ProviderLoginPage'
import { TenantAdminWorkspacePage } from './pages/TenantAdminWorkspacePage'
import { TenantLoginPage } from './pages/TenantLoginPage'
import { TenantUserWorkspacePage } from './pages/TenantUserWorkspacePage'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<BmaasLandingPage />} />
        <Route path="/provider" element={<ProviderLoginPage />} />
        <Route path="/provider/setup" element={<Navigate to="/provider/workspace" replace />} />
        <Route path="/provider/workspace" element={<ProviderAdminWorkspacePage />} />
        <Route path="/tenant-admin/:tenant" element={<TenantLoginPage role="tenant-admin" />} />
        <Route
          path="/tenant-admin/:tenant/workspace"
          element={<TenantAdminWorkspacePage />}
        />
        <Route path="/tenant-user/:tenant" element={<TenantLoginPage role="tenant-user" />} />
        <Route
          path="/tenant-user/:tenant/workspace"
          element={<TenantUserWorkspacePage />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
