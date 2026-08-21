import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ConceptualDesignSticker } from './components/ConceptualDesignSticker'
import { BmaasLandingPage } from './pages/BmaasLandingPage'
import { IdpManagerSetupPage } from './pages/IdpManagerSetupPage'
import { IdpManagerWorkspacePage } from './pages/IdpManagerWorkspacePage'
import { ProviderAdminWorkspacePage } from './pages/ProviderAdminWorkspacePage'
import { ProviderLoginPage } from './pages/ProviderLoginPage'
import { TenantAdminSampleCatalogPage } from './pages/TenantAdminSampleCatalogPage'
import { TenantAdminWorkspacePage } from './pages/TenantAdminWorkspacePage'
import { TenantLoginPage } from './pages/TenantLoginPage'
import { TenantUserWorkspacePage } from './pages/TenantUserWorkspacePage'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ConceptualDesignSticker />
      <Routes>
        <Route path="/" element={<BmaasLandingPage />} />
        <Route path="/idp-manager/:orgSlug/change-password" element={<IdpManagerSetupPage />} />
        <Route path="/idp-manager/:orgSlug/workspace" element={<IdpManagerWorkspacePage />} />
        <Route path="/idp-manager/:orgSlug" element={<IdpManagerSetupPage />} />
        <Route path="/idp-manager" element={<IdpManagerSetupPage />} />
        <Route path="/idp-setup/:token" element={<IdpManagerSetupPage />} />
        <Route path="/provider" element={<ProviderLoginPage />} />
        <Route path="/provider/setup" element={<Navigate to="/provider/workspace" replace />} />
        <Route path="/provider/workspace" element={<ProviderAdminWorkspacePage />} />
        <Route path="/tenant-admin/catalog-sample" element={<TenantAdminSampleCatalogPage />} />
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
