import type { TenantAdminNavId } from './constants'
import { TENANT_ADMIN_NAV_ITEMS } from './constants'
import type { TenantCatalogItem } from './catalogItems'
import type { OrganizationExternalIpPool, TenantProject } from './projects'

const TENANT_ONBOARDING_COMPLETE_KEY_PREFIX = 'bmaas-tenant-onboarding-complete-'
const TENANT_ACTIVE_NAV_KEY_PREFIX = 'bmaas-tenant-active-nav-'
const TENANT_TEAM_MEMBERS_KEY_PREFIX = 'bmaas-tenant-team-members-'
const TENANT_PROJECTS_KEY_PREFIX = 'bmaas-tenant-projects-'
const TENANT_CATALOG_ITEMS_KEY_PREFIX = 'bmaas-tenant-catalog-items-'

export type TenantTeamMember = {
  id: string
  name: string
  email: string
  role: 'Tenant user'
}

function getSlugKey(prefix: string, slug: string): string {
  return `${prefix}${slug}`
}

function isTenantTeamMember(value: unknown): value is TenantTeamMember {
  if (!value || typeof value !== 'object') {
    return false
  }

  const member = value as TenantTeamMember
  return (
    typeof member.id === 'string' &&
    typeof member.name === 'string' &&
    typeof member.email === 'string' &&
    member.role === 'Tenant user'
  )
}

export function generateTeamMemberId(): string {
  const suffix = Math.random().toString(36).slice(2, 8)
  return `member_${suffix}`
}

export function isTenantOnboardingComplete(slug: string): boolean {
  try {
    return sessionStorage.getItem(getSlugKey(TENANT_ONBOARDING_COMPLETE_KEY_PREFIX, slug)) === 'true'
  } catch {
    return false
  }
}

export function setTenantOnboardingComplete(slug: string): void {
  try {
    sessionStorage.setItem(getSlugKey(TENANT_ONBOARDING_COMPLETE_KEY_PREFIX, slug), 'true')
  } catch {
    /* demo storage unavailable */
  }
}

export function clearTenantOnboardingComplete(slug: string): void {
  try {
    sessionStorage.removeItem(getSlugKey(TENANT_ONBOARDING_COMPLETE_KEY_PREFIX, slug))
  } catch {
    /* demo storage unavailable */
  }
}

const LEGACY_TENANT_ADMIN_NAV_IDS: Record<string, TenantAdminNavId> = {
  catalog: 'catalog-manager',
  'team-access': 'projects-teams',
  'cost-allocation': 'billing',
  'quota-distribution': 'ip-pools',
  'financial-audit': 'billing',
  'usage-budget': 'overview',
}

const VALID_TENANT_ADMIN_NAV_IDS = new Set<TenantAdminNavId>(
  TENANT_ADMIN_NAV_ITEMS.map((item) => item.id),
)

function normalizeTenantAdminNavId(value: string | null): TenantAdminNavId {
  if (!value) {
    return 'overview'
  }

  if (VALID_TENANT_ADMIN_NAV_IDS.has(value as TenantAdminNavId)) {
    return value as TenantAdminNavId
  }

  return LEGACY_TENANT_ADMIN_NAV_IDS[value] ?? 'overview'
}

export function getTenantActiveNav(slug: string): TenantAdminNavId {
  try {
    const value = sessionStorage.getItem(getSlugKey(TENANT_ACTIVE_NAV_KEY_PREFIX, slug))
    const normalized = normalizeTenantAdminNavId(value)

    if (value !== normalized) {
      setTenantActiveNav(slug, normalized)
    }

    return normalized
  } catch {
    /* demo storage unavailable */
  }

  return 'overview'
}

export function setTenantActiveNav(slug: string, navId: TenantAdminNavId): void {
  try {
    sessionStorage.setItem(getSlugKey(TENANT_ACTIVE_NAV_KEY_PREFIX, slug), navId)
  } catch {
    /* demo storage unavailable */
  }
}

export function getTenantTeamMembers(slug: string): TenantTeamMember[] {
  try {
    const raw = sessionStorage.getItem(getSlugKey(TENANT_TEAM_MEMBERS_KEY_PREFIX, slug))
    if (!raw) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isTenantTeamMember)
  } catch {
    return []
  }
}

export function setTenantTeamMembers(slug: string, members: TenantTeamMember[]): void {
  try {
    sessionStorage.setItem(getSlugKey(TENANT_TEAM_MEMBERS_KEY_PREFIX, slug), JSON.stringify(members))
  } catch {
    /* demo storage unavailable */
  }
}

function isTenantProjectMember(value: unknown): value is TenantProject['members'][number] {
  if (!value || typeof value !== 'object') {
    return false
  }

  const member = value as TenantProject['members'][number]
  return (
    typeof member.id === 'string' &&
    typeof member.name === 'string' &&
    typeof member.email === 'string' &&
    (member.role === 'developer' || member.role === 'project-admin' || member.role === 'viewer')
  )
}

function isTenantProjectCatalogItem(value: unknown): value is TenantProject['catalogItems'][number] {
  if (!value || typeof value !== 'object') {
    return false
  }

  const item = value as TenantProject['catalogItems'][number]
  return typeof item.id === 'string' && typeof item.displayName === 'string'
}

function isTenantProject(value: unknown): value is TenantProject {
  if (!value || typeof value !== 'object') {
    return false
  }

  const project = value as TenantProject & {
    catalogItemId?: string | null
    catalogDisplayName?: string | null
  }

  const hasCatalogItemsArray = Array.isArray(project.catalogItems)
  const hasLegacyCatalogFields =
    project.catalogItemId === null ||
    typeof project.catalogItemId === 'string' ||
    project.catalogDisplayName === null ||
    typeof project.catalogDisplayName === 'string'

  return (
    typeof project.id === 'string' &&
    typeof project.name === 'string' &&
    typeof project.description === 'string' &&
    typeof project.instanceQuota === 'number' &&
    (project.externalIpPoolId === null || typeof project.externalIpPoolId === 'string') &&
    (project.externalIpPoolName === null || typeof project.externalIpPoolName === 'string') &&
    (project.externalIpPoolCidr === null || typeof project.externalIpPoolCidr === 'string') &&
    (hasCatalogItemsArray || hasLegacyCatalogFields) &&
    (project.members === undefined || Array.isArray(project.members)) &&
    typeof project.createdAt === 'string'
  )
}

function normalizeTenantProject(value: TenantProject): TenantProject {
  const project = value as TenantProject & {
    catalogItemId?: string | null
    catalogDisplayName?: string | null
  }

  const catalogItems = Array.isArray(project.catalogItems)
    ? project.catalogItems.filter(isTenantProjectCatalogItem)
    : project.catalogItemId && project.catalogDisplayName
      ? [{ id: project.catalogItemId, displayName: project.catalogDisplayName }]
      : []

  const members = Array.isArray(project.members) ? project.members.filter(isTenantProjectMember) : []

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    instanceQuota: project.instanceQuota,
    externalIpPoolId: project.externalIpPoolId ?? null,
    externalIpPoolName: project.externalIpPoolName ?? null,
    externalIpPoolCidr: project.externalIpPoolCidr ?? null,
    catalogItems,
    members,
    createdAt: project.createdAt,
  }
}

export function getTenantProjects(slug: string): TenantProject[] {
  try {
    const raw = sessionStorage.getItem(getSlugKey(TENANT_PROJECTS_KEY_PREFIX, slug))
    if (!raw) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isTenantProject).map(normalizeTenantProject)
  } catch {
    return []
  }
}

export function setTenantProjects(slug: string, projects: TenantProject[]): void {
  try {
    sessionStorage.setItem(getSlugKey(TENANT_PROJECTS_KEY_PREFIX, slug), JSON.stringify(projects))
  } catch {
    /* demo storage unavailable */
  }
}

export function addTenantProject(slug: string, project: TenantProject): void {
  const current = getTenantProjects(slug)
  setTenantProjects(slug, [...current, project])
}

export function removeTenantProject(slug: string, projectId: string): TenantProject[] {
  const updated = getTenantProjects(slug).filter((project) => project.id !== projectId)
  setTenantProjects(slug, updated)
  return updated
}

export function attachExternalIpPoolToTenantProject(
  slug: string,
  projectId: string,
  pool: OrganizationExternalIpPool,
): TenantProject[] {
  const updated = getTenantProjects(slug).map((project) =>
    project.id === projectId
      ? {
          ...project,
          externalIpPoolId: pool.id,
          externalIpPoolName: pool.name,
          externalIpPoolCidr: pool.cidr,
        }
      : project,
  )

  setTenantProjects(slug, updated)
  return updated
}

export function detachExternalIpPoolFromTenantProject(
  slug: string,
  projectId: string,
): TenantProject[] {
  const updated = getTenantProjects(slug).map((project) =>
    project.id === projectId
      ? {
          ...project,
          externalIpPoolId: null,
          externalIpPoolName: null,
          externalIpPoolCidr: null,
        }
      : project,
  )

  setTenantProjects(slug, updated)
  return updated
}

function isTenantCatalogItem(value: unknown): value is TenantCatalogItem {
  if (!value || typeof value !== 'object') {
    return false
  }

  const item = value as TenantCatalogItem
  return (
    typeof item.id === 'string' &&
    typeof item.displayName === 'string' &&
    item.source === 'custom' &&
    (item.sourceCatalogItemId === null || typeof item.sourceCatalogItemId === 'string') &&
    typeof item.createdAt === 'string' &&
    typeof item.rateCard === 'object' &&
    item.rateCard !== null &&
    typeof item.rateCard.hourlyRate === 'number' &&
    typeof item.rateCard.monthlyRate === 'number' &&
    typeof item.rateCard.currency === 'string' &&
    item.rateCard.billingUnit === 'per-instance'
  )
}

export function getTenantCatalogItems(slug: string): TenantCatalogItem[] {
  try {
    const raw = sessionStorage.getItem(getSlugKey(TENANT_CATALOG_ITEMS_KEY_PREFIX, slug))
    if (!raw) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isTenantCatalogItem)
  } catch {
    return []
  }
}

export function setTenantCatalogItems(slug: string, items: TenantCatalogItem[]): void {
  try {
    sessionStorage.setItem(getSlugKey(TENANT_CATALOG_ITEMS_KEY_PREFIX, slug), JSON.stringify(items))
  } catch {
    /* demo storage unavailable */
  }
}

export function addTenantCatalogItem(slug: string, item: TenantCatalogItem): TenantCatalogItem[] {
  const updated = [...getTenantCatalogItems(slug), item]
  setTenantCatalogItems(slug, updated)
  return updated
}

export function setTenantProjectCatalogItems(
  slug: string,
  projectId: string,
  catalogItems: TenantProject['catalogItems'],
): TenantProject[] {
  const updated = getTenantProjects(slug).map((project) =>
    project.id === projectId
      ? {
          ...project,
          catalogItems,
        }
      : project,
  )

  setTenantProjects(slug, updated)
  return updated
}

export function attachCatalogItemToTenantProject(
  slug: string,
  projectId: string,
  catalogItemId: string,
  catalogDisplayName: string,
): TenantProject[] {
  const updated = getTenantProjects(slug).map((project) => {
    if (project.id !== projectId) {
      return project
    }

    if (project.catalogItems.some((item) => item.id === catalogItemId)) {
      return project
    }

    return {
      ...project,
      catalogItems: [...project.catalogItems, { id: catalogItemId, displayName: catalogDisplayName }],
    }
  })

  setTenantProjects(slug, updated)
  return updated
}

export function detachCatalogItemFromTenantProject(
  slug: string,
  projectId: string,
  catalogItemId?: string,
): TenantProject[] {
  const updated = getTenantProjects(slug).map((project) => {
    if (project.id !== projectId) {
      return project
    }

    if (!catalogItemId) {
      return {
        ...project,
        catalogItems: [],
      }
    }

    return {
      ...project,
      catalogItems: project.catalogItems.filter((item) => item.id !== catalogItemId),
    }
  })

  setTenantProjects(slug, updated)
  return updated
}
