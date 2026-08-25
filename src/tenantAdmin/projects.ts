import type { RegisteredOrganization } from '../providerAdmin/organizations'
import {
  getExternalIpPoolById,
  getExternalIpPoolsAssignedToOrganization,
} from '../providerAdmin/externalIpPools'
import { getProviderExternalIpPools } from '../providerSetup/storage'
import type { TenantInstance } from '../tenantUser/instances'
import { instanceBelongsToProject } from '../tenantUser/instances'
import {
  isValidKubernetesResourceName,
  KUBERNETES_RESOURCE_NAME_MAX_LENGTH,
} from '../shared/kubernetesResourceName'

export type TenantProjectCatalogItem = {
  id: string
  displayName: string
}

export type TenantProjectMemberRole = 'manager' | 'viewer'

export function migrateTenantProjectMemberRole(role: string): TenantProjectMemberRole {
  if (role === 'viewer') {
    return 'viewer'
  }
  if (role === 'manager') {
    return 'manager'
  }
  if (role === 'developer' || role === 'project-admin') {
    return 'manager'
  }
  return 'viewer'
}

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
  parentProjectId: string | null
  createdAt: string
}

export type EffectiveTenantProjectMember = TenantProjectMember & {
  inherited: boolean
  inheritedFromProjectName?: string
}

export type TenantProjectTreeRow = {
  project: TenantProject
  depth: number
  hasChildren: boolean
  isExpanded: boolean
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

export const DEMO_NESTED_PROJECT_ID = 'project_edge-inference'
export const DEMO_NESTED_PROJECT_NAME = 'edge-inference'
export const DEMO_NESTED_PROJECT_DESCRIPTION =
  'Regional inference workloads carved from ml-project quota for branch and edge rollout.'
export const DEMO_NESTED_PROJECT_ENVIRONMENT: TenantProjectEnvironment = 'production'

export const DEMO_FRAUD_DETECTION_PROJECT_ID = 'project_c8y8sn'
export const DEMO_FRAUD_DETECTION_PROJECT_NAME = 'fraud-detection'
export const DEMO_FRAUD_DETECTION_PROJECT_DESCRIPTION =
  'Isolated workspace for real-time fraud scoring models, transaction monitoring pipelines, and compliance review.'
export const DEMO_FRAUD_DETECTION_PROJECT_ENVIRONMENT: TenantProjectEnvironment = 'production'

export const DEMO_NESTED_DEV_PROJECT_ID = 'project_44yd3n'
export const DEMO_NESTED_DEV_PROJECT_NAME = 'feature-sandbox'
export const DEMO_NESTED_DEV_PROJECT_DESCRIPTION =
  'Short-lived feature branches and notebook experiments carved from ml-dev-team quota for pre-production validation.'
export const DEMO_NESTED_DEV_PROJECT_ENVIRONMENT: TenantProjectEnvironment = 'development'

export type OrganizationExternalIpPool = {
  id: string
  name: string
  cidr: string
}

export function generateTenantProjectId(): string {
  const suffix = Math.random().toString(36).slice(2, 8)
  return `project_${suffix}`
}

function normalizeTenantProjectName(name: string): string {
  return name.trim().toLowerCase()
}

const ROOT_PROJECT_NAME_CANDIDATES = [
  'edge-inference',
  'ml-dev-team',
  'fraud-detection',
  'payments-api',
  'data-platform',
  'model-serving',
  'batch-analytics',
  'risk-scoring',
  'customer-insights',
  'trading-workloads',
] as const

const GENERIC_NESTED_PROJECT_NAME_CANDIDATES = [
  'staging-sandbox',
  'qa-validation',
  'branch-rollout',
  'regional-serving',
  'poc-workloads',
  'feature-experiments',
  'preprod-checks',
  'model-validation',
] as const

const NESTED_PROJECT_NAME_CANDIDATES_BY_PARENT: Record<string, readonly string[]> = {
  'ml-project': ['edge-inference', 'regional-serving', 'batch-scoring', 'atm-inference'],
  'ml-dev-team': ['feature-sandbox', 'notebook-jobs', 'integration-tests', 'preprod-ml'],
  'edge-inference': ['branch-west', 'branch-east', 'retail-inference'],
  'data-platform': ['etl-pipeline', 'lakehouse-qa', 'stream-ingest'],
  'payments-api': ['card-auth', 'settlement-batch', 'fraud-scoring'],
}

function getNestedProjectNameCandidates(parentProject: TenantProject): string[] {
  const parentKey = normalizeTenantProjectName(parentProject.name)
  const specific = NESTED_PROJECT_NAME_CANDIDATES_BY_PARENT[parentKey] ?? []
  const merged = [...specific]

  for (const candidate of GENERIC_NESTED_PROJECT_NAME_CANDIDATES) {
    if (!merged.includes(candidate)) {
      merged.push(candidate)
    }
  }

  return merged
}

function appendNumericProjectNameSuffix(base: string, index: number): string {
  if (index <= 1) {
    return base.slice(0, KUBERNETES_RESOURCE_NAME_MAX_LENGTH)
  }

  const suffix = String(index).padStart(2, '0')
  return `${base}-${suffix}`.slice(0, KUBERNETES_RESOURCE_NAME_MAX_LENGTH)
}

function pickUniqueProjectName(
  candidates: readonly string[],
  taken: ReadonlySet<string>,
): string {
  for (const candidate of candidates) {
    const normalized = normalizeTenantProjectName(candidate)
    if (isValidKubernetesResourceName(candidate) && !taken.has(normalized)) {
      return candidate
    }
  }

  const primary = candidates[0] ?? 'project'
  for (let index = 2; index <= 99; index += 1) {
    const candidate = appendNumericProjectNameSuffix(primary, index)
    const normalized = normalizeTenantProjectName(candidate)
    if (isValidKubernetesResourceName(candidate) && !taken.has(normalized)) {
      return candidate
    }
  }

  return appendNumericProjectNameSuffix('project', 99)
}

/** Prefill value for create-project flows; avoids collisions with existing project names. */
export function generateUniqueTenantProjectName(
  projects: readonly TenantProject[],
  parentProject: TenantProject | null = null,
): string {
  const taken = new Set(projects.map((project) => normalizeTenantProjectName(project.name)))
  const candidates = parentProject
    ? getNestedProjectNameCandidates(parentProject)
    : ROOT_PROJECT_NAME_CANDIDATES

  return pickUniqueProjectName(candidates, taken)
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
  return getRootTenantProjects(projects).reduce(
    (total, project) => total + project.instanceQuota,
    0,
  )
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

export function getTenantProjectById(
  projects: readonly TenantProject[],
  projectId: string,
): TenantProject | null {
  return projects.find((project) => project.id === projectId) ?? null
}

export function getRootTenantProjects(projects: readonly TenantProject[]): TenantProject[] {
  return projects.filter((project) => !project.parentProjectId)
}

export function getChildTenantProjects(
  projects: readonly TenantProject[],
  parentProjectId: string,
): TenantProject[] {
  return projects
    .filter((project) => project.parentProjectId === parentProjectId)
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function getTenantProjectAncestors(
  projects: readonly TenantProject[],
  projectId: string,
): TenantProject[] {
  const ancestors: TenantProject[] = []
  let current = getTenantProjectById(projects, projectId)

  while (current?.parentProjectId) {
    const parent = getTenantProjectById(projects, current.parentProjectId)
    if (!parent) {
      break
    }
    ancestors.unshift(parent)
    current = parent
  }

  return ancestors
}

export function getDirectChildInstanceQuotaAllocated(
  projects: readonly TenantProject[],
  parentProjectId: string,
  excludeProjectId?: string,
): number {
  return getChildTenantProjects(projects, parentProjectId).reduce((total, child) => {
    if (excludeProjectId && child.id === excludeProjectId) {
      return total
    }
    return total + child.instanceQuota
  }, 0)
}

export function getAvailableInstanceQuotaForProject(
  projects: readonly TenantProject[],
  organization: RegisteredOrganization,
  parentProject: TenantProject | null,
  excludeProjectId?: string,
): number {
  if (parentProject) {
    const allocatedToChildren = getDirectChildInstanceQuotaAllocated(
      projects,
      parentProject.id,
      excludeProjectId,
    )
    return Math.max(0, parentProject.instanceQuota - allocatedToChildren)
  }

  const allocatedToRoots = getRootTenantProjects(projects).reduce((total, project) => {
    if (excludeProjectId && project.id === excludeProjectId) {
      return total
    }
    return total + project.instanceQuota
  }, 0)

  return Math.max(0, organization.maxInstances - allocatedToRoots)
}

export function getInheritedProjectMembers(
  projects: readonly TenantProject[],
  project: TenantProject,
): EffectiveTenantProjectMember[] {
  return getEffectiveProjectMembers(projects, project).filter((member) => member.inherited)
}

export function getEffectiveProjectMembers(
  projects: readonly TenantProject[],
  project: TenantProject,
): EffectiveTenantProjectMember[] {
  const direct: EffectiveTenantProjectMember[] = project.members.map((member) => ({
    ...member,
    inherited: false,
  }))
  const directEmails = new Set(
    project.members.map((member) => member.email.trim().toLowerCase()),
  )

  if (!project.parentProjectId) {
    return direct
  }

  const parent = getTenantProjectById(projects, project.parentProjectId)
  if (!parent) {
    return direct
  }

  const inherited = getEffectiveProjectMembers(projects, parent)
    .filter((member) => !directEmails.has(member.email.trim().toLowerCase()))
    .map((member) => ({
      ...member,
      inherited: true,
      inheritedFromProjectName: member.inherited
        ? member.inheritedFromProjectName
        : parent.name,
    }))

  return [...inherited, ...direct]
}

export function collectDescendantProjectIds(
  projects: readonly TenantProject[],
  rootProjectId: string,
): string[] {
  const descendants: string[] = []

  const visit = (parentId: string) => {
    for (const child of getChildTenantProjects(projects, parentId)) {
      descendants.push(child.id)
      visit(child.id)
    }
  }

  visit(rootProjectId)
  return descendants
}

function projectMatchesFilters(
  project: TenantProject,
  searchValue: string,
  selectedEnvironment: ProjectEnvironmentFilter,
): boolean {
  if (!matchesProjectEnvironmentFilter(project, selectedEnvironment)) {
    return false
  }

  return projectMatchesSearch(project, searchValue)
}

function projectOrDescendantMatchesFilters(
  projects: readonly TenantProject[],
  project: TenantProject,
  searchValue: string,
  selectedEnvironment: ProjectEnvironmentFilter,
): boolean {
  if (projectMatchesFilters(project, searchValue, selectedEnvironment)) {
    return true
  }

  return getChildTenantProjects(projects, project.id).some((child) =>
    projectOrDescendantMatchesFilters(projects, child, searchValue, selectedEnvironment),
  )
}

export function getAutoExpandedProjectIds(
  projects: readonly TenantProject[],
  searchValue: string,
  selectedEnvironment: ProjectEnvironmentFilter,
): Set<string> {
  const expanded = new Set<string>()

  const expandAncestors = (projectId: string) => {
    const project = getTenantProjectById(projects, projectId)
    if (!project?.parentProjectId) {
      return
    }
    expanded.add(project.parentProjectId)
    expandAncestors(project.parentProjectId)
  }

  for (const project of projects) {
    if (projectMatchesFilters(project, searchValue, selectedEnvironment)) {
      expandAncestors(project.id)
    }
  }

  return expanded
}

export type TenantProjectScopeTreeRow = {
  project: TenantProject
  depth: number
}

/** Flat, fully expanded project tree for scope dropdowns and pickers. */
export function buildTenantProjectScopeTreeRows(
  projects: readonly TenantProject[],
): TenantProjectScopeTreeRow[] {
  const rows: TenantProjectScopeTreeRow[] = []

  const appendRows = (parentId: string | null, depth: number) => {
    const siblings = projects
      .filter((project) => (project.parentProjectId ?? null) === parentId)
      .sort((left, right) => left.name.localeCompare(right.name))

    for (const project of siblings) {
      rows.push({ project, depth })
      appendRows(project.id, depth + 1)
    }
  }

  appendRows(null, 0)
  return rows
}

export function buildTenantProjectTreeRows(
  projects: readonly TenantProject[],
  searchValue: string,
  selectedEnvironment: ProjectEnvironmentFilter,
  expandedProjectIds: ReadonlySet<string>,
): TenantProjectTreeRow[] {
  const rows: TenantProjectTreeRow[] = []

  const appendRows = (parentId: string | null, depth: number) => {
    const siblings = projects
      .filter((project) => (project.parentProjectId ?? null) === parentId)
      .filter((project) =>
        projectOrDescendantMatchesFilters(projects, project, searchValue, selectedEnvironment),
      )
      .sort((left, right) => left.name.localeCompare(right.name))

    for (const project of siblings) {
      const children = getChildTenantProjects(projects, project.id)
      const hasChildren = children.length > 0
      const isExpanded = expandedProjectIds.has(project.id)

      rows.push({
        project,
        depth,
        hasChildren,
        isExpanded,
      })

      if (hasChildren && isExpanded) {
        appendRows(project.id, depth + 1)
      }
    }
  }

  appendRows(null, 0)
  return rows
}

export function getTenantProjectMemberCountLabel(
  projects: readonly TenantProject[],
  project: TenantProject,
): string {
  const effective = getEffectiveProjectMembers(projects, project)
  const inheritedCount = effective.filter((member) => member.inherited).length
  const count = effective.length

  if (count === 0) {
    return 'No members'
  }

  if (count === 1) {
    return inheritedCount === 1 ? '1 member (inherited)' : '1 member'
  }

  if (inheritedCount > 0) {
    return `${count} members (${inheritedCount} inherited)`
  }

  return `${count} members`
}

export function getTenantProjectInstanceQuotaLabel(
  projects: readonly TenantProject[],
  project: TenantProject,
): string {
  const allocatedToChildren = getDirectChildInstanceQuotaAllocated(projects, project.id)
  if (allocatedToChildren === 0) {
    return `${project.instanceQuota} instances`
  }

  const available = Math.max(0, project.instanceQuota - allocatedToChildren)
  return `${project.instanceQuota} instances · ${available} available`
}

export function getInstancesForTenantProject(
  instances: readonly TenantInstance[],
  project: TenantProject,
): TenantInstance[] {
  return instances.filter((instance) => instanceBelongsToProject(instance, project))
}

export function getTenantProjectActions(
  project: TenantProject,
  handlers: {
    onViewDetails: (project: TenantProject) => void
    onEdit?: (project: TenantProject) => void
    onCreateNested?: (project: TenantProject) => void
    onDelete: (projectId: string) => void
  },
): Array<{
  title?: string
  onClick?: () => void
  isDanger?: boolean
  isSeparator?: boolean
}> {
  return [
    {
      title: 'View details',
      onClick: () => {
        handlers.onViewDetails(project)
      },
    },
    ...(handlers.onCreateNested
      ? [
          {
            title: 'Create nested project',
            onClick: () => {
              handlers.onCreateNested?.(project)
            },
          },
        ]
      : []),
    ...(handlers.onEdit
      ? [
          {
            title: 'Edit',
            onClick: () => {
              handlers.onEdit?.(project)
            },
          },
        ]
      : []),
    {
      isSeparator: true,
    },
    {
      title: 'Delete',
      isDanger: true,
      onClick: () => {
        handlers.onDelete(project.id)
      },
    },
  ]
}

export type ProjectEnvironmentFilter = 'all' | TenantProjectEnvironment

export const PROJECT_ENVIRONMENT_FILTER_OPTIONS: ReadonlyArray<{
  value: ProjectEnvironmentFilter
  label: string
}> = [
  { value: 'all', label: 'All environments' },
  { value: 'development', label: TENANT_PROJECT_ENVIRONMENT_LABELS.development },
  { value: 'staging', label: TENANT_PROJECT_ENVIRONMENT_LABELS.staging },
  { value: 'production', label: TENANT_PROJECT_ENVIRONMENT_LABELS.production },
  { value: 'research', label: TENANT_PROJECT_ENVIRONMENT_LABELS.research },
]

export function projectMatchesSearch(project: TenantProject, searchValue: string): boolean {
  const query = searchValue.trim().toLowerCase()
  if (!query) {
    return true
  }

  return (
    project.name.toLowerCase().includes(query) ||
    project.id.toLowerCase().includes(query) ||
    project.description.toLowerCase().includes(query) ||
    getTenantProjectEnvironmentLabel(project.environmentType).toLowerCase().includes(query) ||
    getTenantProjectPoolLabel(project).toLowerCase().includes(query)
  )
}

export function matchesProjectEnvironmentFilter(
  project: TenantProject,
  selectedEnvironment: ProjectEnvironmentFilter,
): boolean {
  if (selectedEnvironment === 'all') {
    return true
  }

  return project.environmentType === selectedEnvironment
}

export function buildProjectFilterParts(
  searchValue: string,
  selectedEnvironment: ProjectEnvironmentFilter,
): string[] {
  const parts: string[] = []

  if (selectedEnvironment !== 'all') {
    parts.push(`environment: ${getTenantProjectEnvironmentLabel(selectedEnvironment)}`)
  }

  if (searchValue.trim()) {
    parts.push(`search: "${searchValue.trim()}"`)
  }

  return parts
}

export const TENANT_PROJECTS_TEAMS_DEMO = {
  lede: 'Carve your tenant workspace into isolated projects and grant team members scoped access.',
  emptyTitle: 'No projects yet',
  emptyBody: 'Create your first project to carve quota slices and invite developers.',
  createFirstProjectLabel: 'Create first project',
  createProjectLabel: 'Create project',
  createNestedProjectLabel: 'Create nested project',
  nestedProjectsTitle: 'Nested projects',
  nestedProjectsEmpty: 'No nested projects yet.',
  nestedBadgeLabel: 'Nested',
  inheritedMembersHelp:
    'Members inherited from parent projects keep access here. Add project-specific managers or viewers below.',
  detailsFallbackDescription: 'Project workspace for scoped catalog access and team collaboration.',
  detailsLede: 'Project details for quota, services, members, and nested workspaces.',
  servicesEmpty:
    'No services in this project yet. Instances are assigned to a project when launched from the catalog.',
  membersEmpty: 'No project members yet. Add someone to grant project access.',
  addMemberLabel: 'Add',
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
