import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { NorthsummitBankLoginPage } from './NorthsummitBankLoginPage'
import { OsacSignInPage } from './OsacSignInPage'
import {
  DEMO_TENANT_LOGIN_EMAIL_ADMIN,
  DEMO_TENANT_LOGIN_EMAIL_USER,
  isDemoTenantId,
} from '../demoTenant'
import { clearProviderViewingAsTenantUser } from '../providerAdmin/openAsTenantUser'
import { activateProviderRegisteredOrganizationBySlug } from '../providerSetup/storage'
import { getRegisteredOrganizationBySlug } from '../tenantAdmin/organizations'
import { setTenantOnboardingComplete } from '../tenantAdmin/storage'
import { setTenantUserOnboardingComplete } from '../tenantUser/storage'

type TenantLoginPageProps = {
  role: 'tenant-admin' | 'tenant-user'
}

type LoginStep = 'osac' | 'northsummit'

const OSAC_CONTINUE_DELAY_MS = 1500

export function TenantLoginPage({ role }: TenantLoginPageProps) {
  const navigate = useNavigate()
  const { tenant } = useParams<{ tenant: string }>()
  const [step, setStep] = useState<LoginStep>('osac')
  const [isOsacContinuing, setIsOsacContinuing] = useState(false)
  const [isNorthsummitLoading, setIsNorthsummitLoading] = useState(false)

  useEffect(() => {
    if (!isOsacContinuing) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setIsOsacContinuing(false)
      setStep('northsummit')
    }, OSAC_CONTINUE_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [isOsacContinuing])

  if (!tenant || !isDemoTenantId(tenant) || tenant !== 'northsummit') {
    return <Navigate to="/" replace />
  }

  const organization = getRegisteredOrganizationBySlug(tenant)
  const defaultEmail =
    role === 'tenant-admin'
      ? (organization?.tenantAdminEmail ?? DEMO_TENANT_LOGIN_EMAIL_ADMIN.northsummit)
      : DEMO_TENANT_LOGIN_EMAIL_USER.northsummit

  if (step === 'osac') {
    return (
      <OsacSignInPage
        defaultEmail={defaultEmail}
        isContinuing={isOsacContinuing}
        onNext={() => setIsOsacContinuing(true)}
      />
    )
  }

  return (
    <NorthsummitBankLoginPage
      defaultUsername={defaultEmail}
      isLandingPageLoading={isNorthsummitLoading}
      onLoginSuccess={() => {
        activateProviderRegisteredOrganizationBySlug(tenant)
        if (role === 'tenant-admin') {
          setTenantOnboardingComplete(tenant)
        } else {
          setTenantUserOnboardingComplete(tenant)
          clearProviderViewingAsTenantUser()
        }
        setIsNorthsummitLoading(true)
        window.setTimeout(() => navigate(`/${role}/northsummit/workspace`), 600)
      }}
      onChooseAnotherInstitution={() => navigate('/')}
    />
  )
}
