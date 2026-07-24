import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { NorthstarBankLoginPage } from './NorthstarBankLoginPage'
import {
  DEMO_TENANT_LOGIN_EMAIL_ADMIN,
  DEMO_TENANT_LOGIN_EMAIL_USER,
  isDemoTenantId,
} from '../demoTenant'
import { getRegisteredOrganizationBySlug } from '../tenantAdmin/organizations'
import { clearTenantOnboardingComplete } from '../tenantAdmin/storage'
import { clearTenantUserOnboardingComplete } from '../tenantUser/storage'
import { clearProviderViewingAsTenantUser } from '../providerAdmin/openAsTenantUser'

type TenantLoginPageProps = {
  role: 'tenant-admin' | 'tenant-user'
}

export function TenantLoginPage({ role }: TenantLoginPageProps) {
  const navigate = useNavigate()
  const { tenant } = useParams<{ tenant: string }>()
  const [isLoading, setIsLoading] = useState(false)

  if (!tenant || !isDemoTenantId(tenant) || tenant !== 'northstar') {
    return <Navigate to="/" replace />
  }

  const organization = getRegisteredOrganizationBySlug(tenant)
  const defaultUsername =
    role === 'tenant-admin'
      ? (organization?.tenantAdminEmail ?? DEMO_TENANT_LOGIN_EMAIL_ADMIN.northstar)
      : DEMO_TENANT_LOGIN_EMAIL_USER.northstar

  return (
    <NorthstarBankLoginPage
      defaultUsername={defaultUsername}
      isLandingPageLoading={isLoading}
      onLoginSuccess={() => {
        if (role === 'tenant-admin') {
          clearTenantOnboardingComplete(tenant)
        }
        if (role === 'tenant-user') {
          clearTenantUserOnboardingComplete(tenant)
          clearProviderViewingAsTenantUser()
        }
        setIsLoading(true)
        window.setTimeout(() => navigate(`/${role}/northstar/workspace`), 600)
      }}
      onChooseAnotherInstitution={() => navigate('/')}
    />
  )
}
