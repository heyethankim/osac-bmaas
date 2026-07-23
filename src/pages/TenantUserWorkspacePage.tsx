import { useCallback, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { TenantUserAcceptInvitationPanel } from '../components/tenant-user/TenantUserAcceptInvitationPanel'
import { TenantShell } from '../components/tenant/TenantShell'
import { DEMO_TENANT_DISPLAY_USER, isDemoTenantId } from '../demoTenant'
import { getRegisteredOrganizationBySlug } from '../tenantAdmin/organizations'
import { getTenantUserProjectInvitation } from '../tenantUser/invitation'
import type { TenantInstance } from '../tenantUser/instances'
import {
  addTenantUserInstance,
  getTenantUserActiveNav,
  getTenantUserInstances,
  isTenantUserOnboardingComplete,
  setTenantUserActiveNav,
  setTenantUserOnboardingComplete,
  updateTenantUserInstance,
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
  const [showBackgroundProvisioningNotice, setShowBackgroundProvisioningNotice] = useState(false)

  const organization = getRegisteredOrganizationBySlug(tenant)
  const catalogDraft = getProviderCatalogDraft()
  const invitation = getTenantUserProjectInvitation(tenant, organization)
  const displayName = DEMO_TENANT_DISPLAY_USER[tenant]

  const handleNavChange = useCallback(
    (navId: string) => {
      const nextNavId = navId as TenantUserNavId
      setActiveNavId(nextNavId)
      setTenantUserActiveNav(tenant, nextNavId)

      if (nextNavId !== 'my-instances') {
        setShowBackgroundProvisioningNotice(false)
      }
    },
    [tenant],
  )

  const handleNavigateToInstances = useCallback(
    (options?: { showBackgroundProvisioningNotice?: boolean }) => {
      setShowBackgroundProvisioningNotice(Boolean(options?.showBackgroundProvisioningNotice))
      handleNavChange('my-instances')
    },
    [handleNavChange],
  )

  const handleInvitationAccepted = () => {
    setTenantUserOnboardingComplete(tenant)
    setOnboardingComplete(true)
    setActiveNavId('catalog')
    setTenantUserActiveNav(tenant, 'catalog')
  }

  const handleProvisioningStarted = useCallback(
    (instance: TenantInstance) => {
      setInstances(addTenantUserInstance(tenant, instance))
    },
    [tenant],
  )

  const handleDismissDuringProvisioning = useCallback(
    (_instanceId: string) => {
      handleNavigateToInstances({ showBackgroundProvisioningNotice: true })
    },
    [handleNavigateToInstances],
  )

  const handleWizardFinished = useCallback(
    (instanceId: string) => {
      setInstances(
        updateTenantUserInstance(tenant, instanceId, {
          status: 'running',
          provisionedAt: new Date().toISOString(),
        }),
      )
      handleNavigateToInstances()
    },
    [handleNavigateToInstances, tenant],
  )

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
            showBackgroundProvisioningNotice={showBackgroundProvisioningNotice}
            onDismissBackgroundProvisioningNotice={() =>
              setShowBackgroundProvisioningNotice(false)
            }
          />
        )
      case 'activity-log':
        return <TenantUserActivityLogPage />
      case 'catalog':
      default:
        return (
          <TenantUserCatalogPage
            organization={organization}
            catalogDraft={catalogDraft}
            projectName={invitation.projectName}
            onProvisioningStarted={handleProvisioningStarted}
            onDismissDuringProvisioning={handleDismissDuringProvisioning}
            onWizardFinished={handleWizardFinished}
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
