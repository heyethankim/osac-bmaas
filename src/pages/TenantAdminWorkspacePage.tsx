import { useLayoutEffect, useRef, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { syncWorkspaceCatalogItemParam, syncWorkspaceNavParam } from '../shared/workspaceNavUrl'
import { TenantShell } from '../components/tenant/TenantShell'
import { DEMO_TENANT_DISPLAY_ADMIN, isDemoTenantId } from '../demoTenant'
import { PlaceholderTenantAdminPage } from './PlaceholderTenantAdminPage'
import { ProviderAdminExternalIpPoolsPage } from './infrastructure/ProviderAdminExternalIpPoolsPage'
import { ProviderAdminSecurityGroupsPage } from './infrastructure/ProviderAdminSecurityGroupsPage'
import { ProviderAdminSubnetsPage } from './infrastructure/ProviderAdminSubnetsPage'
import { ProviderAdminVirtualNetworksPage } from './infrastructure/ProviderAdminVirtualNetworksPage'
import { TenantAdminCatalogPage } from './tenant-admin/TenantAdminCatalogPage'
import { TenantAdminOverviewPage } from './tenant-admin/TenantAdminOverviewPage'
import { TenantAdminAdministratorsPage } from './tenant-admin/TenantAdminAdministratorsPage'
import { TenantAdminProjectsTeamsPage } from './tenant-admin/TenantAdminProjectsTeamsPage'
import { TenantUserInstancesPage } from './tenant-user/TenantUserInstancesPage'
import {
  TENANT_ADMIN_NAV_ITEMS,
  isServicesNavId,
  type TenantAdminNavId,
} from '../tenantAdmin/constants'
import { getWorkspaceOrganization } from '../tenantAdmin/organizations'
import { resolveOrganizationCompanyLogo } from '../providerAdmin/organizations'
import {
  getTenantActiveNav,
  ensureTenantDemoProjects,
  setTenantActiveNav,
  setTenantOnboardingComplete,
} from '../tenantAdmin/storage'
import type { TenantProject } from '../tenantAdmin/projects'
import {
  getProjectScopeId,
  isAllProjectsScope,
  setProjectScopeId,
  type ProjectScopeId,
} from '../tenantUser/projectScope'
import type { CatalogServiceId } from '../providerSetup/templateDemo'
import { activateProviderRegisteredOrganizationBySlug, getProviderCatalogDraft } from '../providerSetup/storage'
import {
  addTenantUserInstance,
  ensureTenantDemoInstances,
  getOrEnsureTenantUserInstances,
  updateTenantUserInstance,
} from '../tenantUser/storage'
import {
  getTenantInstanceServiceId,
  isStickyDemoProvisioningInstance,
  type TenantInstance,
} from '../tenantUser/instances'
import { LAUNCH_INSTANCE_PROVISIONING_DURATION_MS, LAUNCH_INSTANCE_SERVICES_PROVISIONING_MS } from '../tenantUser/launchInstanceWizard'

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
    value === 'administrators' ||
    value === 'networking-virtual-networks' ||
    value === 'networking-subnets' ||
    value === 'networking-security-groups' ||
    value === 'networking-external-ip-pools'
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

function getServicesNavId(serviceId: CatalogServiceId): TenantAdminNavId {
  switch (serviceId) {
    case 'cluster':
      return 'services-clusters'
    case 'models':
      return 'services-models'
    case 'virtual-machine':
      return 'services-virtual-machines'
    default:
      return 'services-baremetal'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const isValidTenant = Boolean(
    tenantParam && isDemoTenantId(tenantParam) && tenantParam === 'northsummit',
  )
  const tenant = 'northsummit' as const

  const [organization, setOrganization] = useState(() => getWorkspaceOrganization(tenant))
  const [activeNavId, setActiveNavId] = useState<TenantAdminNavId>(() =>
    isValidTenant ? readInitialTenantAdminNav(tenant, searchParams) : 'overview',
  )
  const [projects, setProjects] = useState<TenantProject[]>(() => ensureTenantDemoProjects(tenant))
  const [projectScopeId, setProjectScopeIdState] = useState<ProjectScopeId>(() =>
    getProjectScopeId(tenant),
  )
  const [instances, setInstances] = useState(() =>
    isValidTenant
      ? getOrEnsureTenantUserInstances(tenant, getWorkspaceOrganization(tenant).name)
      : [],
  )
  const [openVirtualNetworkId, setOpenVirtualNetworkId] = useState<string | null>(null)
  const [openSubnetId, setOpenSubnetId] = useState<string | null>(null)
  const [openSecurityGroupId, setOpenSecurityGroupId] = useState<string | null>(null)
  const [openCatalogItemKey, setOpenCatalogItemKey] = useState<string | null>(null)
  const [openInstanceId, setOpenInstanceId] = useState<string | null>(null)
  const [openProjectId, setOpenProjectId] = useState<string | null>(null)
  const [navContentKey, setNavContentKey] = useState(0)
  const provisioningTimersRef = useRef<Map<string, number>>(new Map())

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
    setProjects(ensureTenantDemoProjects(tenant))
    setProjectScopeIdState(getProjectScopeId(tenant))

    const requestedNav = normalizeTenantAdminNavParam(searchParams.get('nav'))
    if (requestedNav) {
      ensureTenantAdminPostOnboardingPrototype(tenant, requestedNav)
      setActiveNavId(requestedNav)
      setTenantActiveNav(tenant, requestedNav)
      return
    }

    syncWorkspaceNavParam(setSearchParams, getTenantActiveNav(tenant), { replace: true })
  }, [isValidTenant, searchParams, setSearchParams, tenant])

  if (!isValidTenant) {
    return <Navigate to="/" replace />
  }

  const catalogDraft = getProviderCatalogDraft()
  const displayName = organization.tenantAdminName ?? DEMO_TENANT_DISPLAY_ADMIN.northsummit
  const lockedServiceId = getLockedServiceIdFromNav(activeNavId)

  const handleProjectScopeChange = (scopeId: ProjectScopeId) => {
    setProjectScopeIdState(scopeId)
    setProjectScopeId(tenant, scopeId)
  }

  const handleNavChange = (navId: string) => {
    const nextNavId = navId as TenantAdminNavId
    setActiveNavId(nextNavId)
    setTenantActiveNav(tenant, nextNavId)
    setNavContentKey((current) => current + 1)
    syncWorkspaceNavParam(setSearchParams, nextNavId, { showLanding: true })
    if (isServicesNavId(nextNavId)) {
      setInstances(ensureTenantDemoInstances(tenant, organization.name))
    }
  }

  const clearProvisioningTimer = (instanceId: string) => {
    const timeoutId = provisioningTimersRef.current.get(instanceId)
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
      provisioningTimersRef.current.delete(instanceId)
    }
  }

  const scheduleProvisioningCompletion = (instanceId: string, delayMs: number) => {
    if (isStickyDemoProvisioningInstance(instanceId)) {
      return
    }
    clearProvisioningTimer(instanceId)
    const timeoutId = window.setTimeout(() => {
      setInstances((current) =>
        updateTenantUserInstance(
          tenant,
          instanceId,
          {
            status: 'running',
            provisionedAt: new Date().toISOString(),
          },
          current,
        ),
      )
      provisioningTimersRef.current.delete(instanceId)
    }, Math.max(0, delayMs))
    provisioningTimersRef.current.set(instanceId, timeoutId)
  }

  const handleProvisioningStarted = (instance: TenantInstance) => {
    setInstances((current) => addTenantUserInstance(tenant, instance, current))
    scheduleProvisioningCompletion(instance.id, LAUNCH_INSTANCE_PROVISIONING_DURATION_MS)
  }

  const handleNavigateToServices = (instanceId: string, serviceId: CatalogServiceId) => {
    clearProvisioningTimer(instanceId)
    setInstances((current) =>
      updateTenantUserInstance(
        tenant,
        instanceId,
        {
          status: 'provisioning',
          provisionedAt: null,
        },
        current,
      ),
    )
    scheduleProvisioningCompletion(instanceId, LAUNCH_INSTANCE_SERVICES_PROVISIONING_MS)
    handleNavChange(getServicesNavId(serviceId))
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
            onInstancesChange={setInstances}
            projects={projects}
            projectScopeId={projectScopeId}
            onProjectScopeChange={handleProjectScopeChange}
            onProjectsChange={setProjects}
            organization={organization}
            lockedServiceId={lockedServiceId ?? 'baremetal'}
            activeNavId={activeNavId}
            onNavigateToCatalogItem={(catalogItemDisplayName) => {
              handleNavChange('catalog')
              syncWorkspaceCatalogItemParam(setSearchParams, catalogItemDisplayName)
            }}
            openInstanceId={openInstanceId}
            onOpenInstanceConsumed={() => setOpenInstanceId(null)}
            onNavigateToProject={(project) => {
              setOpenProjectId(project.id)
              handleNavChange('projects-teams')
            }}
          />
        )
      case 'catalog':
        return (
          <TenantAdminCatalogPage
            organization={organization}
            catalogDraft={catalogDraft}
            projects={projects}
            initialProjectId={isAllProjectsScope(projectScopeId) ? null : projectScopeId}
            onProjectScopeChange={handleProjectScopeChange}
            onProjectsChange={setProjects}
            onNavigateToProjectsTeams={() => handleNavChange('projects-teams')}
            existingInstanceNames={instances.map((instance) => instance.name)}
            openCatalogItemKey={openCatalogItemKey}
            onOpenCatalogItemConsumed={() => setOpenCatalogItemKey(null)}
            onProvisioningStarted={handleProvisioningStarted}
            onDismissDuringProvisioning={handleNavigateToServices}
            onWizardFinished={handleNavigateToServices}
          />
        )
      case 'projects-teams':
        return (
          <TenantAdminProjectsTeamsPage
            tenantSlug={tenant}
            organization={organization}
            projects={projects}
            instances={instances}
            onProjectsChange={setProjects}
            onInstancesChange={setInstances}
            openProjectId={openProjectId}
            onOpenProjectConsumed={() => setOpenProjectId(null)}
            onNavigateToInstance={(instance) => {
              const project = projects.find((entry) => entry.name === instance.projectName)
              if (project) {
                handleProjectScopeChange(project.id)
              }
              setOpenInstanceId(instance.id)
              handleNavChange(getServicesNavId(getTenantInstanceServiceId(instance)))
            }}
          />
        )
      case 'administrators':
        return (
          <TenantAdminAdministratorsPage
            organization={organization}
            onOrganizationChange={setOrganization}
          />
        )
      case 'networking-virtual-networks':
        return (
          <ProviderAdminVirtualNetworksPage
            tenantSlug={tenant}
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
            tenantSlug={tenant}
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
            tenantSlug={tenant}
            openSecurityGroupId={openSecurityGroupId}
            onOpenSecurityGroupConsumed={() => setOpenSecurityGroupId(null)}
            onNavigateToVirtualNetwork={(virtualNetworkId) => {
              setOpenVirtualNetworkId(virtualNetworkId)
              handleNavChange('networking-virtual-networks')
            }}
          />
        )
      case 'networking-external-ip-pools':
        return (
          <ProviderAdminExternalIpPoolsPage
            tenantSlug={tenant}
            readOnly
            scopeOrganization={organization}
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
      companyLogoSrc={resolveOrganizationCompanyLogo(organization)}
      companyLogoAlt={organization.name}
    >
      <div key={navContentKey}>{renderWorkspaceContent()}</div>
    </TenantShell>
  )
}
