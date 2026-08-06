import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { OsacSignInPage } from './OsacSignInPage'
import { VertexaCloudLoginPage } from './VertexaCloudLoginPage'
import { DEMO_VERTEXA_PROVIDER_LOGIN_EMAIL } from '../demoTenant'
import { ensureProviderPostSetupPrototype } from '../providerSetup/prototypeEntry'

type LoginStep = 'osac' | 'vertexa'

const OSAC_CONTINUE_DELAY_MS = 1500

export function ProviderLoginPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<LoginStep>('osac')
  const [isOsacContinuing, setIsOsacContinuing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isOsacContinuing) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setIsOsacContinuing(false)
      setStep('vertexa')
    }, OSAC_CONTINUE_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [isOsacContinuing])

  if (step === 'osac') {
    return (
      <OsacSignInPage
        defaultEmail={DEMO_VERTEXA_PROVIDER_LOGIN_EMAIL}
        isContinuing={isOsacContinuing}
        onNext={() => setIsOsacContinuing(true)}
      />
    )
  }

  return (
    <VertexaCloudLoginPage
      defaultUsername={DEMO_VERTEXA_PROVIDER_LOGIN_EMAIL}
      isLandingPageLoading={isLoading}
      onLoginSuccess={() => {
        setIsLoading(true)
        // Enter → auth lands on the finished Overview workspace (not first-time setup).
        ensureProviderPostSetupPrototype('overview')
        window.setTimeout(() => navigate('/provider/workspace?nav=overview'), 600)
      }}
      onChooseAnotherInstitution={() => navigate('/')}
    />
  )
}
