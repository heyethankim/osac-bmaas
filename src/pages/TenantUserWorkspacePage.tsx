import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { TenantUserAcceptInvitationPanel } from '../components/tenant-user/TenantUserAcceptInvitationPanel'
import { TenantShell } from '../components/tenant/TenantShell'
import { DEMO_TENANT_DISPLAY_USER, isDemoTenantId } from '../demoTenant'
import { getRegisteredOrganizationBySlug } from '../tenantAdmin/organizations'
import { getTenantUserProjectInvitation } from '../tenantUser/invitation'
import type { TenantInstance } from '../tenantUser/instances'
import {
  getTenantUserActiveNav,
  getTenantUserInstances,
  isTenantUserOnboardingComplete,
  setTenantUserActiveNav,
  setTenantUserOnboardingComplete,
  type TenantUserNavId,
} from '../tenantUser/storage'
import { TENANT_USER_NAV_ITEMS } from '../tenantShell/constants'
import { TenantUserActivityLogPage } from './tenant-user/TenantUserActivityLogPage'
import { TenantUserCatalogPage } from './tenant-user/TenantUserCatalogPage'
import { TenantUserInstancesPage } from './tenant-user/TenantUserInstancesPage'
import { getProviderCatalogDraft } from '../providerSetup/storage'

export function TenantUserWorkspacePage() {
  const { tenant } = useParams<{ tenant: string }>()

  if (!tenant || !isDemoTenantId(tenant) || tenant !== 'northstar') {
    return <Navigate to="/" replace />
  }

  const [onboardingComplete, setOnboardingComplete] = useState(() =>
    isTenantUserOnboardingComplete(tenant),
  )
  const [activeNavId, setActiveNavId] = useState<TenantUserNavId>(() => getTenantUserActiveNav(tenant))
  const [instances, setInstances] = useState<TenantInstance[]>(() => getTenantUserInstances(tenant))

  const organization = getRegisteredOrganizationBySlug(tenant)
  const catalogDraft = getProviderCatalogDraft()
  const invitation = getTenantUserProjectInvitation(tenant, organization)
  const displayName = DEMO_TENANT_DISPLAY_USER[tenant]

  const handleNavChange = (navId: string) => {
    const nextNavId = navId as TenantUserNavId
    setActiveNavId(nextNavId)
    setTenantUserActiveNav(tenant, nextNavId)
  }

  const handleInvitationAccepted = () => {
    setTenantUserOnboardingComplete(tenant)
    setOnboardingComplete(true)
    setActiveNavId('catalog')
    setTenantUserActiveNav(tenant, 'catalog')
  }

  const renderWorkspaceContent = () => {
    if (!onboardingComplete) {
      return (
        <TenantUserAcceptInvitationPanel
          invitation={invitation}
          onAccept={handleInvitationAccepted}
        />
      )
    }

    switch (activeNavId) {
      case 'my-instances':
        return (
          <TenantUserInstancesPage
            tenantSlug={tenant}
            instances={instances}
            onInstancesChange={setInstances}
          />
        )
      case 'activity-log':
        return <TenantUserActivityLogPage />
      case 'catalog':
      default:
        return (
          <TenantUserCatalogPage
            tenantSlug={tenant}
            organization={organization}
            catalogDraft={catalogDraft}
            projectName={invitation.projectName}
            onInstanceProvisioned={setInstances}
            onNavigateToInstances={() => handleNavChange('my-instances')}
          />
        )
    }
  }

  return (
    <TenantShell
      role="tenant-user"
      displayName={displayName}
      navItems={TENANT_USER_NAV_ITEMS}
      showNavigation={onboardingComplete}
      activeNavId={activeNavId}
      onNavChange={handleNavChange}
      isOnboardingLayout={!onboardingComplete}
    >
      {renderWorkspaceContent()}
    </TenantShell>
  )
}
