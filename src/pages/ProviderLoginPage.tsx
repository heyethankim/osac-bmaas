import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { VertexaCloudLoginPage } from './VertexaCloudLoginPage'
import { DEMO_VERTEXA_PROVIDER_LOGIN_EMAIL } from '../demoTenant'
import {
  clearProviderServicesSelected,
  clearProviderSetupComplete,
} from '../providerSetup/storage'

export function ProviderLoginPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  return (
    <VertexaCloudLoginPage
      defaultUsername={DEMO_VERTEXA_PROVIDER_LOGIN_EMAIL}
      isLandingPageLoading={isLoading}
      onLoginSuccess={() => {
        setIsLoading(true)
        // Enter → auth always starts first-time setup (welcome / service selection).
        clearProviderSetupComplete()
        clearProviderServicesSelected()
        window.setTimeout(() => navigate('/provider/setup'), 600)
      }}
      onChooseAnotherInstitution={() => navigate('/')}
    />
  )
}
