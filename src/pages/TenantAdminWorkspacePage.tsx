import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { TenantAdminAcceptInvitationPanel } from '../components/tenant-admin/TenantAdminAcceptInvitationPanel'
import { TenantShell } from '../components/tenant/TenantShell'
import { DEMO_TENANT_DISPLAY_ADMIN, isDemoTenantId } from '../demoTenant'
import { PlaceholderTenantAdminPage } from './PlaceholderTenantAdminPage'
import { TenantAdminCatalogPage } from './tenant-admin/TenantAdminCatalogPage'
import { TenantAdminNetworkingPage } from './tenant-admin/TenantAdminNetworkingPage'
import { TenantAdminOverviewPage } from './tenant-admin/TenantAdminOverviewPage'
import { TenantAdminProjectsTeamsPage } from './tenant-admin/TenantAdminProjectsTeamsPage'
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

const TENANT_ADMIN_PLACEHOLDER_PAGES: Partial<
  Record<TenantAdminNavId, { title: string; description: string }>
> = {
  services: {
    title: 'Services',
    description: 'Manage Bare Metal, Clusters, Models, and Virtual machines for your organization.',
  },
}

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
    setActiveNavId('catalog')
    setTenantActiveNav(tenant, 'catalog')
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
      case 'catalog':
        return (
          <TenantAdminCatalogPage
            organization={organization}
            catalogDraft={catalogDraft}
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
      case 'networking-virtual-networks':
        return (
          <TenantAdminNetworkingPage
            tenantSlug={tenant}
            organization={organization}
            catalogDraft={catalogDraft}
            kind="virtual-network"
          />
        )
      case 'networking-subnets':
        return (
          <TenantAdminNetworkingPage
            tenantSlug={tenant}
            organization={organization}
            catalogDraft={catalogDraft}
            kind="subnet"
          />
        )
      case 'networking-security-groups':
        return (
          <TenantAdminNetworkingPage
            tenantSlug={tenant}
            organization={organization}
            catalogDraft={catalogDraft}
            kind="security-group"
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
      showNavigation={onboardingComplete}
      activeNavId={activeNavId}
      onNavChange={handleNavChange}
      isOnboardingLayout={!onboardingComplete}
    >
      {renderWorkspaceContent()}
    </TenantShell>
  )
}
