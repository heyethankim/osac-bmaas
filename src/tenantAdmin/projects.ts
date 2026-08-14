import type { RegisteredOrganization } from '../providerAdmin/organizations'
import {
  getExternalIpPoolById,
  getExternalIpPoolsAssignedToOrganization,
} from '../providerAdmin/externalIpPools'
import { getProviderExternalIpPools } from '../providerSetup/storage'
import type { TenantInstance } from '../tenantUser/instances'
import { instanceBelongsToProject } from '../tenantUser/instances'

export type TenantProjectCatalogItem = {
  id: string
  displayName: string
}

export type TenantProjectMemberRole = 'developer' | 'project-admin' | 'viewer'

export type TenantProjectEnvironment = 'development' | 'staging' | 'production' | 'research'

export type TenantProjectMember = {
  id: string
  name: string
  email: string
  role: TenantProjectMemberRole
}

export type TenantProject = {
  id: string
  name: string
  description: string
  environmentType: TenantProjectEnvironment
  instanceQuota: number
  externalIpPoolId: string | null
  externalIpPoolName: string | null
  externalIpPoolCidr: string | null
  catalogItems: TenantProjectCatalogItem[]
  members: TenantProjectMember[]
  createdAt: string
}

export const TENANT_PROJECT_ENVIRONMENT_LABELS: Record<TenantProjectEnvironment, string> = {
  development: 'Development',
  staging: 'Staging',
  production: 'Production',
  research: 'Research',
}

export function getTenantProjectEnvironmentLabel(
  environmentType: TenantProjectEnvironment,
): string {
  return TENANT_PROJECT_ENVIRONMENT_LABELS[environmentType]
}

export function isTenantProjectEnvironment(value: unknown): value is TenantProjectEnvironment {
  return (
    value === 'development' ||
    value === 'staging' ||
    value === 'production' ||
    value === 'research'
  )
}

/** Stable demo project for Catalog/Services project-scope switcher. */
export const DEMO_TENANT_PROJECT_ID = 'project_ml-project'
export const DEMO_TENANT_PROJECT_NAME = 'ml-project'
export const DEMO_TENANT_PROJECT_DESCRIPTION =
  'Shared home for model training, experiment tracking, and inference at North Summit Bank. GPU bare metal, OpenShift clusters, and virtual machines are reserved here so data science and ML platform teams can iterate quickly and promote proven workloads toward production.'
export const DEMO_TENANT_PROJECT_ENVIRONMENT: TenantProjectEnvironment = 'research'

/** Secondary demo project so services can show multi-project associations. */
export const DEMO_TENANT_PROJECT_ID_02 = 'project_ml-dev-team'
export const DEMO_TENANT_PROJECT_NAME_02 = 'ml-dev-team'
export const DEMO_TENANT_PROJECT_DESCRIPTION_02 =
  'Day-to-day development workspace for feature experiments, notebook jobs, and pre-production model validation before promoting into ml-project.'
export const DEMO_TENANT_PROJECT_ENVIRONMENT_02: TenantProjectEnvironment = 'development'

export type OrganizationExternalIpPool = {
  id: string
  name: string
  cidr: string
}

export function generateTenantProjectId(): string {
  const suffix = Math.random().toString(36).slice(2, 8)
  return `project_${suffix}`
}

export function resolveOrganizationExternalIpPools(
  organization: RegisteredOrganization,
): OrganizationExternalIpPool[] {
  const assignedPools = getExternalIpPoolsAssignedToOrganization(
    getProviderExternalIpPools(),
    organization.id,
  ).map((pool) => ({
    id: pool.id,
    name: pool.name,
    cidr: pool.cidr,
  }))

  if (assignedPools.length > 0) {
    return assignedPools
  }

  const legacyPool = resolveOrganizationExternalIpPoolFromOrgFields(organization)
  return legacyPool ? [legacyPool] : []
}

function resolveOrganizationExternalIpPoolFromOrgFields(
  organization: RegisteredOrganization,
): OrganizationExternalIpPool | null {
  if (organization.externalIpPoolId && organization.externalIpPoolName && organization.externalIpPoolCidr) {
    return {
      id: organization.externalIpPoolId,
      name: organization.externalIpPoolName,
      cidr: organization.externalIpPoolCidr,
    }
  }

  if (!organization.externalIpPoolId) {
    return null
  }

  const pool = getExternalIpPoolById(getProviderExternalIpPools(), organization.externalIpPoolId)
  if (!pool) {
    return null
  }

  return {
    id: pool.id,
    name: pool.name,
    cidr: pool.cidr,
  }
}

export function resolveOrganizationExternalIpPool(
  organization: RegisteredOrganization,
): OrganizationExternalIpPool | null {
  const pools = resolveOrganizationExternalIpPools(organization)
  if (pools.length === 0) {
    return null
  }

  return (
    pools.find((pool) => pool.id === organization.externalIpPoolId) ??
    pools[0] ??
    null
  )
}

export function formatOrganizationExternalIpPoolsLabel(
  pools: readonly OrganizationExternalIpPool[],
): string {
  if (pools.length === 0) {
    return 'Not assigned'
  }

  if (pools.length === 1) {
    return formatOrganizationExternalIpPoolLabel(pools[0])
  }

  return `${pools.length} pools assigned`
}

export function formatOrganizationExternalIpPoolLabel(
  pool: OrganizationExternalIpPool | null,
): string {
  if (!pool) {
    return 'Not assigned'
  }

  return `${pool.name} · ${pool.cidr}`
}

export function getTenantProjectPoolLabel(project: TenantProject): string {
  if (!project.externalIpPoolId || !project.externalIpPoolName) {
    return 'Not attached'
  }

  return project.externalIpPoolCidr
    ? `${project.externalIpPoolName} · ${project.externalIpPoolCidr}`
    : project.externalIpPoolName
}

export function getTotalAllocatedInstanceQuota(projects: readonly TenantProject[]): number {
  return projects.reduce((total, project) => total + project.instanceQuota, 0)
}

export function getProjectsWithAttachedPool(projects: TenantProject[]): TenantProject[] {
  return projects.filter((project) => project.externalIpPoolId !== null)
}

export function getTenantProjectCatalogLabel(project: TenantProject): string {
  if (project.catalogItems.length === 0) {
    return 'Not attached'
  }

  return project.catalogItems.map((item) => item.displayName).join(', ')
}

export function getTenantProjectServicesLabel(
  instances: readonly TenantInstance[],
  project: TenantProject,
): string {
  const count = getInstancesForTenantProject(instances, project).length

  if (count === 0) {
    return 'No services'
  }

  if (count === 1) {
    return '1 service'
  }

  return `${count} services`
}

export function getTenantProjectMemberCountLabel(project: TenantProject): string {
  const count = project.members.length

  if (count === 0) {
    return 'No members'
  }

  if (count === 1) {
    return '1 member'
  }

  return `${count} members`
}

export function getInstancesForTenantProject(
  instances: readonly TenantInstance[],
  project: TenantProject,
): TenantInstance[] {
  return instances.filter((instance) => instanceBelongsToProject(instance, project))
}

export function getInstancesAvailableForTenantProject(
  instances: readonly TenantInstance[],
  project: TenantProject,
): TenantInstance[] {
  return instances
    .filter((instance) => !instanceBelongsToProject(instance, project))
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function getTenantProjectActions(
  project: TenantProject,
  handlers: {
    onViewDetails: (project: TenantProject) => void
    onDelete: (projectId: string) => void
  },
): Array<{
  title: string
  onClick: () => void
  isDanger?: boolean
}> {
  return [
    {
      title: 'View details',
      onClick: () => {
        handlers.onViewDetails(project)
      },
    },
    {
      title: 'Delete project',
      isDanger: true,
      onClick: () => {
        handlers.onDelete(project.id)
      },
    },
  ]
}

export const TENANT_PROJECTS_TEAMS_DEMO = {
  lede: 'Carve your organization workspace into isolated projects and grant team members scoped access.',
  emptyTitle: 'No projects yet',
  emptyBody: 'Create your first project to carve quota slices and invite developers.',
  createFirstProjectLabel: 'Create first project',
  createProjectLabel: 'Create project',
  detailsFallbackDescription: 'Project workspace for scoped catalog access and team collaboration.',
  servicesEmpty: 'No services in this project yet.',
  membersEmpty: 'No project members yet. Add someone to grant project access.',
  addMemberLabel: 'Add',
  addServiceLabel: 'Add',
  addServiceModalDescription:
    'Associate an existing service with this project. Project members will see it in Services.',
  removeMemberLabel: 'Remove',
} as const

const ORG_VCPU_TOTAL = 240
const ORG_RAM_TOTAL_GB = 1536

export { ORG_RAM_TOTAL_GB, ORG_VCPU_TOTAL }

export type TenantOrgQuotaMetric = {
  id: 'vcpu' | 'ram' | 'instances'
  label: string
  summary: string
  unallocatedLabel: string
  utilization: number
}

export function getTenantOrgQuotaMetrics(
  organization: RegisteredOrganization,
  projects: TenantProject[],
): TenantOrgQuotaMetric[] {
  const allocatedInstances = getTotalAllocatedInstanceQuota(projects)
  const maxInstances = organization.maxInstances
  const remainingInstances = Math.max(0, maxInstances - allocatedInstances)
  const instanceUtilization =
    maxInstances > 0
      ? Math.min(100, Math.round((allocatedInstances / maxInstances) * 100))
      : 0

  return [
    {
      id: 'vcpu',
      label: 'vCPU',
      summary: `0 / ${ORG_VCPU_TOTAL}`,
      unallocatedLabel: `${ORG_VCPU_TOTAL} unallocated`,
      utilization: 0,
    },
    {
      id: 'ram',
      label: 'RAM',
      summary: `0 GB / ${ORG_RAM_TOTAL_GB} GB`,
      unallocatedLabel: `${ORG_RAM_TOTAL_GB} GB unallocated`,
      utilization: 0,
    },
    {
      id: 'instances',
      label: 'Instances',
      summary: `${allocatedInstances} / ${maxInstances}`,
      unallocatedLabel: `${remainingInstances} unallocated`,
      utilization: instanceUtilization,
    },
  ]
}
