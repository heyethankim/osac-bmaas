import { useLayoutEffect, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { TenantShell } from '../components/tenant/TenantShell'
import { DEMO_TENANT_DISPLAY_ADMIN, isDemoTenantId } from '../demoTenant'
import { PlaceholderTenantAdminPage } from './PlaceholderTenantAdminPage'
import { ProviderAdminSecurityGroupsPage } from './infrastructure/ProviderAdminSecurityGroupsPage'
import { ProviderAdminSubnetsPage } from './infrastructure/ProviderAdminSubnetsPage'
import { ProviderAdminVirtualNetworksPage } from './infrastructure/ProviderAdminVirtualNetworksPage'
import { TenantAdminCatalogPage } from './tenant-admin/TenantAdminCatalogPage'
import { TenantAdminOverviewPage } from './tenant-admin/TenantAdminOverviewPage'
import { TenantAdminProjectsTeamsPage } from './tenant-admin/TenantAdminProjectsTeamsPage'
import { TenantUserInstancesPage } from './tenant-user/TenantUserInstancesPage'
import {
  TENANT_ADMIN_NAV_ITEMS,
  isServicesNavId,
  type TenantAdminNavId,
} from '../tenantAdmin/constants'
import { getWorkspaceOrganization } from '../tenantAdmin/organizations'
import {
  getTenantActiveNav,
  getTenantProjects,
  setTenantActiveNav,
  setTenantOnboardingComplete,
} from '../tenantAdmin/storage'
import type { TenantProject } from '../tenantAdmin/projects'
import type { CatalogServiceId } from '../providerSetup/templateDemo'
import { activateProviderRegisteredOrganizationBySlug, getProviderCatalogDraft } from '../providerSetup/storage'
import {
  addTenantUserInstance,
  ensureTenantDemoInstances,
  updateTenantUserInstance,
} from '../tenantUser/storage'
import type { TenantInstance } from '../tenantUser/instances'
import { LAUNCH_INSTANCE_PROVISIONING_DURATION_MS } from '../tenantUser/launchInstanceWizard'

const TENANT_ADMIN_PLACEHOLDER_PAGES: Partial<
  Record<TenantAdminNavId, { title: string; description: string }>
> = {}

function isTenantAdminNavId(value: string | null): value is TenantAdminNavId {
  return (
    value === 'overview' ||
    value === 'catalog' ||
    value === 'services-baremetal' ||
    value === 'services-clusters' ||
    value === 'services-models' ||
    value === 'services-virtual-machines' ||
    value === 'projects-teams' ||
    value === 'networking-virtual-networks' ||
    value === 'networking-subnets' ||
    value === 'networking-security-groups'
  )
}

function normalizeTenantAdminNavParam(value: string | null): TenantAdminNavId | null {
  if (isTenantAdminNavId(value)) {
    return value
  }
  if (value === 'services' || value === 'my-instances' || value === 'instances') {
    return 'services-baremetal'
  }
  return null
}

function getLockedServiceIdFromNav(navId: TenantAdminNavId): CatalogServiceId | null {
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

/** Seeds Tenant Admin state so landing-page prototype links can open finished screens. */
function ensureTenantAdminPostOnboardingPrototype(tenant: string, navId: TenantAdminNavId) {
  setTenantOnboardingComplete(tenant)
  setTenantActiveNav(tenant, navId)
  activateProviderRegisteredOrganizationBySlug(tenant)
}

function readInitialTenantAdminNav(
  tenant: string,
  searchParams: URLSearchParams,
): TenantAdminNavId {
  const requestedNav = normalizeTenantAdminNavParam(searchParams.get('nav'))
  if (requestedNav) {
    ensureTenantAdminPostOnboardingPrototype(tenant, requestedNav)
    return requestedNav
  }

  return getTenantActiveNav(tenant)
}

export function TenantAdminWorkspacePage() {
  const { tenant: tenantParam } = useParams<{ tenant: string }>()
  const [searchParams] = useSearchParams()
  const isValidTenant = Boolean(
    tenantParam && isDemoTenantId(tenantParam) && tenantParam === 'northstar',
  )
  const tenant = 'northstar' as const

  const [organization, setOrganization] = useState(() => getWorkspaceOrganization(tenant))
  const [activeNavId, setActiveNavId] = useState<TenantAdminNavId>(() =>
    isValidTenant ? readInitialTenantAdminNav(tenant, searchParams) : 'overview',
  )
  const [projects, setProjects] = useState<TenantProject[]>(() => getTenantProjects(tenant))
  const [instances, setInstances] = useState(() =>
    isValidTenant
      ? ensureTenantDemoInstances(tenant, getWorkspaceOrganization(tenant).name)
      : [],
  )
  const [openVirtualNetworkId, setOpenVirtualNetworkId] = useState<string | null>(null)
  const [openSubnetId, setOpenSubnetId] = useState<string | null>(null)
  const [openSecurityGroupId, setOpenSecurityGroupId] = useState<string | null>(null)

  useLayoutEffect(() => {
    if (!isValidTenant) {
      return
    }

    // Login and prototype shortcuts both land here with onboarding already complete.
    setTenantOnboardingComplete(tenant)
    activateProviderRegisteredOrganizationBySlug(tenant)
    const workspaceOrganization = getWorkspaceOrganization(tenant)
    setOrganization(workspaceOrganization)
    setInstances(ensureTenantDemoInstances(tenant, workspaceOrganization.name))

    const requestedNav = normalizeTenantAdminNavParam(searchParams.get('nav'))
    if (!requestedNav) {
      return
    }

    ensureTenantAdminPostOnboardingPrototype(tenant, requestedNav)
    setActiveNavId(requestedNav)
  }, [isValidTenant, searchParams, tenant])

  if (!isValidTenant) {
    return <Navigate to="/" replace />
  }

  const catalogDraft = getProviderCatalogDraft()
  const displayName = organization.tenantAdminName ?? DEMO_TENANT_DISPLAY_ADMIN.northstar
  const lockedServiceId = getLockedServiceIdFromNav(activeNavId)

  const handleNavChange = (navId: string) => {
    const nextNavId = navId as TenantAdminNavId
    setActiveNavId(nextNavId)
    setTenantActiveNav(tenant, nextNavId)
    if (isServicesNavId(nextNavId)) {
      setInstances(ensureTenantDemoInstances(tenant, organization.name))
    }
  }

  const handleProvisioningStarted = (instance: TenantInstance) => {
    setInstances(addTenantUserInstance(tenant, instance))
    window.setTimeout(() => {
      setInstances(
        updateTenantUserInstance(tenant, instance.id, {
          status: 'running',
          provisionedAt: new Date().toISOString(),
        }),
      )
    }, LAUNCH_INSTANCE_PROVISIONING_DURATION_MS)
  }

  const handleInstancesChange = (nextInstances: TenantInstance[]) => {
    setInstances(nextInstances)
  }

  const renderWorkspaceContent = () => {
    const placeholder = TENANT_ADMIN_PLACEHOLDER_PAGES[activeNavId]
    if (placeholder) {
      return (
        <PlaceholderTenantAdminPage
          title={placeholder.title}
          description={placeholder.description}
        />
      )
    }

    switch (activeNavId) {
      case 'services-baremetal':
      case 'services-clusters':
      case 'services-models':
      case 'services-virtual-machines':
        return (
          <TenantUserInstancesPage
            tenantSlug={tenant}
            instances={instances}
            onInstancesChange={handleInstancesChange}
            defaultScopeFieldLabel="Organization"
            lockedServiceId={lockedServiceId ?? 'baremetal'}
          />
        )
      case 'catalog':
        return (
          <TenantAdminCatalogPage
            organization={organization}
            catalogDraft={catalogDraft}
            projects={projects}
            onNavigateToProjectsTeams={() => handleNavChange('projects-teams')}
            existingInstanceNames={instances.map((instance) => instance.name)}
            onProvisioningStarted={handleProvisioningStarted}
            onInstancesRefresh={() =>
              setInstances(ensureTenantDemoInstances(tenant, organization.name))
            }
          />
        )
      case 'projects-teams':
        return (
          <TenantAdminProjectsTeamsPage
            tenantSlug={tenant}
            organization={organization}
            projects={projects}
            onProjectsChange={setProjects}
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
      case 'overview':
      default:
        return <TenantAdminOverviewPage />
    }
  }

  return (
    <TenantShell
      role="tenant-admin"
      displayName={displayName}
      navItems={TENANT_ADMIN_NAV_ITEMS}
      showNavigation
      activeNavId={activeNavId}
      onNavChange={handleNavChange}
    >
      {renderWorkspaceContent()}
    </TenantShell>
  )
}
