import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { VertexaCloudLoginPage } from './VertexaCloudLoginPage'
import { DEMO_VERTEXA_PROVIDER_LOGIN_EMAIL } from '../demoTenant'
import { clearProviderServicesSelected } from '../providerSetup/storage'

export function ProviderLoginPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  return (
    <VertexaCloudLoginPage
      defaultUsername={DEMO_VERTEXA_PROVIDER_LOGIN_EMAIL}
      isLandingPageLoading={isLoading}
      onLoginSuccess={() => {
        setIsLoading(true)
        clearProviderServicesSelected()
        window.setTimeout(() => navigate('/provider/workspace'), 600)
      }}
      onChooseAnotherInstitution={() => navigate('/')}
    />
  )
}
