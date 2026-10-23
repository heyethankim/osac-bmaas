import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  syncWorkspaceCatalogItemParam,
  syncWorkspaceNavParam,
  WORKSPACE_INSTANCE_PARAM,
} from '../shared/workspaceNavUrl'
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
import {
  getProviderRegisteredOrganizations,
  activateProviderRegisteredOrganizationBySlug,
  ensureProviderDemoOrganizations,
} from '../providerSetup/storage'
import { getProviderCatalogDraft, getProviderCatalogItems } from '../providerSetup/storage'
import type { CatalogServiceId } from '../providerSetup/templateDemo'
import {
  getRegisteredOrganizationBySlug,
  getWorkspaceOrganization,
} from '../tenantAdmin/organizations'
import { resolveOrganizationCompanyLogo } from '../providerAdmin/organizations'
import {
  getTenantInstanceServiceId,
  isStickyDemoProvisioningInstance,
  type TenantInstance,
} from '../tenantUser/instances'
import {
  BARE_METAL_PROVISIONING_DEMO_DURATION_MS,
  getBareMetalProvisioningDemoRemainingMs,
} from '../tenantUser/bareMetalProvisioning'
import {
  CLUSTER_PROVISIONING_DEMO_DURATION_MS,
  getClusterProvisioningDemoRemainingMs,
} from '../tenantUser/clusterProvisioning'
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
import { ProviderAdminExternalNetworksPage } from './infrastructure/ProviderAdminExternalNetworksPage'
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
import {
  getTenantUserAccessibleProjects,
  getTenantUserProjectsPageProjects,
} from '../tenantUser/projects'
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
  ensureProviderDemoOrganizations()
  activateProviderRegisteredOrganizationBySlug(tenantSlug)
}

function normalizeTenantUserNavParam(value: string | null): TenantUserNavId | null {
  if (isTenantUserNavId(value)) {
    return value
  }
  if (value === 'my-instances' || value === 'services') {
    return 'services-baremetal'
  }
  if (value === 'networking-subnets' || value === 'networking-security-groups') {
    return 'networking-virtual-networks'
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
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { tenant } = useParams<{ tenant: string }>()
  const tenantSlug =
    tenant && isDemoTenantId(tenant) && tenant === 'northsummit' ? tenant : 'northsummit'
  const isValidTenant = Boolean(tenant && isDemoTenantId(tenant) && tenant === 'northsummit')
  /** Prevents stale `?nav=` from snapping back during confirm → Services navigation. */
  const pendingNavRef = useRef<TenantUserNavId | null>(null)

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
  const [openSecretId, setOpenSecretId] = useState<string | null>(null)
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
      const serviceId = getTenantInstanceServiceId(instance)
      const delayMs =
        serviceId === 'baremetal'
          ? getBareMetalProvisioningDemoRemainingMs(instance.createdAt, now)
          : serviceId === 'cluster'
            ? getClusterProvisioningDemoRemainingMs(instance.createdAt, now)
            : LAUNCH_INSTANCE_PROVISIONING_DURATION_MS - (now - new Date(instance.createdAt).getTime())
      scheduleProvisioningCompletion(instance.id, delayMs)
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
    ensureProviderDemoOrganizations()
    activateProviderRegisteredOrganizationBySlug(tenantSlug)
    setInstances(ensureTenantDemoInstances(tenantSlug))
    setProjects(ensureTenantDemoProjects(tenantSlug))
    setProjectScopeIdState(getProjectScopeId(tenantSlug))
  }, [isValidTenant, tenantSlug])

  useLayoutEffect(() => {
    if (!isValidTenant) {
      return
    }

    const requestedNav = normalizeTenantUserNavParam(searchParams.get('nav'))
    const pendingNav = pendingNavRef.current

    if (pendingNav) {
      if (requestedNav === pendingNav) {
        pendingNavRef.current = null
        ensureTenantUserPostOnboardingPrototype(tenantSlug, pendingNav)
        setActiveNavId(pendingNav)
        setTenantUserActiveNav(tenantSlug, pendingNav)
        return
      }
      // URL has not caught up yet — keep the intentional destination.
      setActiveNavId(pendingNav)
      return
    }

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

  const handleNavigateToSecret = useCallback(
    (secretId: string) => {
      setOpenSecretId(secretId)
      handleNavChange('secrets')
    },
    [handleNavChange],
  )

  const handleOpenCatalogItemConsumed = useCallback(() => {
    setOpenCatalogItemKey(null)
  }, [])

  const handleProvisioningStarted = useCallback(
    (instance: TenantInstance) => {
      setInstances((current) => addTenantUserInstance(tenantSlug, instance, current))
      const serviceId = getTenantInstanceServiceId(instance)
      const delayMs =
        serviceId === 'baremetal'
          ? BARE_METAL_PROVISIONING_DEMO_DURATION_MS
          : serviceId === 'cluster'
            ? CLUSTER_PROVISIONING_DEMO_DURATION_MS
            : LAUNCH_INSTANCE_PROVISIONING_DURATION_MS
      scheduleProvisioningCompletion(instance.id, delayMs)
    },
    [scheduleProvisioningCompletion, tenantSlug],
  )

  const resolvePostWizardProvisioningDelayMs = useCallback(
    (instanceId: string, serviceId: CatalogServiceId) => {
      if (serviceId === 'baremetal') {
        const instance = getTenantUserInstances(tenantSlug).find((item) => item.id === instanceId)
        if (instance) {
          return getBareMetalProvisioningDemoRemainingMs(instance.createdAt)
        }
        return BARE_METAL_PROVISIONING_DEMO_DURATION_MS
      }
      if (serviceId === 'cluster') {
        const instance = getTenantUserInstances(tenantSlug).find((item) => item.id === instanceId)
        if (instance) {
          return getClusterProvisioningDemoRemainingMs(instance.createdAt)
        }
        return CLUSTER_PROVISIONING_DEMO_DURATION_MS
      }
      return LAUNCH_INSTANCE_SERVICES_PROVISIONING_MS
    },
    [tenantSlug],
  )

  /** After confirm: keep provisioning in the background and open the instance detail. */
  const handleGoToProvisioningInstance = useCallback(
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
      scheduleProvisioningCompletion(
        instanceId,
        resolvePostWizardProvisioningDelayMs(instanceId, serviceId),
      )
      const instanceName =
        getTenantUserInstances(tenantSlug).find((item) => item.id === instanceId)?.name ?? null
      const nextNavId = getServicesNavId(serviceId)
      pendingNavRef.current = nextNavId
      setOpenInstanceId(instanceId)
      setActiveNavId(nextNavId)
      setTenantUserActiveNav(tenantSlug, nextNavId)
      setNavContentKey((current) => current + 1)

      const nextParams = new URLSearchParams()
      nextParams.set('nav', nextNavId)
      if (instanceName) {
        nextParams.set(WORKSPACE_INSTANCE_PARAM, instanceName)
      }
      // Replace the full query so launch-instance action/step cannot linger or race.
      navigate(`${pathname}?${nextParams.toString()}`, { replace: true })
    },
    [
      clearProvisioningTimer,
      navigate,
      pathname,
      resolvePostWizardProvisioningDelayMs,
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
    (isPreviewSession ? getDemoTenantUserOrganization() : getWorkspaceOrganization(tenantSlug))
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
  const projectsPageProjects = useMemo(
    () => getTenantUserProjectsPageProjects(projects, userEmail),
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
            onNavigateToCatalogItem={handleNavigateToCatalogItem}
            onNavigateToSecret={handleNavigateToSecret}
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
            projects={projectsPageProjects}
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
            openVirtualNetworkId={openVirtualNetworkId}
            openSubnetId={openSubnetId}
            openSecurityGroupId={openSecurityGroupId}
            onOpenVirtualNetworkConsumed={() => setOpenVirtualNetworkId(null)}
            onOpenSubnetConsumed={() => setOpenSubnetId(null)}
            onOpenSecurityGroupConsumed={() => setOpenSecurityGroupId(null)}
          />
        )
      case 'networking-external-ip-pools':
        return (
          <ProviderAdminExternalNetworksPage
            tenantSlug={tenantSlug}
            scopeOrganization={organization}
            serviceInstances={instances}
            onNavigateToServiceInstance={(instance) => {
              const project = accessibleProjects.find((entry) => entry.name === instance.projectName)
              if (project) {
                handleProjectScopeChange(project.id)
              }
              setOpenInstanceId(instance.id)
              handleNavChange(getServicesNavId(getTenantInstanceServiceId(instance)))
            }}
          />
        )
      case 'secrets':
        return (
          <TenantSecretsPage
            tenantSlug={tenantSlug}
            openSecretId={openSecretId}
            onOpenSecretConsumed={() => setOpenSecretId(null)}
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
            onDismissDuringProvisioning={handleGoToProvisioningInstance}
            onWizardFinished={handleGoToProvisioningInstance}
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
      organizationSlug={organization?.slug}
    >
      <div key={navContentKey}>{renderWorkspaceContent()}</div>
    </TenantShell>
  )
}
