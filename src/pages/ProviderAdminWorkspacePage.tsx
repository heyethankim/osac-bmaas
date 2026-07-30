import { useLayoutEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ProviderAdminShell } from '../components/provider-admin/ProviderAdminShell'
import { ProviderSetupWizardPanel } from '../components/provider-setup/ProviderSetupWizardPanel'
import type { ProviderAdminNavId } from '../providerAdmin/constants'
import { ProviderAdminCatalogPage } from './ProviderAdminCatalogPage'
import { ProviderAdminOverviewPage } from './ProviderAdminOverviewPage'
import { ProviderAdminBmaasTemplatesPage } from './infrastructure/ProviderAdminBmaasTemplatesPage'
import { ProviderAdminComputeImagesPage } from './infrastructure/ProviderAdminComputeImagesPage'
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
import { ensureTenantDemoInstances } from '../tenantUser/storage'

import type { WorkspaceTransition } from '../providerAdmin/workspace'
import type { BmaasTemplateLookup } from '../providerAdmin/bmaasTemplates'

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
  const [searchParams] = useSearchParams()
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
  const [instances, setInstances] = useState(() =>
    ensureTenantDemoInstances(PROVIDER_SERVICES_DEMO_TENANT),
  )

  useLayoutEffect(() => {
    const requestedNav = normalizeProviderNavParam(searchParams.get('nav'))
    if (requestedNav) {
      ensureProviderPostSetupPrototype(requestedNav)
      setCatalogItems(getProviderCatalogItems())
      setSelectedServices(getProviderSelectedServices())
      setServicesSelected(true)
      setSetupComplete(true)
      setActiveNavId(requestedNav)
      setInstances(ensureTenantDemoInstances(PROVIDER_SERVICES_DEMO_TENANT))
      return
    }

    if (isProviderSetupComplete()) {
      setCatalogItems(ensureProviderCatalogDemoItems())
    }
  }, [searchParams])

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
      status,
      createdAt: new Date().toISOString(),
    }

    addProviderCatalogItem(draft)

    if (payload.vipOrganizationId) {
      assignCatalogToRegisteredOrganization(payload.vipOrganizationId, draft)
    }

    setCatalogItems(getProviderCatalogItems())

    if (status === 'unpublished') {
      setProviderActiveNav('catalog')
      setProviderSetupComplete()
      setActiveNavId('catalog')
      setSetupComplete(true)
      setWorkspaceTransition('idle')
      return draft
    }

    setWorkspaceTransition('publishing')

    window.setTimeout(() => {
      setProviderActiveNav('catalog')
      setProviderSetupComplete()
      setActiveNavId('catalog')
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

  const handleNavChange = (navId: ProviderAdminNavId) => {
    setActiveNavId(navId)
    setProviderActiveNav(navId)
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
            defaultScopeFieldLabel="Organization"
            lockedServiceId={lockedServiceId ?? 'baremetal'}
          />
        )
      case 'catalog':
        return (
          <ProviderAdminCatalogPage
            catalogItems={catalogItems}
            isEntering={workspaceTransition === 'entering'}
            onCreateCatalogItem={handleCreateCatalogItem}
            onCatalogItemsChange={() => setCatalogItems(getProviderCatalogItems())}
            isPublishing={workspaceTransition !== 'idle'}
            onRegisterOrganization={handleRegisterOrganization}
            onNavigateToLinkedTemplate={(template) => {
              setOpenTemplateLookup(template)
              handleNavChange('infrastructure-bmaas-templates')
            }}
          />
        )
      case 'infrastructure-data-centers':
        return <ProviderAdminDataCentersPage />
      case 'infrastructure-hardware-inventory':
        return <ProviderAdminHardwareInventoryPage />
      case 'infrastructure-compute-images':
        return <ProviderAdminComputeImagesPage />
      case 'infrastructure-bmaas-templates':
        return (
          <ProviderAdminBmaasTemplatesPage
            onCreateCatalogItem={handleCreateCatalogItem}
            isPublishing={workspaceTransition !== 'idle'}
            openTemplateLookup={openTemplateLookup}
            onOpenTemplateConsumed={() => setOpenTemplateLookup(null)}
          />
        )
      case 'infrastructure-external-ip-pools':
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

    return renderPostSetupContent()
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
