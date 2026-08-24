import type { RegisteredOrganization } from './organizations'
import type { ProviderAdminNavId } from './constants'
import type { TenantAdminNavId } from '../tenantAdmin/constants'
import { setTenantActiveNav } from '../tenantAdmin/storage'
import { getWorkspaceOrganization } from '../tenantAdmin/organizations'
import { setProviderActiveNav } from '../providerSetup/storage'
import {
  setTenantUserActiveNav,
  setTenantUserOnboardingComplete,
} from '../tenantUser/storage'

const VIEWING_AS_TENANT_USER_KEY = 'bmaas-provider-viewing-as-tenant-user'

/** Demo tenant-user workspace is wired for North Summit Bank (`northsummit`). */
const DEMO_TENANT_USER_WORKSPACE_SLUG = 'northsummit' as const

export type ViewingAsTenantUserSource = 'provider' | 'tenant-admin'

export type ProviderViewingAsTenantUser = {
  organizationId: string
  organizationName: string
  tenantSlug: typeof DEMO_TENANT_USER_WORKSPACE_SLUG
  catalogItemId?: string
  catalogDisplayName?: string
  autoLaunch?: boolean
  source: ViewingAsTenantUserSource
  /** Provider Admin return target (when source is provider). */
  returnNav: ProviderAdminNavId
  /** Tenant Admin org slug for return (when source is tenant-admin). */
  returnTenantSlug?: string
  /** Tenant Admin return nav (when source is tenant-admin). */
  returnTenantAdminNav?: TenantAdminNavId
}

export type OpenAsTenantUserOptions = {
  catalogItem?: {
    catalogItemId?: string
    displayName: string
  }
  autoLaunch?: boolean
  source?: ViewingAsTenantUserSource
  returnNav?: ProviderAdminNavId
  returnTenantSlug?: string
  returnTenantAdminNav?: TenantAdminNavId
}

/** Demo org used when Provider Admin has no registered organizations yet. */
export function getDemoTenantUserOrganization(): RegisteredOrganization {
  return getWorkspaceOrganization(DEMO_TENANT_USER_WORKSPACE_SLUG)
}

/**
 * Prefer a registered org; otherwise fall back to the North Summit Bank demo org
 * so catalog preview works with an empty Organizations page.
 */
export function resolveOrganizationForTenantUserPreview(
  organizations: RegisteredOrganization[],
): RegisteredOrganization {
  return organizations[0] ?? getDemoTenantUserOrganization()
}

function isProviderReturnNav(value: unknown): value is ProviderAdminNavId {
  return value === 'catalog' || value === 'administration-organizations' || value === undefined
}

function isTenantAdminReturnNav(value: unknown): value is TenantAdminNavId {
  return value === 'catalog' || value === 'overview' || value === 'projects-teams'
}

export function getProviderViewingAsTenantUser(): ProviderViewingAsTenantUser | null {
  try {
    const raw = sessionStorage.getItem(VIEWING_AS_TENANT_USER_KEY)
    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) {
      return null
    }

    const candidate = parsed as Partial<ProviderViewingAsTenantUser>
    if (
      typeof candidate.organizationId !== 'string' ||
      typeof candidate.organizationName !== 'string' ||
      candidate.tenantSlug !== DEMO_TENANT_USER_WORKSPACE_SLUG
    ) {
      return null
    }

    const source: ViewingAsTenantUserSource =
      candidate.source === 'tenant-admin' ? 'tenant-admin' : 'provider'

    if (source === 'provider' && !isProviderReturnNav(candidate.returnNav)) {
      return null
    }

    if (
      source === 'tenant-admin' &&
      (typeof candidate.returnTenantSlug !== 'string' ||
        !isTenantAdminReturnNav(candidate.returnTenantAdminNav))
    ) {
      return null
    }

    return {
      organizationId: candidate.organizationId,
      organizationName: candidate.organizationName,
      tenantSlug: DEMO_TENANT_USER_WORKSPACE_SLUG,
      catalogItemId: candidate.catalogItemId,
      catalogDisplayName: candidate.catalogDisplayName,
      autoLaunch: candidate.autoLaunch,
      source,
      returnNav: candidate.returnNav ?? 'administration-organizations',
      returnTenantSlug: candidate.returnTenantSlug,
      returnTenantAdminNav: candidate.returnTenantAdminNav ?? 'catalog',
    }
  } catch {
    /* demo storage unavailable */
  }

  return null
}

export function clearProviderViewingAsTenantUser(): void {
  try {
    sessionStorage.removeItem(VIEWING_AS_TENANT_USER_KEY)
  } catch {
    /* demo storage unavailable */
  }
}

/** Seeds tenant-user workspace and returns the path to open. */
export function openAsTenantUser(
  organization: RegisteredOrganization,
  options: OpenAsTenantUserOptions = {},
): string {
  const source = options.source ?? 'provider'

  const viewingAs: ProviderViewingAsTenantUser = {
    organizationId: organization.id,
    organizationName: organization.name,
    tenantSlug: DEMO_TENANT_USER_WORKSPACE_SLUG,
    source,
    returnNav: options.returnNav ?? 'administration-organizations',
    ...(source === 'tenant-admin'
      ? {
          returnTenantSlug: options.returnTenantSlug ?? organization.slug,
          returnTenantAdminNav: options.returnTenantAdminNav ?? 'catalog',
        }
      : {}),
    ...(options.catalogItem
      ? {
          catalogItemId: options.catalogItem.catalogItemId,
          catalogDisplayName: options.catalogItem.displayName,
          autoLaunch: options.autoLaunch ?? false,
        }
      : {}),
  }

  try {
    sessionStorage.setItem(VIEWING_AS_TENANT_USER_KEY, JSON.stringify(viewingAs))
  } catch {
    /* demo storage unavailable */
  }

  setTenantUserOnboardingComplete(DEMO_TENANT_USER_WORKSPACE_SLUG)
  setTenantUserActiveNav(DEMO_TENANT_USER_WORKSPACE_SLUG, 'catalog')

  return `/tenant-user/${DEMO_TENANT_USER_WORKSPACE_SLUG}/workspace`
}

/** Clears preview mode and returns the admin path that started the jump. */
export function returnFromTenantUserPreview(): string {
  const preview = getProviderViewingAsTenantUser()
  clearProviderViewingAsTenantUser()

  if (preview?.source === 'tenant-admin') {
    const tenantSlug = preview.returnTenantSlug ?? 'northsummit'
    const returnNav = preview.returnTenantAdminNav ?? 'catalog'
    setTenantActiveNav(tenantSlug, returnNav)
    return `/tenant-admin/${tenantSlug}/workspace`
  }

  const returnNav = preview?.returnNav ?? 'administration-organizations'
  setProviderActiveNav(returnNav)
  return `/provider/workspace?nav=${returnNav}`
}

/** @deprecated Prefer returnFromTenantUserPreview */
export function returnToProviderAdminFromTenantUser(): string {
  return returnFromTenantUserPreview()
}
