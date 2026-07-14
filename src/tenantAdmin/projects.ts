import type { RegisteredOrganization } from '../providerAdmin/organizations'
import { getExternalIpPoolById } from '../providerAdmin/externalIpPools'
import { getProviderExternalIpPools } from '../providerSetup/storage'

export type TenantProjectCatalogItem = {
  id: string
  displayName: string
}

export type TenantProjectMemberRole = 'developer' | 'project-admin' | 'viewer'

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
  instanceQuota: number
  externalIpPoolId: string | null
  externalIpPoolName: string | null
  externalIpPoolCidr: string | null
  catalogItems: TenantProjectCatalogItem[]
  members: TenantProjectMember[]
  createdAt: string
}

export type OrganizationExternalIpPool = {
  id: string
  name: string
  cidr: string
}

export function generateTenantProjectId(): string {
  const suffix = Math.random().toString(36).slice(2, 8)
  return `project_${suffix}`
}

export function resolveOrganizationExternalIpPool(
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

export function getTotalAllocatedInstanceQuota(projects: TenantProject[]): number {
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

export function getTenantProjectActions(
  project: TenantProject,
  handlers: {
    onAttachCatalog: (project: TenantProject) => void
    onDelete: (projectId: string) => void
  },
): Array<{
  title: string
  onClick: () => void
}> {
  return [
    {
      title: 'View project',
      onClick: () => {
        /* demo */
      },
    },
    {
      title: 'Manage team members',
      onClick: () => {
        /* demo */
      },
    },
    {
      title: 'Edit quotas',
      onClick: () => {
        /* demo */
      },
    },
    {
      title: project.catalogItems.length > 0 ? 'Manage catalog items' : 'Attach catalog items',
      onClick: () => {
        handlers.onAttachCatalog(project)
      },
    },
    {
      title: 'Delete project',
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
