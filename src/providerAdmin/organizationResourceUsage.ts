import {
  DEMO_NORTH_SUMMIT_BANK_ORG_ID,
  isOrganizationReadyForLogin,
} from './organizations'
import type { RegisteredOrganization } from './organizations'
import {
  CATALOG_SERVICE_FILTER_LABELS,
  type CatalogServiceId,
} from '../providerSetup/templateDemo'
import { getTenantProjects, ensureTenantDemoProjects } from '../tenantAdmin/storage'
import {
  getTenantProjectEnvironmentLabel,
  resolveOrganizationExternalIpPools,
  type OrganizationExternalIpPool,
  type TenantProject,
} from '../tenantAdmin/projects'
import {
  getTenantInstanceServiceId,
  instanceBelongsToProject,
  type TenantInstance,
} from '../tenantUser/instances'
import { ensureTenantDemoInstances, getTenantUserInstances } from '../tenantUser/storage'

export type OrganizationServiceUsage = {
  id: CatalogServiceId
  label: string
  count: number
}

export type OrganizationProjectUsage = {
  id: string
  name: string
  environmentLabel: string
  used: number
  quota: number
  catalogItemCount: number
  catalogItemNames: string[]
  memberCount: number
}

export type OrganizationCatalogUsageItem = {
  id: string
  displayName: string
}

export type OrganizationResourceUsage = {
  instanceCount: number
  maxInstances: number
  instancePercent: number
  projectCount: number
  catalogItems: OrganizationCatalogUsageItem[]
  pools: OrganizationExternalIpPool[]
  byService: OrganizationServiceUsage[]
  projects: OrganizationProjectUsage[]
}

const SERVICE_ORDER: CatalogServiceId[] = ['baremetal', 'cluster', 'virtual-machine']

function shouldSeedDemoInventory(organization: RegisteredOrganization): boolean {
  return organization.id === DEMO_NORTH_SUMMIT_BANK_ORG_ID
}

function emptyOrganizationResourceUsage(
  organization: RegisteredOrganization,
): OrganizationResourceUsage {
  const maxInstances = Math.max(organization.maxInstances, 0)

  return {
    instanceCount: 0,
    maxInstances,
    instancePercent: 0,
    projectCount: 0,
    catalogItems: [],
    pools: [],
    byService: SERVICE_ORDER.map((id) => ({
      id,
      label: CATALOG_SERVICE_FILTER_LABELS[id],
      count: 0,
    })),
    projects: [],
  }
}

function listOrganizationInstances(organization: RegisteredOrganization): TenantInstance[] {
  if (shouldSeedDemoInventory(organization)) {
    return ensureTenantDemoInstances(organization.slug, organization.name)
  }
  return getTenantUserInstances(organization.slug)
}

function listOrganizationProjects(organization: RegisteredOrganization): TenantProject[] {
  if (shouldSeedDemoInventory(organization)) {
    return ensureTenantDemoProjects(organization.slug)
  }
  return getTenantProjects(organization.slug)
}

export function getOrganizationResourceUsage(
  organization: RegisteredOrganization,
): OrganizationResourceUsage {
  if (!isOrganizationReadyForLogin(organization)) {
    return emptyOrganizationResourceUsage(organization)
  }

  const instances = listOrganizationInstances(organization)
  const projects = listOrganizationProjects(organization)
  const maxInstances = Math.max(organization.maxInstances, 0)
  const instanceCount = instances.length
  const instancePercent =
    maxInstances > 0 ? Math.min(100, Math.round((instanceCount / maxInstances) * 100)) : 0

  const serviceCounts: Record<CatalogServiceId, number> = {
    baremetal: 0,
    cluster: 0,
    models: 0,
    'virtual-machine': 0,
  }
  for (const instance of instances) {
    serviceCounts[getTenantInstanceServiceId(instance)] += 1
  }

  const catalogById = new Map<string, OrganizationCatalogUsageItem>()
  if (organization.catalogItemId && organization.catalogDisplayName) {
    catalogById.set(organization.catalogItemId, {
      id: organization.catalogItemId,
      displayName: organization.catalogDisplayName,
    })
  }
  for (const project of projects) {
    for (const item of project.catalogItems) {
      if (!catalogById.has(item.id)) {
        catalogById.set(item.id, { id: item.id, displayName: item.displayName })
      }
    }
  }

  return {
    instanceCount,
    maxInstances,
    instancePercent,
    projectCount: projects.length,
    catalogItems: [...catalogById.values()],
    pools: resolveOrganizationExternalIpPools(organization),
    byService: SERVICE_ORDER.map((id) => ({
      id,
      label: CATALOG_SERVICE_FILTER_LABELS[id],
      count: serviceCounts[id],
    })),
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      environmentLabel: getTenantProjectEnvironmentLabel(project.environmentType),
      used: instances.filter((instance) => instanceBelongsToProject(instance, project)).length,
      quota: project.instanceQuota,
      catalogItemCount: project.catalogItems.length,
      catalogItemNames: project.catalogItems.map((item) => item.displayName),
      memberCount: project.members.length,
    })),
  }
}
