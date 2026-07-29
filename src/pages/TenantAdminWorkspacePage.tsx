import { useLayoutEffect, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
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

function isTenantAdminNavId(value: string | null): value is TenantAdminNavId {
  return (
    value === 'overview' ||
    value === 'catalog' ||
    value === 'services' ||
    value === 'projects-teams' ||
    value === 'networking-virtual-networks' ||
    value === 'networking-subnets' ||
    value === 'networking-security-groups'
  )
}

/** Seeds post-onboarding Tenant Admin state so landing-page prototype links can open finished screens. */
function ensureTenantAdminPostOnboardingPrototype(tenant: string, navId: TenantAdminNavId) {
  setTenantOnboardingComplete(tenant)
  setTenantActiveNav(tenant, navId)
}

function readInitialTenantAdminNav(
  tenant: string,
  searchParams: URLSearchParams,
): TenantAdminNavId {
  const requestedNav = searchParams.get('nav')
  if (isTenantAdminNavId(requestedNav)) {
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

  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    if (!isValidTenant) {
      return false
    }
    if (isTenantAdminNavId(searchParams.get('nav'))) {
      return true
    }
    return isTenantOnboardingComplete(tenant)
  })
  const [organization, setOrganization] = useState(() => getWorkspaceOrganization(tenant))
  const [activeNavId, setActiveNavId] = useState<TenantAdminNavId>(() =>
    isValidTenant ? readInitialTenantAdminNav(tenant, searchParams) : 'overview',
  )
  const [projects, setProjects] = useState<TenantProject[]>(() => getTenantProjects(tenant))
  const [openVirtualNetworkId, setOpenVirtualNetworkId] = useState<string | null>(null)

  useLayoutEffect(() => {
    if (!isValidTenant) {
      return
    }

    const requestedNav = searchParams.get('nav')
    if (!isTenantAdminNavId(requestedNav)) {
      return
    }

    ensureTenantAdminPostOnboardingPrototype(tenant, requestedNav)
    setOrganization(getWorkspaceOrganization(tenant))
    setOnboardingComplete(true)
    setActiveNavId(requestedNav)
  }, [isValidTenant, searchParams, tenant])

  if (!isValidTenant) {
    return <Navigate to="/" replace />
  }

  const catalogDraft = getProviderCatalogDraft()
  const displayName = organization.tenantAdminName ?? DEMO_TENANT_DISPLAY_ADMIN.northstar

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
            openVirtualNetworkId={openVirtualNetworkId}
            onOpenVirtualNetworkConsumed={() => setOpenVirtualNetworkId(null)}
          />
        )
      case 'networking-subnets':
        return (
          <TenantAdminNetworkingPage
            tenantSlug={tenant}
            organization={organization}
            catalogDraft={catalogDraft}
            kind="subnet"
            onNavigateToVirtualNetwork={(virtualNetworkId) => {
              setOpenVirtualNetworkId(virtualNetworkId)
              handleNavChange('networking-virtual-networks')
            }}
          />
        )
      case 'networking-security-groups':
        return (
          <TenantAdminNetworkingPage
            tenantSlug={tenant}
            organization={organization}
            catalogDraft={catalogDraft}
            kind="security-group"
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
      showNavigation={onboardingComplete}
      activeNavId={activeNavId}
      onNavChange={handleNavChange}
      isOnboardingLayout={!onboardingComplete}
    >
      {renderWorkspaceContent()}
    </TenantShell>
  )
}
