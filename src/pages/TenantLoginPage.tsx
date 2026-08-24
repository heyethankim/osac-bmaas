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
import { resolveTenantWorkspaceRoleForEmail } from '../tenantAdmin/administrators'
import { getRegisteredOrganizationBySlug } from '../tenantAdmin/organizations'
import { setTenantOnboardingComplete } from '../tenantAdmin/storage'
import { setTenantUserOnboardingComplete } from '../tenantUser/storage'

type TenantWorkspaceRole = 'tenant-admin' | 'tenant-user'

type TenantLoginPageProps = {
  /** When set, this is a demo shortcut. OSAC login infers workspace from assigned roles. */
  role?: TenantWorkspaceRole
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
  const defaultEmail = role
    ? role === 'tenant-admin'
      ? (organization?.tenantAdminEmail ?? DEMO_TENANT_LOGIN_EMAIL_ADMIN.northsummit)
      : DEMO_TENANT_LOGIN_EMAIL_USER.northsummit
    : ''

  const completeLogin = (username: string) => {
    const workspaceRole: TenantWorkspaceRole =
      role ??
      (organization
        ? resolveTenantWorkspaceRoleForEmail(organization, username)
        : 'tenant-user')

    activateProviderRegisteredOrganizationBySlug(tenant)
    if (workspaceRole === 'tenant-admin') {
      setTenantOnboardingComplete(tenant)
    } else {
      setTenantUserOnboardingComplete(tenant)
      clearProviderViewingAsTenantUser()
    }
    setIsNorthsummitLoading(true)
    window.setTimeout(() => navigate(`/${workspaceRole}/northsummit/workspace`), 600)
  }

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
      onLoginSuccess={completeLogin}
      onChooseAnotherInstitution={() => navigate('/')}
    />
  )
}
