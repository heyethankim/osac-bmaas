import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { TenantAdminAcceptInvitationPanel } from '../components/tenant-admin/TenantAdminAcceptInvitationPanel'
import { TenantShell } from '../components/tenant/TenantShell'
import { DEMO_TENANT_DISPLAY_ADMIN, isDemoTenantId } from '../demoTenant'
import { TenantAdminBillingPage } from './tenant-admin/TenantAdminBillingPage'
import { TenantAdminCatalogPage } from './tenant-admin/TenantAdminCatalogPage'
import { TenantAdminInstancesPage } from './tenant-admin/TenantAdminInstancesPage'
import { TenantAdminOverviewPage } from './tenant-admin/TenantAdminOverviewPage'
import { TenantAdminProjectsTeamsPage } from './tenant-admin/TenantAdminProjectsTeamsPage'
import { TenantAdminQuotaDistributionPage } from './tenant-admin/TenantAdminQuotaDistributionPage'
import { TenantAdminSettingsPage } from './tenant-admin/TenantAdminSettingsPage'
import { TENANT_ADMIN_NAV_ITEMS, type TenantAdminNavId } from '../tenantAdmin/constants'
import { getWorkspaceOrganization } from '../tenantAdmin/organizations'
import {
  getTenantActiveNav,
  getTenantProjects,
  isTenantOnboardingComplete,
  setTenantActiveNav,
  setTenantOnboardingComplete,
} from '../tenantAdmin/storage'
import type { TenantProject } from '../tenantAdmin/projects'
import { getProviderCatalogDraft } from '../providerSetup/storage'

export function TenantAdminWorkspacePage() {
  const { tenant } = useParams<{ tenant: string }>()

  if (!tenant || !isDemoTenantId(tenant) || tenant !== 'northstar') {
    return <Navigate to="/" replace />
  }

  const [onboardingComplete, setOnboardingComplete] = useState(() =>
    isTenantOnboardingComplete(tenant),
  )
  const [organization, setOrganization] = useState(() => getWorkspaceOrganization(tenant))
  const [activeNavId, setActiveNavId] = useState<TenantAdminNavId>(() => getTenantActiveNav(tenant))
  const [projects, setProjects] = useState<TenantProject[]>(() => getTenantProjects(tenant))

  const catalogDraft = getProviderCatalogDraft()
  const displayName = organization.tenantAdminName ?? DEMO_TENANT_DISPLAY_ADMIN[tenant]

  const handleNavChange = (navId: string) => {
    const nextNavId = navId as TenantAdminNavId
    setActiveNavId(nextNavId)
    setTenantActiveNav(tenant, nextNavId)
  }

  const handleInvitationAccepted = () => {
    setTenantOnboardingComplete(tenant)

    const refreshedOrganization = getWorkspaceOrganization(tenant)
    setOrganization(
      refreshedOrganization.status === 'Active'
        ? refreshedOrganization
        : { ...refreshedOrganization, status: 'Active' },
    )
    setOnboardingComplete(true)
    setActiveNavId('catalog-manager')
    setTenantActiveNav(tenant, 'catalog-manager')
  }

  const renderWorkspaceContent = () => {
    if (!onboardingComplete) {
      return (
        <TenantAdminAcceptInvitationPanel
          organization={organization}
          catalogDraft={catalogDraft}
          onAccept={handleInvitationAccepted}
        />
      )
    }

    switch (activeNavId) {
      case 'catalog-manager':
        return (
          <TenantAdminCatalogPage
            projects={projects}
            onNavigateToProjectsTeams={() => handleNavChange('projects-teams')}
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
      case 'instances':
        return <TenantAdminInstancesPage />
      case 'ip-pools':
        return <TenantAdminQuotaDistributionPage />
      case 'billing':
        return <TenantAdminBillingPage />
      case 'settings':
        return <TenantAdminSettingsPage />
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
      showNavigation={onboardingComplete}
      activeNavId={activeNavId}
      onNavChange={handleNavChange}
      isOnboardingLayout={!onboardingComplete}
    >
      {renderWorkspaceContent()}
    </TenantShell>
  )
}
