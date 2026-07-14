import { useState } from 'react'
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
import { ProviderAdminBillingMeteringPage } from './ProviderAdminBillingMeteringPage'
import { ProviderAdminOrganizationsPage } from './ProviderAdminOrganizationsPage'
import { ProviderAdminQuotasPage } from './ProviderAdminQuotasPage'
import { PlaceholderProviderAdminPage } from './PlaceholderProviderAdminPage'
import { ProviderServiceSelectionPage } from './provider-setup/ProviderServiceSelectionPage'
import type { ProviderServiceId } from '../providerSetup/constants'
import { generateCatalogItemId, type PublishedTemplatePayload } from '../providerSetup/templateDemo'
import {
  getProviderActiveNav,
  getProviderCatalogDraft,
  getProviderSelectedServices,
  isProviderServicesSelected,
  isProviderSetupComplete,
  setProviderActiveNav,
  setProviderCatalogDraft,
  setProviderOpenRegisterOrgWizard,
  setProviderSelectedServices,
  setProviderSetupComplete,
} from '../providerSetup/storage'

import type { WorkspaceTransition } from '../providerAdmin/workspace'

const PUBLISH_PHASE_MS = 900
const ENTER_PHASE_MS = 700

export function ProviderAdminWorkspacePage() {
  const [setupComplete, setSetupComplete] = useState(() => isProviderSetupComplete())
  const [servicesSelected, setServicesSelected] = useState(() => isProviderServicesSelected())
  const [selectedServices, setSelectedServices] = useState<ProviderServiceId[]>(() =>
    getProviderSelectedServices(),
  )
  const [activeNavId, setActiveNavId] = useState<ProviderAdminNavId>(() => getProviderActiveNav())
  const [catalogDraft, setCatalogDraft] = useState(() => getProviderCatalogDraft())
  const [workspaceTransition, setWorkspaceTransition] = useState<WorkspaceTransition>('idle')

  const handleServicesContinue = (nextSelectedServices: ProviderServiceId[]) => {
    setProviderSelectedServices(nextSelectedServices)
    setSelectedServices(nextSelectedServices)
    setServicesSelected(true)
  }

  const handleChangeServices = () => {
    setServicesSelected(false)
  }

  const handleCreateCatalogItem = (payload: PublishedTemplatePayload) => {
    const draft = {
      catalogItemId: generateCatalogItemId(),
      templateRefId: payload.templateRefId,
      templateName: payload.templateName,
      displayName: payload.displayName,
      scope: payload.scope,
      rateCard: payload.rateCard,
      createdAt: new Date().toISOString(),
    }

    setProviderCatalogDraft(draft)
    setCatalogDraft(draft)
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
    if (!catalogDraft) {
      return (
        <ProviderAdminOverviewPage
          onGoToCatalog={() => handleNavChange('infrastructure-bmaas-templates')}
          onGoToOrganizations={() => handleNavChange('administration-organizations')}
        />
      )
    }

    switch (activeNavId) {
      case 'catalog':
        return (
          <ProviderAdminCatalogPage
            catalogDraft={catalogDraft}
            isEntering={workspaceTransition === 'entering'}
            onCreateCatalogItem={handleCreateCatalogItem}
            isPublishing={workspaceTransition !== 'idle'}
            onRegisterOrganization={handleRegisterOrganization}
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
          />
        )
      case 'infrastructure-external-ip-pools':
        return <ProviderAdminExternalIpPoolsPage />
      case 'administration-organizations':
        return <ProviderAdminOrganizationsPage />
      case 'administration-quotas':
        return <ProviderAdminQuotasPage />
      case 'administration-rbac':
        return (
          <PlaceholderProviderAdminPage
            title="RBAC"
            description="Configure roles and permissions for provider administrators and tenant users."
          />
        )
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
          <ProviderAdminOverviewPage
            onGoToCatalog={() => handleNavChange('catalog')}
            onGoToOrganizations={() => handleNavChange('administration-organizations')}
          />
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
