import { useLayoutEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { syncWorkspaceCatalogItemParam, syncWorkspaceNavParam } from '../shared/workspaceNavUrl'
import { ProviderAdminShell } from '../components/provider-admin/ProviderAdminShell'
import { ProviderSetupWizardPanel } from '../components/provider-setup/ProviderSetupWizardPanel'
import type { ProviderAdminNavId } from '../providerAdmin/constants'
import { ProviderAdminCatalogPage } from './ProviderAdminCatalogPage'
import { ProviderAdminOverviewPage } from './ProviderAdminOverviewPage'
import { ProviderAdminBmaasTemplatesPage } from './infrastructure/ProviderAdminBmaasTemplatesPage'
import { ProviderAdminDataCentersPage } from './infrastructure/ProviderAdminDataCentersPage'
import { ProviderAdminExternalIpPoolsPage } from './infrastructure/ProviderAdminExternalIpPoolsPage'
import { ProviderAdminHardwareInventoryPage } from './infrastructure/ProviderAdminHardwareInventoryPage'
import { ProviderAdminSecurityGroupsPage } from './infrastructure/ProviderAdminSecurityGroupsPage'
import { ProviderAdminSubnetsPage } from './infrastructure/ProviderAdminSubnetsPage'
import { ProviderAdminVirtualNetworksPage } from './infrastructure/ProviderAdminVirtualNetworksPage'
import { ProviderAdminBillingMeteringPage } from './ProviderAdminBillingMeteringPage'
import { ProviderAdminOrganizationsPage } from './ProviderAdminOrganizationsPage'
import { ProviderAdminQuotasPage } from './ProviderAdminQuotasPage'
import { PlaceholderProviderAdminPage } from './PlaceholderProviderAdminPage'
import { ProviderServiceSelectionPage } from './provider-setup/ProviderServiceSelectionPage'
import { TenantUserInstancesPage } from './tenant-user/TenantUserInstancesPage'
import { TenantAdminProjectsTeamsPage } from './tenant-admin/TenantAdminProjectsTeamsPage'
import type { ProviderServiceId } from '../providerSetup/constants'
import { generateCatalogItemId, type PublishedTemplatePayload } from '../providerSetup/templateDemo'
import type { CatalogServiceId } from '../providerSetup/templateDemo'
import { DEFAULT_CATALOG_NETWORK_POLICY } from '../providerAdmin/catalogNetworkPolicy'
import {
  ensureProviderCatalogDemoItems,
  ensureProviderPostSetupPrototype,
  isProviderAdminNavId,
} from '../providerSetup/prototypeEntry'
import {
  getProviderActiveNav,
  getProviderCatalogItems,
  getProviderSelectedServices,
  isProviderServicesSelected,
  isProviderSetupComplete,
  addProviderCatalogItem,
  assignCatalogToRegisteredOrganization,
  setProviderActiveNav,
  setProviderOpenRegisterOrgWizard,
  setProviderSelectedServices,
  setProviderSetupComplete,
} from '../providerSetup/storage'
import {
  addTenantUserInstance,
  ensureTenantDemoInstances,
  updateTenantUserInstance,
} from '../tenantUser/storage'
import {
  getTenantInstanceServiceId,
  isStickyDemoProvisioningInstance,
  type TenantInstance,
} from '../tenantUser/instances'
import { LAUNCH_INSTANCE_PROVISIONING_DURATION_MS, LAUNCH_INSTANCE_SERVICES_PROVISIONING_MS } from '../tenantUser/launchInstanceWizard'
import type { WorkspaceTransition } from '../providerAdmin/workspace'
import type { BmaasTemplateLookup } from '../providerAdmin/bmaasTemplates'
import { ensureTenantDemoProjects } from '../tenantAdmin/storage'
import type { TenantProject } from '../tenantAdmin/projects'
import { getWorkspaceOrganization } from '../tenantAdmin/organizations'
import {
  getProjectScopeId,
  isAllProjectsScope,
  setProjectScopeId,
  type ProjectScopeId,
} from '../tenantUser/projectScope'

function getServicesNavId(serviceId: CatalogServiceId): ProviderAdminNavId {
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

const PUBLISH_PHASE_MS = 900
const ENTER_PHASE_MS = 700
const PROVIDER_SERVICES_DEMO_TENANT = 'northstar'

function normalizeProviderNavParam(value: string | null): ProviderAdminNavId | null {
  const normalizedNav =
    value === 'administration-rbac' || value === 'administration-roles'
      ? 'administration-organizations'
      : value === 'services' || value === 'my-instances' || value === 'instances'
        ? 'services-baremetal'
        : value
  return isProviderAdminNavId(normalizedNav) ? normalizedNav : null
}

function getLockedServiceIdFromNav(navId: ProviderAdminNavId): CatalogServiceId | null {
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

function readInitialProviderNav(searchParams: URLSearchParams): ProviderAdminNavId {
  const requestedNav = normalizeProviderNavParam(searchParams.get('nav'))
  if (requestedNav) {
    ensureProviderPostSetupPrototype(requestedNav)
    return requestedNav
  }

  return getProviderActiveNav()
}

export function ProviderAdminWorkspacePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [setupComplete, setSetupComplete] = useState(() => isProviderSetupComplete())
  const [servicesSelected, setServicesSelected] = useState(() => isProviderServicesSelected())
  const [selectedServices, setSelectedServices] = useState<ProviderServiceId[]>(() =>
    getProviderSelectedServices(),
  )
  const [activeNavId, setActiveNavId] = useState<ProviderAdminNavId>(() =>
    readInitialProviderNav(searchParams),
  )
  const [catalogItems, setCatalogItems] = useState(() =>
    isProviderSetupComplete() ? ensureProviderCatalogDemoItems() : getProviderCatalogItems(),
  )
  const [workspaceTransition, setWorkspaceTransition] = useState<WorkspaceTransition>('idle')
  const [openTemplateLookup, setOpenTemplateLookup] = useState<BmaasTemplateLookup | null>(null)
  const [openVirtualNetworkId, setOpenVirtualNetworkId] = useState<string | null>(null)
  const [openSubnetId, setOpenSubnetId] = useState<string | null>(null)
  const [openSecurityGroupId, setOpenSecurityGroupId] = useState<string | null>(null)
  const [openCatalogItemKey, setOpenCatalogItemKey] = useState<string | null>(null)
  const [openInstanceId, setOpenInstanceId] = useState<string | null>(null)
  const [openProjectId, setOpenProjectId] = useState<string | null>(null)
  const [instances, setInstances] = useState(() =>
    ensureTenantDemoInstances(PROVIDER_SERVICES_DEMO_TENANT),
  )
  const [projects, setProjects] = useState<TenantProject[]>(() =>
    ensureTenantDemoProjects(PROVIDER_SERVICES_DEMO_TENANT),
  )
  const [projectScopeId, setProjectScopeIdState] = useState<ProjectScopeId>(() =>
    getProjectScopeId(PROVIDER_SERVICES_DEMO_TENANT),
  )
  const [navContentKey, setNavContentKey] = useState(0)
  const provisioningTimersRef = useRef<Map<string, number>>(new Map())
  const catalogEditLeaveAttemptRef = useRef<((onConfirmed: () => void) => void) | null>(null)

  const navParam = searchParams.get('nav')

  useLayoutEffect(() => {
    const requestedNav = normalizeProviderNavParam(navParam)
    if (requestedNav) {
      // Do not re-run full demo seed/sync on every left-nav click — that rewrote
      // catalog identities and could drop unpublished drafts when returning to Catalog.
      const storedItems = getProviderCatalogItems()
      if (storedItems.length === 0) {
        ensureProviderPostSetupPrototype(requestedNav)
      } else {
        setProviderActiveNav(requestedNav)
      }
      setCatalogItems(getProviderCatalogItems())
      setSelectedServices(getProviderSelectedServices())
      setServicesSelected(true)
      setSetupComplete(true)
      setActiveNavId(requestedNav)
      setInstances(ensureTenantDemoInstances(PROVIDER_SERVICES_DEMO_TENANT))
      setProjects(ensureTenantDemoProjects(PROVIDER_SERVICES_DEMO_TENANT))
      setProjectScopeIdState(getProjectScopeId(PROVIDER_SERVICES_DEMO_TENANT))
      return
    }

    const fallbackNav = getProviderActiveNav()
    syncWorkspaceNavParam(setSearchParams, fallbackNav, { replace: true })

    if (isProviderSetupComplete()) {
      const storedItems = getProviderCatalogItems()
      setCatalogItems(
        storedItems.length > 0 ? storedItems : ensureProviderCatalogDemoItems(),
      )
    }
    // Only react when `nav` changes — not when `item=` opens catalog details.
  }, [navParam, setSearchParams])

  const lockedServiceId = getLockedServiceIdFromNav(activeNavId)

  const handleServicesContinue = (nextSelectedServices: ProviderServiceId[]) => {
    setProviderSelectedServices(nextSelectedServices)
    setSelectedServices(nextSelectedServices)
    setServicesSelected(true)
  }

  const handleChangeServices = () => {
    setServicesSelected(false)
  }

  const handleCreateCatalogItem = (payload: PublishedTemplatePayload) => {
    const status = payload.status ?? 'unpublished'
    const draft = {
      catalogItemId: generateCatalogItemId(),
      templateRefId: payload.templateRefId,
      templateName: payload.templateName,
      displayName: payload.displayName,
      description: payload.description,
      scope: payload.scope,
      rateCard: payload.rateCard,
      serviceId: payload.serviceId,
      networkPolicy: payload.networkPolicy ?? DEFAULT_CATALOG_NETWORK_POLICY,
      ...(payload.enterpriseTenantId
        ? { enterpriseTenantId: payload.enterpriseTenantId }
        : {}),
      ...(payload.enterpriseTenantIds?.length
        ? { enterpriseTenantIds: payload.enterpriseTenantIds }
        : {}),
      ...(payload.instanceTypeId ? { instanceTypeId: payload.instanceTypeId } : {}),
      ...(payload.instanceTypeLabel ? { instanceTypeLabel: payload.instanceTypeLabel } : {}),
      ...(payload.diskImageId ? { diskImageId: payload.diskImageId } : {}),
      ...(payload.diskImageLabel ? { diskImageLabel: payload.diskImageLabel } : {}),
      ...(payload.clusterVersionMode
        ? { clusterVersionMode: payload.clusterVersionMode }
        : {}),
      ...(payload.hardwareOsMode ? { hardwareOsMode: payload.hardwareOsMode } : {}),
      ...(payload.nodeSetId ? { nodeSetId: payload.nodeSetId } : {}),
      ...(payload.nodeSetLabel ? { nodeSetLabel: payload.nodeSetLabel } : {}),
      ...(payload.hostTypeId ? { hostTypeId: payload.hostTypeId } : {}),
      ...(payload.hostTypeLabel ? { hostTypeLabel: payload.hostTypeLabel } : {}),
      ...(payload.clusterNodeTopologyMode
        ? { clusterNodeTopologyMode: payload.clusterNodeTopologyMode }
        : {}),
      ...(payload.fieldPolicies?.length ? { fieldPolicies: payload.fieldPolicies } : {}),
      status,
      createdAt: new Date().toISOString(),
    }

    addProviderCatalogItem(draft)

    const vipOrganizationIds =
      payload.vipOrganizationIds?.length
        ? payload.vipOrganizationIds
        : payload.vipOrganizationId
          ? [payload.vipOrganizationId]
          : []

    for (const organizationId of vipOrganizationIds) {
      assignCatalogToRegisteredOrganization(organizationId, draft)
    }

    setCatalogItems(getProviderCatalogItems())

    if (status === 'unpublished') {
      setProviderActiveNav('catalog')
      setProviderSetupComplete()
      setActiveNavId('catalog')
      syncWorkspaceNavParam(setSearchParams, 'catalog', { replace: true })
      setSetupComplete(true)
      setWorkspaceTransition('idle')
      return draft
    }

    setWorkspaceTransition('publishing')

    window.setTimeout(() => {
      setProviderActiveNav('catalog')
      setProviderSetupComplete()
      setActiveNavId('catalog')
      syncWorkspaceNavParam(setSearchParams, 'catalog', { replace: true })
      setSetupComplete(true)
      setWorkspaceTransition('entering')
    }, PUBLISH_PHASE_MS)

    window.setTimeout(() => {
      setWorkspaceTransition('idle')
    }, PUBLISH_PHASE_MS + ENTER_PHASE_MS)

    return draft
  }

  const handleRegisterOrganization = () => {
    setProviderOpenRegisterOrgWizard()
    handleNavChange('administration-organizations')
  }

  const handleProjectScopeChange = (scopeId: ProjectScopeId) => {
    setProjectScopeIdState(scopeId)
    setProjectScopeId(PROVIDER_SERVICES_DEMO_TENANT, scopeId)
  }

  const performNavChange = (navId: ProviderAdminNavId) => {
    setActiveNavId(navId)
    setProviderActiveNav(navId)
    setNavContentKey((current) => current + 1)
    syncWorkspaceNavParam(setSearchParams, navId, { showLanding: true })
    if (
      navId === 'services-baremetal' ||
      navId === 'services-clusters' ||
      navId === 'services-models' ||
      navId === 'services-virtual-machines'
    ) {
      setInstances(ensureTenantDemoInstances(PROVIDER_SERVICES_DEMO_TENANT))
    }
  }

  const handleNavChange = (navId: ProviderAdminNavId) => {
    if (catalogEditLeaveAttemptRef.current) {
      catalogEditLeaveAttemptRef.current(() => {
        performNavChange(navId)
      })
      return
    }

    performNavChange(navId)
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
          PROVIDER_SERVICES_DEMO_TENANT,
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
    setInstances((current) =>
      addTenantUserInstance(PROVIDER_SERVICES_DEMO_TENANT, instance, current),
    )
    scheduleProvisioningCompletion(instance.id, LAUNCH_INSTANCE_PROVISIONING_DURATION_MS)
  }

  const handleNavigateToServices = (instanceId: string, serviceId: CatalogServiceId) => {
    clearProvisioningTimer(instanceId)
    setInstances((current) =>
      updateTenantUserInstance(
        PROVIDER_SERVICES_DEMO_TENANT,
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

  const renderPostSetupContent = () => {
    if (catalogItems.length === 0) {
      return (
        <ProviderAdminOverviewPage />
      )
    }

    switch (activeNavId) {
      case 'services-baremetal':
      case 'services-clusters':
      case 'services-models':
      case 'services-virtual-machines':
        return (
          <TenantUserInstancesPage
            tenantSlug={PROVIDER_SERVICES_DEMO_TENANT}
            instances={instances}
            onInstancesChange={setInstances}
            projects={projects}
            projectScopeId={projectScopeId}
            onProjectScopeChange={handleProjectScopeChange}
            onProjectsChange={setProjects}
            organization={getWorkspaceOrganization(PROVIDER_SERVICES_DEMO_TENANT)}
            lockedServiceId={lockedServiceId ?? 'baremetal'}
            activeNavId={activeNavId}
            instanceNetworkingVariant="summary"
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
      case 'projects-teams':
        return (
          <TenantAdminProjectsTeamsPage
            tenantSlug={PROVIDER_SERVICES_DEMO_TENANT}
            organization={getWorkspaceOrganization(PROVIDER_SERVICES_DEMO_TENANT)}
            projects={projects}
            instances={instances}
            onProjectsChange={setProjects}
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
      case 'catalog':
        return (
          <ProviderAdminCatalogPage
            catalogItems={catalogItems}
            isEntering={workspaceTransition === 'entering'}
            onCreateCatalogItem={handleCreateCatalogItem}
            onCatalogItemsChange={(items) => setCatalogItems(items ?? getProviderCatalogItems())}
            isPublishing={workspaceTransition !== 'idle'}
            onRegisterOrganization={handleRegisterOrganization}
            openCatalogItemKey={openCatalogItemKey}
            onOpenCatalogItemConsumed={() => setOpenCatalogItemKey(null)}
            onProvisioningStarted={handleProvisioningStarted}
            onDismissDuringProvisioning={handleNavigateToServices}
            onWizardFinished={handleNavigateToServices}
            tenantSlug={PROVIDER_SERVICES_DEMO_TENANT}
            projects={projects}
            initialProjectId={isAllProjectsScope(projectScopeId) ? null : projectScopeId}
            onProjectScopeChange={handleProjectScopeChange}
            onProjectsChange={setProjects}
            onEditLeaveAttemptChange={(attemptLeave) => {
              catalogEditLeaveAttemptRef.current = attemptLeave
            }}
          />
        )
      case 'infrastructure-data-centers':
        return <ProviderAdminDataCentersPage />
      case 'infrastructure-hardware-inventory':
        return <ProviderAdminHardwareInventoryPage />
      case 'infrastructure-bmaas-templates':
        return (
          <ProviderAdminBmaasTemplatesPage
            onCreateCatalogItem={handleCreateCatalogItem}
            isPublishing={workspaceTransition !== 'idle'}
            openTemplateLookup={openTemplateLookup}
            onOpenTemplateConsumed={() => setOpenTemplateLookup(null)}
          />
        )
      case 'networking-external-ip-pools':
        return <ProviderAdminExternalIpPoolsPage />
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
      case 'administration-organizations':
        return <ProviderAdminOrganizationsPage onNavigate={handleNavChange} />
      case 'administration-quotas':
        return <ProviderAdminQuotasPage />
      case 'billing-metering':
        return <ProviderAdminBillingMeteringPage />
      case 'system':
        return (
          <PlaceholderProviderAdminPage
            title="System"
            description="Review platform configuration, integrations, and operational settings."
          />
        )
      case 'overview':
      default:
        return (
          <ProviderAdminOverviewPage />
        )
    }
  }

  const renderWorkspaceContent = () => {
    if (!setupComplete) {
      if (servicesSelected) {
        return (
          <ProviderSetupWizardPanel
            selectedServices={selectedServices}
            onChangeServices={handleChangeServices}
            onCreateCatalogItem={handleCreateCatalogItem}
            isPublishing={workspaceTransition !== 'idle'}
          />
        )
      }

      return (
        <ProviderServiceSelectionPage
          initialSelectedServices={selectedServices}
          onContinue={handleServicesContinue}
        />
      )
    }

    return (
      <div key={navContentKey}>{renderPostSetupContent()}</div>
    )
  }

  return (
    <ProviderAdminShell
      showNavigation={setupComplete}
      activeNavId={activeNavId}
      onNavChange={handleNavChange}
      workspaceTransition={workspaceTransition}
    >
      {renderWorkspaceContent()}
    </ProviderAdminShell>
  )
}
