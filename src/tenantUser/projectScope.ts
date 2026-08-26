/** Catalog + Services project working context (All projects vs a specific project). */

import type { TenantProject } from '../tenantAdmin/projects'
import { getTenantProjects } from '../tenantAdmin/storage'
import type { TenantInstance } from './instances'
import { instanceBelongsToProject } from './instances'
import {
  resolveTenantUserLaunchScope,
  type TenantUserLaunchScope,
} from './scope'
import type { RegisteredOrganization } from '../providerAdmin/organizations'
import type { DemoTenantId } from '../demoTenant'

export const ALL_PROJECTS_SCOPE_ID = 'all' as const

export type ProjectScopeId = typeof ALL_PROJECTS_SCOPE_ID | string

const PROJECT_SCOPE_KEY_PREFIX = 'bmaas-project-scope-'

function getSlugKey(prefix: string, slug: string): string {
  return `${prefix}${slug}`
}

export function isAllProjectsScope(scopeId: ProjectScopeId | null | undefined): boolean {
  return !scopeId || scopeId === ALL_PROJECTS_SCOPE_ID
}

export function getProjectScopeId(tenantSlug: string): ProjectScopeId {
  try {
    const stored = sessionStorage.getItem(getSlugKey(PROJECT_SCOPE_KEY_PREFIX, tenantSlug))
    if (!stored) {
      return ALL_PROJECTS_SCOPE_ID
    }
    if (stored === ALL_PROJECTS_SCOPE_ID) {
      return ALL_PROJECTS_SCOPE_ID
    }
    const stillExists = getTenantProjects(tenantSlug).some((project) => project.id === stored)
    return stillExists ? stored : ALL_PROJECTS_SCOPE_ID
  } catch {
    return ALL_PROJECTS_SCOPE_ID
  }
}

export function setProjectScopeId(tenantSlug: string, scopeId: ProjectScopeId): void {
  try {
    sessionStorage.setItem(getSlugKey(PROJECT_SCOPE_KEY_PREFIX, tenantSlug), scopeId)
  } catch {
    /* demo storage unavailable */
  }
}

export function getProjectScopeLabel(
  tenantSlug: string,
  scopeId: ProjectScopeId,
  accessibleProjects?: readonly TenantProject[],
): string {
  if (isAllProjectsScope(scopeId)) {
    return 'All projects'
  }

  const projects = accessibleProjects ?? getTenantProjects(tenantSlug)
  return projects.find((project) => project.id === scopeId)?.name ?? 'All projects'
}

export function resolveLaunchScopeForProjectSelection(
  tenantSlug: DemoTenantId,
  organization: RegisteredOrganization | null,
  scopeId: ProjectScopeId,
): TenantUserLaunchScope {
  if (isAllProjectsScope(scopeId)) {
    return resolveTenantUserLaunchScope(tenantSlug, organization, null)
  }
  return resolveTenantUserLaunchScope(tenantSlug, organization, scopeId)
}

export function filterCatalogItemsByProjectScope<
  T extends { catalogItemId?: string; displayName: string; id?: string },
>(items: readonly T[], tenantSlug: string, scopeId: ProjectScopeId): T[] {
  if (isAllProjectsScope(scopeId)) {
    return [...items]
  }

  const project = getTenantProjects(tenantSlug).find((entry) => entry.id === scopeId)
  if (!project) {
    return [...items]
  }

  const attachedIds = new Set(project.catalogItems.map((item) => item.id))
  const attachedNames = new Set(project.catalogItems.map((item) => item.displayName))

  return items.filter(
    (item) =>
      (item.catalogItemId ? attachedIds.has(item.catalogItemId) : false) ||
      (item.id ? attachedIds.has(item.id) : false) ||
      attachedNames.has(item.displayName),
  )
}

export function filterInstancesByProjectScope(
  instances: readonly TenantInstance[],
  tenantSlug: string,
  scopeId: ProjectScopeId,
): TenantInstance[] {
  if (isAllProjectsScope(scopeId)) {
    return [...instances]
  }

  const project = getTenantProjects(tenantSlug).find((entry) => entry.id === scopeId)
  if (!project) {
    return []
  }

  return instances.filter((instance) => instanceBelongsToProject(instance, project))
}

export function getSelectedProject(
  tenantSlug: string,
  scopeId: ProjectScopeId,
): TenantProject | null {
  if (isAllProjectsScope(scopeId)) {
    return null
  }
  return getTenantProjects(tenantSlug).find((project) => project.id === scopeId) ?? null
}
