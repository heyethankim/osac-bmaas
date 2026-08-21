import { useLayoutEffect, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { TenantShell } from '../components/tenant/TenantShell'
import { TenantAdminAdministratorsPage } from './tenant-admin/TenantAdminAdministratorsPage'
import { IdpManagerIdentityProviderPage } from './idp-manager/IdpManagerIdentityProviderPage'
import {
  IDP_MANAGER_NAV_ITEMS,
  IDP_MANAGER_ROLES_COPY,
  isIdpManagerNavId,
  type IdpManagerNavId,
} from '../idpManager/constants'
import {
  getIdpManagerPrototypeRoute,
  hasBreakGlassAccount,
  type RegisteredOrganization,
} from '../providerAdmin/organizations'
import {
  ensureProviderDemoOrganizations,
  getProviderRegisteredOrganizations,
} from '../providerSetup/storage'
import { syncWorkspaceNavParam } from '../shared/workspaceNavUrl'

function findOrganizationBySlug(slug: string): RegisteredOrganization | null {
  const normalized = slug.trim().toLowerCase()
  return (
    getProviderRegisteredOrganizations().find(
      (organization) => organization.slug.toLowerCase() === normalized,
    ) ?? null
  )
}

function loadWorkspaceOrganization(orgSlug: string): RegisteredOrganization | null {
  ensureProviderDemoOrganizations()
  const match = findOrganizationBySlug(orgSlug)
  return match && hasBreakGlassAccount(match) ? match : null
}

export function IdpManagerWorkspacePage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  if (!orgSlug?.trim()) {
    return <Navigate to="/" replace />
  }

  return <IdpManagerWorkspaceSession key={orgSlug} orgSlug={orgSlug} />
}

function IdpManagerWorkspaceSession({ orgSlug }: { orgSlug: string }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [organization, setOrganization] = useState<RegisteredOrganization | null>(() =>
    loadWorkspaceOrganization(orgSlug),
  )
  const [navContentKey, setNavContentKey] = useState(0)
  const requestedNav = searchParams.get('nav')
  const activeNavId: IdpManagerNavId = isIdpManagerNavId(requestedNav)
    ? requestedNav
    : 'identity-provider'

  useLayoutEffect(() => {
    if (isIdpManagerNavId(searchParams.get('nav'))) {
      return
    }
    syncWorkspaceNavParam(setSearchParams, 'identity-provider', { replace: true })
  }, [searchParams, setSearchParams])

  if (!organization) {
    return <Navigate to={getIdpManagerPrototypeRoute(orgSlug)} replace />
  }

  const handleNavChange = (navId: string) => {
    if (!isIdpManagerNavId(navId)) {
      return
    }
    setNavContentKey((current) => current + 1)
    syncWorkspaceNavParam(setSearchParams, navId, { showLanding: true })
  }

  const renderWorkspaceContent = () => {
    if (activeNavId === 'roles') {
      return (
        <TenantAdminAdministratorsPage
          organization={organization}
          onOrganizationChange={setOrganization}
          title={IDP_MANAGER_ROLES_COPY.title}
          lede={IDP_MANAGER_ROLES_COPY.lede}
          addAdministratorLabel={IDP_MANAGER_ROLES_COPY.addAdministratorLabel}
          wizardTitle={IDP_MANAGER_ROLES_COPY.wizardTitle}
          wizardSubmitLabel={IDP_MANAGER_ROLES_COPY.wizardSubmitLabel}
          emptyUnfilteredTitle={IDP_MANAGER_ROLES_COPY.emptyTitle}
          emptyUnfilteredBody={IDP_MANAGER_ROLES_COPY.emptyBody}
          showAssignmentStatus
          showRoleCatalog
        />
      )
    }

    return (
      <IdpManagerIdentityProviderPage
        key={organization.id}
        organization={organization}
        onOrganizationChange={setOrganization}
      />
    )
  }

  return (
    <TenantShell
      role="idp-manager"
      displayName={
        organization.breakGlassUsername ?? `breakglass-${organization.slug}`
      }
      navItems={IDP_MANAGER_NAV_ITEMS}
      showNavigation
      activeNavId={activeNavId}
      onNavChange={handleNavChange}
    >
      <div key={navContentKey}>{renderWorkspaceContent()}</div>
    </TenantShell>
  )
}
