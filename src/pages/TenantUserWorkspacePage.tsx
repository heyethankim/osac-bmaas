import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { TenantShell } from '../components/tenant/TenantShell'
import { DEMO_TENANT_DISPLAY_USER, isDemoTenantId } from '../demoTenant'
import {
  getDemoTenantUserOrganization,
  getProviderViewingAsTenantUser,
} from '../providerAdmin/openAsTenantUser'
import { getProviderRegisteredOrganizations, activateProviderRegisteredOrganizationBySlug } from '../providerSetup/storage'
import { getProviderCatalogDraft, getProviderCatalogItems } from '../providerSetup/storage'
import type { CatalogServiceId } from '../providerSetup/templateDemo'
import { getRegisteredOrganizationBySlug } from '../tenantAdmin/organizations'
import { getTenantUserProjectInvitation } from '../tenantUser/invitation'
import {
  getTenantInstanceServiceId,
  type TenantInstance,
} from '../tenantUser/instances'
import { LAUNCH_INSTANCE_PROVISIONING_DURATION_MS, LAUNCH_INSTANCE_SERVICES_PROVISIONING_MS } from '../tenantUser/launchInstanceWizard'
import {
  addTenantUserInstance,
  ensureTenantDemoInstances,
  getTenantUserActiveNav,
  getTenantUserInstances,
  setTenantUserActiveNav,
  setTenantUserOnboardingComplete,
  updateTenantUserInstance,
  type TenantUserNavId,
} from '../tenantUser/storage'
import { TENANT_USER_NAV_ITEMS } from '../tenantShell/constants'
import { ProviderAdminSecurityGroupsPage } from './infrastructure/ProviderAdminSecurityGroupsPage'
import { ProviderAdminSubnetsPage } from './infrastructure/ProviderAdminSubnetsPage'
import { ProviderAdminVirtualNetworksPage } from './infrastructure/ProviderAdminVirtualNetworksPage'
import { TenantUserActivityLogPage } from './tenant-user/TenantUserActivityLogPage'
import { TenantUserCatalogPage } from './tenant-user/TenantUserCatalogPage'
import { TenantUserInstancesPage } from './tenant-user/TenantUserInstancesPage'

function isTenantUserNavId(value: string | null): value is TenantUserNavId {
  return (
    value === 'catalog' ||
    value === 'services-baremetal' ||
    value === 'services-clusters' ||
    value === 'services-models' ||
    value === 'services-virtual-machines' ||
    value === 'networking-virtual-networks' ||
    value === 'networking-subnets' ||
    value === 'networking-security-groups' ||
    value === 'activity-log'
  )
}

function isServicesNavId(navId: TenantUserNavId): boolean {
  return navId.startsWith('services-')
}

function getServicesNavId(serviceId: CatalogServiceId): TenantUserNavId {
  switch (serviceId) {
    case 'cluster':
      return 'services-clusters'
    case 'models':
      return 'services-models'
    case 'virtual-machine':
      return 'services-virtual-machines'
    case 'baremetal':
    default:
      return 'services-baremetal'
  }
}

function getLockedServiceIdFromNav(navId: TenantUserNavId): CatalogServiceId | null {
  switch (navId) {
    case 'services-baremetal':
      return 'baremetal'
    case 'services-clusters':
      return 'cluster'
    case 'services-models':
      return 'models'
    case 'services-virtual-machines':
      return 'virtual-machine'
    default:
      return null
  }
}

/** Seeds post-onboarding Tenant User state so landing-page prototype links can open finished screens. */
function ensureTenantUserPostOnboardingPrototype(tenantSlug: string, navId: TenantUserNavId) {
  setTenantUserOnboardingComplete(tenantSlug)
  setTenantUserActiveNav(tenantSlug, navId)
  activateProviderRegisteredOrganizationBySlug(tenantSlug)
}

function normalizeTenantUserNavParam(value: string | null): TenantUserNavId | null {
  if (isTenantUserNavId(value)) {
    return value
  }
  if (value === 'my-instances' || value === 'services') {
    return 'services-baremetal'
  }
  return null
}

function readInitialTenantUserNav(
  tenantSlug: string,
  searchParams: URLSearchParams,
): TenantUserNavId {
  const requestedNav = normalizeTenantUserNavParam(searchParams.get('nav'))
  if (requestedNav) {
    ensureTenantUserPostOnboardingPrototype(tenantSlug, requestedNav)
    return requestedNav
  }

  return getTenantUserActiveNav(tenantSlug)
}

export function TenantUserWorkspacePage() {
  const [searchParams] = useSearchParams()
  const { tenant } = useParams<{ tenant: string }>()
  const tenantSlug =
    tenant && isDemoTenantId(tenant) && tenant === 'northstar' ? tenant : 'northstar'
  const isValidTenant = Boolean(tenant && isDemoTenantId(tenant) && tenant === 'northstar')

  const [previewSession] = useState(() => getProviderViewingAsTenantUser())
  const [activeNavId, setActiveNavId] = useState<TenantUserNavId>(() =>
    isValidTenant ? readInitialTenantUserNav(tenantSlug, searchParams) : 'catalog',
  )
  const [instances, setInstances] = useState<TenantInstance[]>(() =>
    isValidTenant ? ensureTenantDemoInstances(tenantSlug) : [],
  )
  const [openVirtualNetworkId, setOpenVirtualNetworkId] = useState<string | null>(null)
  const [openSubnetId, setOpenSubnetId] = useState<string | null>(null)
  const [openSecurityGroupId, setOpenSecurityGroupId] = useState<string | null>(null)
  const provisioningTimersRef = useRef<Map<string, number>>(new Map())

  const clearProvisioningTimer = useCallback((instanceId: string) => {
    const timeoutId = provisioningTimersRef.current.get(instanceId)
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
      provisioningTimersRef.current.delete(instanceId)
    }
  }, [])

  const markInstanceRunning = useCallback(
    (instanceId: string) => {
      clearProvisioningTimer(instanceId)
      setInstances(
        updateTenantUserInstance(tenantSlug, instanceId, {
          status: 'running',
          provisionedAt: new Date().toISOString(),
        }),
      )
    },
    [clearProvisioningTimer, tenantSlug],
  )

  const scheduleProvisioningCompletion = useCallback(
    (instanceId: string, delayMs: number) => {
      clearProvisioningTimer(instanceId)
      const timeoutId = window.setTimeout(() => {
        markInstanceRunning(instanceId)
      }, Math.max(0, delayMs))
      provisioningTimersRef.current.set(instanceId, timeoutId)
    },
    [clearProvisioningTimer, markInstanceRunning],
  )

  useEffect(() => {
    if (!isValidTenant) {
      return
    }

    const now = Date.now()
    for (const instance of getTenantUserInstances(tenantSlug)) {
      if (instance.status !== 'provisioning') {
        continue
      }
      const elapsedMs = now - new Date(instance.createdAt).getTime()
      scheduleProvisioningCompletion(
        instance.id,
        LAUNCH_INSTANCE_PROVISIONING_DURATION_MS - elapsedMs,
      )
    }

    return () => {
      for (const timeoutId of provisioningTimersRef.current.values()) {
        window.clearTimeout(timeoutId)
      }
      provisioningTimersRef.current.clear()
    }
  }, [isValidTenant, scheduleProvisioningCompletion, tenantSlug])

  useLayoutEffect(() => {
    if (!isValidTenant) {
      return
    }

    setTenantUserOnboardingComplete(tenantSlug)
    activateProviderRegisteredOrganizationBySlug(tenantSlug)
    setInstances(ensureTenantDemoInstances(tenantSlug))

    const requestedNav = normalizeTenantUserNavParam(searchParams.get('nav'))
    if (!requestedNav) {
      return
    }

    ensureTenantUserPostOnboardingPrototype(tenantSlug, requestedNav)
    setActiveNavId(requestedNav)
  }, [isValidTenant, searchParams, tenantSlug])

  const handleNavChange = useCallback(
    (navId: string) => {
      const nextNavId = navId as TenantUserNavId
      setActiveNavId(nextNavId)
      setTenantUserActiveNav(tenantSlug, nextNavId)

      if (isServicesNavId(nextNavId)) {
        setInstances(ensureTenantDemoInstances(tenantSlug))
      }
    },
    [tenantSlug],
  )

  const handleNavigateToInstances = useCallback(
    (options?: { serviceId?: CatalogServiceId }) => {
      handleNavChange(getServicesNavId(options?.serviceId ?? 'baremetal'))
    },
    [handleNavChange],
  )

  const handleProvisioningStarted = useCallback(
    (instance: TenantInstance) => {
      setInstances(addTenantUserInstance(tenantSlug, instance))
      scheduleProvisioningCompletion(instance.id, LAUNCH_INSTANCE_PROVISIONING_DURATION_MS)
    },
    [scheduleProvisioningCompletion, tenantSlug],
  )

  const handleDismissDuringProvisioning = useCallback(
    (instanceId: string, serviceId: CatalogServiceId) => {
      clearProvisioningTimer(instanceId)
      setInstances(
        updateTenantUserInstance(tenantSlug, instanceId, {
          status: 'provisioning',
          provisionedAt: null,
        }),
      )
      scheduleProvisioningCompletion(instanceId, LAUNCH_INSTANCE_SERVICES_PROVISIONING_MS)
      handleNavigateToInstances({ serviceId })
    },
    [
      clearProvisioningTimer,
      handleNavigateToInstances,
      scheduleProvisioningCompletion,
      tenantSlug,
    ],
  )

  const handleWizardFinished = useCallback(
    (instanceId: string, serviceId: CatalogServiceId) => {
      clearProvisioningTimer(instanceId)
      setInstances(
        updateTenantUserInstance(tenantSlug, instanceId, {
          status: 'provisioning',
          provisionedAt: null,
        }),
      )
      scheduleProvisioningCompletion(instanceId, LAUNCH_INSTANCE_SERVICES_PROVISIONING_MS)
      handleNavigateToInstances({ serviceId })
    },
    [
      clearProvisioningTimer,
      handleNavigateToInstances,
      scheduleProvisioningCompletion,
      tenantSlug,
    ],
  )

  if (!isValidTenant) {
    return <Navigate to="/" replace />
  }

  const isPreviewSession = previewSession !== null && previewSession.tenantSlug === tenantSlug
  const organizationFromSlug = getRegisteredOrganizationBySlug(tenantSlug)
  const organization =
    (isPreviewSession &&
      previewSession &&
      getProviderRegisteredOrganizations().find(
        (item) => item.id === previewSession.organizationId,
      )) ||
    organizationFromSlug ||
    (isPreviewSession ? getDemoTenantUserOrganization() : null)
  const defaultCatalogDraft = getProviderCatalogDraft()
  const focusedCatalogDraft =
    isPreviewSession && previewSession?.catalogItemId
      ? (getProviderCatalogItems().find(
          (item) => item.catalogItemId === previewSession.catalogItemId,
        ) ?? defaultCatalogDraft)
      : defaultCatalogDraft
  const catalogDraft = focusedCatalogDraft
  const invitation = getTenantUserProjectInvitation(tenantSlug, organization)
  const displayName = DEMO_TENANT_DISPLAY_USER[tenantSlug]
  const lockedServiceId = getLockedServiceIdFromNav(activeNavId)

  const renderWorkspaceContent = () => {
    switch (activeNavId) {
      case 'services-baremetal':
      case 'services-clusters':
      case 'services-models':
      case 'services-virtual-machines':
        return (
          <TenantUserInstancesPage
            tenantSlug={tenantSlug}
            instances={instances}
            onInstancesChange={setInstances}
            defaultScopeFieldLabel={invitation.scopeFieldLabel}
            lockedServiceId={lockedServiceId ?? 'baremetal'}
            activeNavId={activeNavId}
          />
        )
      case 'networking-virtual-networks':
        return (
          <ProviderAdminVirtualNetworksPage
            openVirtualNetworkId={openVirtualNetworkId}
            onOpenVirtualNetworkConsumed={() => setOpenVirtualNetworkId(null)}
            onNavigateToSubnet={(subnetId) => {
              setOpenSubnetId(subnetId)
              handleNavChange('networking-subnets')
            }}
            onNavigateToSecurityGroup={(securityGroupId) => {
              setOpenSecurityGroupId(securityGroupId)
              handleNavChange('networking-security-groups')
            }}
          />
        )
      case 'networking-subnets':
        return (
          <ProviderAdminSubnetsPage
            openSubnetId={openSubnetId}
            onOpenSubnetConsumed={() => setOpenSubnetId(null)}
            onNavigateToVirtualNetwork={(virtualNetworkId) => {
              setOpenVirtualNetworkId(virtualNetworkId)
              handleNavChange('networking-virtual-networks')
            }}
          />
        )
      case 'networking-security-groups':
        return (
          <ProviderAdminSecurityGroupsPage
            openSecurityGroupId={openSecurityGroupId}
            onOpenSecurityGroupConsumed={() => setOpenSecurityGroupId(null)}
            onNavigateToVirtualNetwork={(virtualNetworkId) => {
              setOpenVirtualNetworkId(virtualNetworkId)
              handleNavChange('networking-virtual-networks')
            }}
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
            scopeKind={invitation.scopeKind}
            scopeLabel={invitation.scopeLabel}
            scopeFieldLabel={invitation.scopeFieldLabel}
            preferCatalogDraft={Boolean(previewSession?.catalogItemId)}
            autoOpenLaunchWizard={Boolean(previewSession?.autoLaunch && previewSession.catalogItemId)}
            existingInstanceNames={instances.map((instance) => instance.name)}
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
      showNavigation
      activeNavId={activeNavId}
      onNavChange={handleNavChange}
    >
      {renderWorkspaceContent()}
    </TenantShell>
  )
}
