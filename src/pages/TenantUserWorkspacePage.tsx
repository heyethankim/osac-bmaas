import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { syncWorkspaceCatalogItemParam, syncWorkspaceNavParam } from '../shared/workspaceNavUrl'
import { TenantShell } from '../components/tenant/TenantShell'
import {
  DEMO_TENANT_DISPLAY_USER,
  DEMO_TENANT_LOGIN_EMAIL_USER,
  isDemoTenantId,
  type DemoTenantId,
} from '../demoTenant'
import {
  getDemoTenantUserOrganization,
  getProviderViewingAsTenantUser,
} from '../providerAdmin/openAsTenantUser'
import { getProviderRegisteredOrganizations, activateProviderRegisteredOrganizationBySlug } from '../providerSetup/storage'
import { getProviderCatalogDraft, getProviderCatalogItems } from '../providerSetup/storage'
import type { CatalogServiceId } from '../providerSetup/templateDemo'
import { getRegisteredOrganizationBySlug } from '../tenantAdmin/organizations'
import { resolveOrganizationCompanyLogo } from '../providerAdmin/organizations'
import {
  getTenantInstanceServiceId,
  isStickyDemoProvisioningInstance,
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
import { ProviderAdminExternalIpPoolsPage } from './infrastructure/ProviderAdminExternalIpPoolsPage'
import { ProviderAdminSecurityGroupsPage } from './infrastructure/ProviderAdminSecurityGroupsPage'
import { ProviderAdminSubnetsPage } from './infrastructure/ProviderAdminSubnetsPage'
import { ProviderAdminVirtualNetworksPage } from './infrastructure/ProviderAdminVirtualNetworksPage'
import { TenantUserActivityLogPage } from './tenant-user/TenantUserActivityLogPage'
import { TenantSecretsPage } from './tenant/TenantSecretsPage'
import { TenantUserCatalogPage } from './tenant-user/TenantUserCatalogPage'
import { TenantUserInstancesPage } from './tenant-user/TenantUserInstancesPage'
import { TenantAdminProjectsTeamsPage } from './tenant-admin/TenantAdminProjectsTeamsPage'
import { ensureTenantDemoProjects } from '../tenantAdmin/storage'
import type { TenantProject } from '../tenantAdmin/projects'
import {
  getProjectScopeId,
  isAllProjectsScope,
  setProjectScopeId,
  type ProjectScopeId,
} from '../tenantUser/projectScope'
import { getTenantUserAccessibleProjects } from '../tenantUser/projects'
import { TENANT_USER_PROJECTS_PAGE } from '../tenantUser/constants'

function isTenantUserNavId(value: string | null): value is TenantUserNavId {
  return (
    value === 'catalog' ||
    value === 'services-baremetal' ||
    value === 'services-clusters' ||
    value === 'services-models' ||
    value === 'services-virtual-machines' ||
    value === 'projects-teams' ||
    value === 'networking-virtual-networks' ||
    value === 'networking-subnets' ||
    value === 'networking-security-groups' ||
    value === 'networking-external-ip-pools' ||
    value === 'secrets' ||
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
  const [searchParams, setSearchParams] = useSearchParams()
  const { tenant } = useParams<{ tenant: string }>()
  const tenantSlug =
    tenant && isDemoTenantId(tenant) && tenant === 'northsummit' ? tenant : 'northsummit'
  const isValidTenant = Boolean(tenant && isDemoTenantId(tenant) && tenant === 'northsummit')

  const [previewSession] = useState(() => getProviderViewingAsTenantUser())
  const [activeNavId, setActiveNavId] = useState<TenantUserNavId>(() =>
    isValidTenant ? readInitialTenantUserNav(tenantSlug, searchParams) : 'catalog',
  )
  const [instances, setInstances] = useState<TenantInstance[]>(() =>
    isValidTenant ? ensureTenantDemoInstances(tenantSlug) : [],
  )
  const [projects, setProjects] = useState<TenantProject[]>(() =>
    isValidTenant ? ensureTenantDemoProjects(tenantSlug) : [],
  )
  const [projectScopeId, setProjectScopeIdState] = useState<ProjectScopeId>(() =>
    isValidTenant ? getProjectScopeId(tenantSlug) : 'all',
  )
  const [openVirtualNetworkId, setOpenVirtualNetworkId] = useState<string | null>(null)
  const [openSubnetId, setOpenSubnetId] = useState<string | null>(null)
  const [openSecurityGroupId, setOpenSecurityGroupId] = useState<string | null>(null)
  const [openCatalogItemKey, setOpenCatalogItemKey] = useState<string | null>(null)
  const [openInstanceId, setOpenInstanceId] = useState<string | null>(null)
  const [openProjectId, setOpenProjectId] = useState<string | null>(null)
  const [navContentKey, setNavContentKey] = useState(0)
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
      setInstances((current) =>
        updateTenantUserInstance(
          tenantSlug,
          instanceId,
          {
            status: 'running',
            provisionedAt: new Date().toISOString(),
          },
          current,
        ),
      )
    },
    [clearProvisioningTimer, tenantSlug],
  )

  const scheduleProvisioningCompletion = useCallback(
    (instanceId: string, delayMs: number) => {
      if (isStickyDemoProvisioningInstance(instanceId)) {
        return
      }
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
      if (isStickyDemoProvisioningInstance(instance.id)) {
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
    setProjects(ensureTenantDemoProjects(tenantSlug))
    setProjectScopeIdState(getProjectScopeId(tenantSlug))

    const requestedNav = normalizeTenantUserNavParam(searchParams.get('nav'))
    if (requestedNav) {
      ensureTenantUserPostOnboardingPrototype(tenantSlug, requestedNav)
      setActiveNavId(requestedNav)
      setTenantUserActiveNav(tenantSlug, requestedNav)
      return
    }

    syncWorkspaceNavParam(setSearchParams, getTenantUserActiveNav(tenantSlug), { replace: true })
  }, [isValidTenant, searchParams, setSearchParams, tenantSlug])

  const handleProjectScopeChange = useCallback(
    (scopeId: ProjectScopeId) => {
      setProjectScopeIdState(scopeId)
      setProjectScopeId(tenantSlug, scopeId)
    },
    [tenantSlug],
  )

  const handleNavChange = useCallback(
    (navId: string) => {
      const nextNavId = navId as TenantUserNavId
      setActiveNavId(nextNavId)
      setTenantUserActiveNav(tenantSlug, nextNavId)
      setNavContentKey((current) => current + 1)
      syncWorkspaceNavParam(setSearchParams, nextNavId, { showLanding: true })

      if (isServicesNavId(nextNavId)) {
        setInstances(ensureTenantDemoInstances(tenantSlug))
      }
    },
    [setSearchParams, tenantSlug],
  )

  const handleNavigateToCatalogItem = useCallback(
    (catalogItemDisplayName: string) => {
      handleNavChange('catalog')
      syncWorkspaceCatalogItemParam(setSearchParams, catalogItemDisplayName)
    },
    [handleNavChange, setSearchParams],
  )

  const handleOpenCatalogItemConsumed = useCallback(() => {
    setOpenCatalogItemKey(null)
  }, [])

  const handleNavigateToInstances = useCallback(
    (options?: { serviceId?: CatalogServiceId }) => {
      handleNavChange(getServicesNavId(options?.serviceId ?? 'baremetal'))
    },
    [handleNavChange],
  )

  const handleProvisioningStarted = useCallback(
    (instance: TenantInstance) => {
      setInstances((current) => addTenantUserInstance(tenantSlug, instance, current))
      scheduleProvisioningCompletion(instance.id, LAUNCH_INSTANCE_PROVISIONING_DURATION_MS)
    },
    [scheduleProvisioningCompletion, tenantSlug],
  )

  const handleDismissDuringProvisioning = useCallback(
    (instanceId: string, serviceId: CatalogServiceId) => {
      clearProvisioningTimer(instanceId)
      setInstances((current) =>
        updateTenantUserInstance(
          tenantSlug,
          instanceId,
          {
            status: 'provisioning',
            provisionedAt: null,
          },
          current,
        ),
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
      setInstances((current) =>
        updateTenantUserInstance(
          tenantSlug,
          instanceId,
          {
            status: 'provisioning',
            provisionedAt: null,
          },
          current,
        ),
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
  const displayName = DEMO_TENANT_DISPLAY_USER[tenantSlug]
  const userEmail = DEMO_TENANT_LOGIN_EMAIL_USER[tenantSlug as DemoTenantId]
  const accessibleProjects = useMemo(
    () => getTenantUserAccessibleProjects(projects, userEmail),
    [projects, userEmail],
  )
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
            projects={accessibleProjects}
            allProjects={projects}
            projectScopeId={projectScopeId}
            onProjectScopeChange={handleProjectScopeChange}
            organization={organization}
            lockedServiceId={lockedServiceId ?? 'baremetal'}
            activeNavId={activeNavId}
            onNavigateToCatalogItem={handleNavigateToCatalogItem}
            openInstanceId={openInstanceId}
            onOpenInstanceConsumed={() => setOpenInstanceId(null)}
            onNavigateToProject={(project) => {
              setOpenProjectId(project.id)
              handleNavChange('projects-teams')
            }}
          />
        )
      case 'projects-teams':
        return organization ? (
          <TenantAdminProjectsTeamsPage
            tenantSlug={tenantSlug}
            organization={organization}
            projects={accessibleProjects}
            allProjects={projects}
            instances={instances}
            onProjectsChange={setProjects}
            readOnly
            currentUserEmail={userEmail}
            lede={TENANT_USER_PROJECTS_PAGE.lede}
            openProjectId={openProjectId}
            onOpenProjectConsumed={() => setOpenProjectId(null)}
            onNavigateToInstance={(instance) => {
              const project = accessibleProjects.find((entry) => entry.name === instance.projectName)
              if (project) {
                handleProjectScopeChange(project.id)
              }
              setOpenInstanceId(instance.id)
              handleNavChange(getServicesNavId(getTenantInstanceServiceId(instance)))
            }}
          />
        ) : null
      case 'networking-virtual-networks':
        return (
          <ProviderAdminVirtualNetworksPage
            tenantSlug={tenantSlug}
            readOnly
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
            tenantSlug={tenantSlug}
            readOnly
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
            tenantSlug={tenantSlug}
            readOnly
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
            tenantSlug={tenantSlug}
            scopeOrganization={organization}
          />
        )
      case 'secrets':
        return <TenantSecretsPage tenantSlug={tenantSlug} />
      case 'activity-log':
        return <TenantUserActivityLogPage />
      case 'catalog':
      default:
        return (
          <TenantUserCatalogPage
            organization={organization}
            catalogDraft={catalogDraft}
            tenantSlug={tenantSlug}
            projects={accessibleProjects}
            allProjects={projects}
            initialProjectId={isAllProjectsScope(projectScopeId) ? null : projectScopeId}
            onProjectScopeChange={handleProjectScopeChange}
            onNavigateToProjectsTeams={() => handleNavChange('projects-teams')}
            preferCatalogDraft={Boolean(previewSession?.catalogItemId)}
            autoOpenLaunchWizard={Boolean(previewSession?.autoLaunch && previewSession.catalogItemId)}
            openCatalogItemKey={openCatalogItemKey}
            onOpenCatalogItemConsumed={handleOpenCatalogItemConsumed}
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
      companyLogoSrc={organization ? resolveOrganizationCompanyLogo(organization) : null}
      companyLogoAlt={organization?.name}
    >
      <div key={navContentKey}>{renderWorkspaceContent()}</div>
    </TenantShell>
  )
}
