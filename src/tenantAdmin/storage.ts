import type { TenantAdminNavId } from './constants'
import { getTenantAdminLeafNavItems } from './constants'
import type { TenantCatalogItem } from './catalogItems'
import type { OrganizationExternalIpPool, TenantProject } from './projects'
import {
  DEMO_FRAUD_DETECTION_PROJECT_DESCRIPTION,
  DEMO_FRAUD_DETECTION_PROJECT_ENVIRONMENT,
  DEMO_FRAUD_DETECTION_PROJECT_ID,
  DEMO_FRAUD_DETECTION_PROJECT_NAME,
  DEMO_NESTED_DEV_PROJECT_DESCRIPTION,
  DEMO_NESTED_DEV_PROJECT_ENVIRONMENT,
  DEMO_NESTED_DEV_PROJECT_ID,
  DEMO_NESTED_DEV_PROJECT_NAME,
  DEMO_NESTED_PROJECT_DESCRIPTION,
  DEMO_NESTED_PROJECT_ENVIRONMENT,
  DEMO_NESTED_PROJECT_ID,
  DEMO_NESTED_PROJECT_NAME,
  DEMO_TENANT_PROJECT_DESCRIPTION,
  DEMO_TENANT_PROJECT_DESCRIPTION_02,
  DEMO_TENANT_PROJECT_ENVIRONMENT,
  DEMO_TENANT_PROJECT_ENVIRONMENT_02,
  DEMO_TENANT_PROJECT_ID,
  DEMO_TENANT_PROJECT_ID_02,
  DEMO_TENANT_PROJECT_NAME,
  DEMO_TENANT_PROJECT_NAME_02,
  collectDescendantProjectIds,
  isTenantProjectEnvironment,
  migrateTenantProjectMemberRole,
} from './projects'

export {
  DEMO_FRAUD_DETECTION_PROJECT_DESCRIPTION,
  DEMO_FRAUD_DETECTION_PROJECT_ENVIRONMENT,
  DEMO_FRAUD_DETECTION_PROJECT_ID,
  DEMO_FRAUD_DETECTION_PROJECT_NAME,
  DEMO_NESTED_DEV_PROJECT_DESCRIPTION,
  DEMO_NESTED_DEV_PROJECT_ENVIRONMENT,
  DEMO_NESTED_DEV_PROJECT_ID,
  DEMO_NESTED_DEV_PROJECT_NAME,
  DEMO_NESTED_PROJECT_DESCRIPTION,
  DEMO_NESTED_PROJECT_ENVIRONMENT,
  DEMO_NESTED_PROJECT_ID,
  DEMO_NESTED_PROJECT_NAME,
  DEMO_TENANT_PROJECT_DESCRIPTION,
  DEMO_TENANT_PROJECT_DESCRIPTION_02,
  DEMO_TENANT_PROJECT_ENVIRONMENT,
  DEMO_TENANT_PROJECT_ENVIRONMENT_02,
  DEMO_TENANT_PROJECT_ID,
  DEMO_TENANT_PROJECT_ID_02,
  DEMO_TENANT_PROJECT_NAME,
  DEMO_TENANT_PROJECT_NAME_02,
}

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
  'catalog-manager': 'catalog',
  'team-access': 'projects-teams',
  'cost-allocation': 'overview',
  'quota-distribution': 'overview',
  'ip-pools': 'overview',
  billing: 'overview',
  'financial-audit': 'overview',
  'usage-budget': 'overview',
  instances: 'services-baremetal',
  services: 'services-baremetal',
  'services-bare-metal': 'services-baremetal',
  'my-instances': 'services-baremetal',
}

const VALID_TENANT_ADMIN_NAV_IDS = new Set<TenantAdminNavId>(
  getTenantAdminLeafNavItems().map((item) => item.id),
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
    (member.role === 'manager' ||
      member.role === 'viewer' ||
      member.role === 'developer' ||
      member.role === 'project-admin')
  )
}

const REMOVED_VM_CATALOG_ITEM_IDS = new Set(['cat-vm-net-attach', 'cat_VM_NET_ATTACH'])

function withoutRemovedVmCatalogItems(
  items: TenantProject['catalogItems'],
): TenantProject['catalogItems'] {
  return items.filter(
    (item) =>
      !REMOVED_VM_CATALOG_ITEM_IDS.has(item.id) &&
      item.displayName !== 'vm-configurable-network-attachments' &&
      item.displayName !== 'VM with Configurable Network Attachments',
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

  const catalogItems = withoutRemovedVmCatalogItems(
    Array.isArray(project.catalogItems)
      ? project.catalogItems.filter(isTenantProjectCatalogItem)
      : project.catalogItemId && project.catalogDisplayName
        ? [{ id: project.catalogItemId, displayName: project.catalogDisplayName }]
        : [],
  )

  const members = Array.isArray(project.members)
    ? project.members.filter(isTenantProjectMember).map((member) => ({
        ...member,
        role: migrateTenantProjectMemberRole(member.role),
      }))
    : []

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    environmentType: isTenantProjectEnvironment(project.environmentType)
      ? project.environmentType
      : 'development',
    instanceQuota: project.instanceQuota,
    externalIpPoolId: project.externalIpPoolId ?? null,
    externalIpPoolName: project.externalIpPoolName ?? null,
    externalIpPoolCidr: project.externalIpPoolCidr ?? null,
    catalogItems,
    members,
    parentProjectId:
      project.parentProjectId === undefined || project.parentProjectId === null
        ? null
        : project.parentProjectId,
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

const LEGACY_DEMO_TENANT_PROJECT_IDS = ['project_ml-platform', 'project_ml-project'] as const
const LEGACY_DEMO_TENANT_PROJECT_NAMES = ['ml-platform', 'ml-project'] as const

const DEMO_TENANT_PROJECT_MEMBERS: TenantProject['members'] = [
  {
    id: 'member_demo_admin',
    name: 'Alex Johnson',
    email: 'alex.johnson@northsummitbank.com',
    role: 'manager',
  },
  {
    id: 'member_demo_dev',
    name: 'Jordan Lee',
    email: 'jordan.lee@northsummitbank.com',
    role: 'manager',
  },
  {
    id: 'member_demo_dev_2',
    name: 'Sam Rivera',
    email: 'sam.rivera@northsummitbank.com',
    role: 'manager',
  },
  {
    id: 'member_demo_dev_3',
    name: 'Casey Morgan',
    email: 'casey.morgan@northsummitbank.com',
    role: 'manager',
  },
  {
    id: 'member_demo_dev_4',
    name: 'Riley Chen',
    email: 'riley.chen@northsummitbank.com',
    role: 'manager',
  },
  {
    id: 'member_demo_viewer',
    name: 'Taylor Brooks',
    email: 'taylor.brooks@northsummitbank.com',
    role: 'viewer',
  },
  {
    id: 'member_demo_viewer_2',
    name: 'Morgan Ellis',
    email: 'morgan.ellis@northsummitbank.com',
    role: 'viewer',
  },
  {
    id: 'member_demo_viewer_3',
    name: 'Jamie Patel',
    email: 'jamie.patel@northsummitbank.com',
    role: 'viewer',
  },
]

function createDemoTenantProject(): TenantProject {
  return {
    id: DEMO_TENANT_PROJECT_ID,
    name: DEMO_TENANT_PROJECT_NAME,
    description: DEMO_TENANT_PROJECT_DESCRIPTION,
    environmentType: DEMO_TENANT_PROJECT_ENVIRONMENT,
    instanceQuota: 10,
    externalIpPoolId: null,
    externalIpPoolName: null,
    externalIpPoolCidr: null,
    catalogItems: [
      {
        id: 'cat-bm-gpu-training',
        displayName: 'bare-metal-gpu-training-server',
      },
      {
        id: 'cat-node-sets-fc430',
        displayName: 'cluster-node-sets-object',
      },
    ],
    members: DEMO_TENANT_PROJECT_MEMBERS,
    parentProjectId: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
  }
}

function createDemoNestedTenantProject(): TenantProject {
  return {
    id: DEMO_NESTED_PROJECT_ID,
    name: DEMO_NESTED_PROJECT_NAME,
    description: DEMO_NESTED_PROJECT_DESCRIPTION,
    environmentType: DEMO_NESTED_PROJECT_ENVIRONMENT,
    instanceQuota: 5,
    externalIpPoolId: null,
    externalIpPoolName: null,
    externalIpPoolCidr: null,
    catalogItems: [],
    members: [
      {
        id: 'member_nested_viewer',
        name: 'Chris Morgan',
        email: 'chris@northsummitbank.com',
        role: 'viewer',
      },
    ],
    parentProjectId: DEMO_TENANT_PROJECT_ID,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  }
}

function createDemoFeatureSandboxProject(): TenantProject {
  return {
    id: DEMO_NESTED_DEV_PROJECT_ID,
    name: DEMO_NESTED_DEV_PROJECT_NAME,
    description: DEMO_NESTED_DEV_PROJECT_DESCRIPTION,
    environmentType: DEMO_NESTED_DEV_PROJECT_ENVIRONMENT,
    instanceQuota: 2,
    externalIpPoolId: null,
    externalIpPoolName: null,
    externalIpPoolCidr: null,
    catalogItems: [],
    members: [
      {
        id: 'member_feature_sandbox_viewer',
        name: 'Jamie Patel',
        email: 'jamie.patel@northsummitbank.com',
        role: 'viewer',
      },
    ],
    parentProjectId: DEMO_TENANT_PROJECT_ID_02,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  }
}

function createDemoFraudDetectionProject(): TenantProject {
  return {
    id: DEMO_FRAUD_DETECTION_PROJECT_ID,
    name: DEMO_FRAUD_DETECTION_PROJECT_NAME,
    description: DEMO_FRAUD_DETECTION_PROJECT_DESCRIPTION,
    environmentType: DEMO_FRAUD_DETECTION_PROJECT_ENVIRONMENT,
    instanceQuota: 3,
    externalIpPoolId: null,
    externalIpPoolName: null,
    externalIpPoolCidr: null,
    catalogItems: [],
    members: [DEMO_TENANT_PROJECT_MEMBERS[0]!],
    parentProjectId: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
  }
}

function createDemoTenantProject02(): TenantProject {
  return {
    id: DEMO_TENANT_PROJECT_ID_02,
    name: DEMO_TENANT_PROJECT_NAME_02,
    description: DEMO_TENANT_PROJECT_DESCRIPTION_02,
    environmentType: DEMO_TENANT_PROJECT_ENVIRONMENT_02,
    instanceQuota: 4,
    externalIpPoolId: null,
    externalIpPoolName: null,
    externalIpPoolCidr: null,
    catalogItems: [
      {
        id: 'cat-bm-gpu-training',
        displayName: 'bare-metal-gpu-training-server',
      },
    ],
    members: DEMO_TENANT_PROJECT_MEMBERS.slice(0, 4),
    parentProjectId: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  }
}

function withDemoProjectDefaults(project: TenantProject): TenantProject {
  return {
    ...project,
    id: DEMO_TENANT_PROJECT_ID,
    name: DEMO_TENANT_PROJECT_NAME,
    description: DEMO_TENANT_PROJECT_DESCRIPTION,
    environmentType: DEMO_TENANT_PROJECT_ENVIRONMENT,
    instanceQuota: 10,
    members:
      project.members.length < DEMO_TENANT_PROJECT_MEMBERS.length
        ? DEMO_TENANT_PROJECT_MEMBERS
        : project.members,
  }
}

function withDemoProject02Defaults(project: TenantProject): TenantProject {
  return {
    ...project,
    id: DEMO_TENANT_PROJECT_ID_02,
    name: DEMO_TENANT_PROJECT_NAME_02,
    description: DEMO_TENANT_PROJECT_DESCRIPTION_02,
    environmentType: DEMO_TENANT_PROJECT_ENVIRONMENT_02,
    instanceQuota: 4,
    members:
      project.members.length < 4 ? DEMO_TENANT_PROJECT_MEMBERS.slice(0, 4) : project.members,
    parentProjectId: null,
  }
}

function withDemoNestedProjectDefaults(project: TenantProject): TenantProject {
  return {
    ...project,
    id: DEMO_NESTED_PROJECT_ID,
    name: DEMO_NESTED_PROJECT_NAME,
    description: DEMO_NESTED_PROJECT_DESCRIPTION,
    environmentType: DEMO_NESTED_PROJECT_ENVIRONMENT,
    parentProjectId: DEMO_TENANT_PROJECT_ID,
    catalogItems: [],
    members:
      project.members.length === 0
        ? [
            {
              id: 'member_nested_viewer',
              name: 'Chris Morgan',
              email: 'chris@northsummitbank.com',
              role: 'viewer',
            },
          ]
        : project.members,
  }
}

function withDemoFeatureSandboxDefaults(project: TenantProject): TenantProject {
  return {
    ...project,
    id: DEMO_NESTED_DEV_PROJECT_ID,
    name: DEMO_NESTED_DEV_PROJECT_NAME,
    description: DEMO_NESTED_DEV_PROJECT_DESCRIPTION,
    environmentType: DEMO_NESTED_DEV_PROJECT_ENVIRONMENT,
    parentProjectId: DEMO_TENANT_PROJECT_ID_02,
    catalogItems: [],
    members:
      project.members.length === 0
        ? [
            {
              id: 'member_feature_sandbox_viewer',
              name: 'Jamie Patel',
              email: 'jamie.patel@northsummitbank.com',
              role: 'viewer',
            },
          ]
        : project.members,
  }
}

function withDemoFraudDetectionDefaults(project: TenantProject): TenantProject {
  return {
    ...project,
    id: DEMO_FRAUD_DETECTION_PROJECT_ID,
    name: DEMO_FRAUD_DETECTION_PROJECT_NAME,
    description: DEMO_FRAUD_DETECTION_PROJECT_DESCRIPTION,
    environmentType: DEMO_FRAUD_DETECTION_PROJECT_ENVIRONMENT,
    instanceQuota: 3,
    catalogItems: [],
    parentProjectId: null,
    members:
      project.members.length === 0 ? [DEMO_TENANT_PROJECT_MEMBERS[0]!] : project.members,
  }
}

function isLegacyDemoProject(project: TenantProject): boolean {
  return (
    LEGACY_DEMO_TENANT_PROJECT_IDS.includes(
      project.id as (typeof LEGACY_DEMO_TENANT_PROJECT_IDS)[number],
    ) ||
    LEGACY_DEMO_TENANT_PROJECT_NAMES.includes(
      project.name as (typeof LEGACY_DEMO_TENANT_PROJECT_NAMES)[number],
    )
  )
}

export function ensureTenantDemoProjects(slug: string): TenantProject[] {
  try {
    const key = getSlugKey(TENANT_PROJECTS_KEY_PREFIX, slug)
    if (sessionStorage.getItem(key) !== null) {
      const current = getTenantProjects(slug)
      const legacyDemo = current.find(isLegacyDemoProject)
      const hasCurrentDemo = current.some(
        (project) =>
          project.id === DEMO_TENANT_PROJECT_ID || project.name === DEMO_TENANT_PROJECT_NAME,
      )
      const hasSecondaryDemo = current.some(
        (project) =>
          project.id === DEMO_TENANT_PROJECT_ID_02 || project.name === DEMO_TENANT_PROJECT_NAME_02,
      )
      const hasNestedDemo = current.some(
        (project) =>
          project.id === DEMO_NESTED_PROJECT_ID || project.name === DEMO_NESTED_PROJECT_NAME,
      )
      const hasFeatureSandboxDemo = current.some(
        (project) =>
          project.id === DEMO_NESTED_DEV_PROJECT_ID ||
          project.name === DEMO_NESTED_DEV_PROJECT_NAME,
      )
      const hasFraudDetectionDemo = current.some(
        (project) =>
          project.id === DEMO_FRAUD_DETECTION_PROJECT_ID ||
          project.name === DEMO_FRAUD_DETECTION_PROJECT_NAME,
      )

      let updated = current
      let changed = false

      if (legacyDemo && legacyDemo.name !== DEMO_TENANT_PROJECT_NAME) {
        updated = updated.map((project) =>
          isLegacyDemoProject(project) ? withDemoProjectDefaults(project) : project,
        )
        changed = true
      } else if (hasCurrentDemo) {
        updated = updated.map((project) =>
          project.id === DEMO_TENANT_PROJECT_ID || project.name === DEMO_TENANT_PROJECT_NAME
            ? withDemoProjectDefaults(project)
            : project,
        )
        changed = updated.some((project, index) => project !== current[index])
      } else {
        updated = [createDemoTenantProject(), ...updated]
        changed = true
      }

      if (hasSecondaryDemo) {
        updated = updated.map((project) =>
          project.id === DEMO_TENANT_PROJECT_ID_02 || project.name === DEMO_TENANT_PROJECT_NAME_02
            ? withDemoProject02Defaults(project)
            : project,
        )
        changed = changed || updated.some((project, index) => project !== current[index])
      } else {
        updated = [...updated, createDemoTenantProject02()]
        changed = true
      }

      if (hasNestedDemo) {
        updated = updated.map((project) =>
          project.id === DEMO_NESTED_PROJECT_ID || project.name === DEMO_NESTED_PROJECT_NAME
            ? withDemoNestedProjectDefaults(project)
            : project,
        )
        changed = changed || updated.some((project, index) => project !== current[index])
      } else if (updated.some((project) => project.id === DEMO_TENANT_PROJECT_ID)) {
        updated = [...updated, createDemoNestedTenantProject()]
        changed = true
      }

      if (hasFeatureSandboxDemo) {
        updated = updated.map((project) =>
          project.id === DEMO_NESTED_DEV_PROJECT_ID ||
          project.name === DEMO_NESTED_DEV_PROJECT_NAME
            ? withDemoFeatureSandboxDefaults(project)
            : project,
        )
        changed = changed || updated.some((project, index) => project !== current[index])
      } else if (updated.some((project) => project.id === DEMO_TENANT_PROJECT_ID_02)) {
        updated = [...updated, createDemoFeatureSandboxProject()]
        changed = true
      }

      if (hasFraudDetectionDemo) {
        updated = updated.map((project) =>
          project.id === DEMO_FRAUD_DETECTION_PROJECT_ID ||
          project.name === DEMO_FRAUD_DETECTION_PROJECT_NAME
            ? withDemoFraudDetectionDefaults(project)
            : project,
        )
        changed = changed || updated.some((project, index) => project !== current[index])
      } else {
        updated = [...updated, createDemoFraudDetectionProject()]
        changed = true
      }

      if (changed) {
        setTenantProjects(slug, updated)
        return updated
      }

      return current
    }
  } catch {
    /* fall through to seed */
  }

  const demoProjects = [
    createDemoFraudDetectionProject(),
    createDemoTenantProject02(),
    createDemoFeatureSandboxProject(),
    createDemoTenantProject(),
    createDemoNestedTenantProject(),
  ]
  setTenantProjects(slug, demoProjects)
  return demoProjects
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

export function updateTenantProject(slug: string, project: TenantProject): TenantProject[] {
  const updated = getTenantProjects(slug).map((entry) =>
    entry.id === project.id ? project : entry,
  )
  setTenantProjects(slug, updated)
  return updated
}

export function removeTenantProject(slug: string, projectId: string): TenantProject[] {
  const current = getTenantProjects(slug)
  const idsToRemove = new Set([projectId, ...collectDescendantProjectIds(current, projectId)])
  const updated = current.filter((project) => !idsToRemove.has(project.id))
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

export function addTenantProjectMember(
  slug: string,
  projectId: string,
  member: TenantProject['members'][number],
): TenantProject[] {
  const updated = getTenantProjects(slug).map((project) => {
    if (project.id !== projectId) {
      return project
    }

    if (project.members.some((entry) => entry.email.toLowerCase() === member.email.toLowerCase())) {
      return project
    }

    return {
      ...project,
      members: [...project.members, member],
    }
  })

  setTenantProjects(slug, updated)
  return updated
}

export function removeTenantProjectMember(
  slug: string,
  projectId: string,
  memberId: string,
): TenantProject[] {
  const updated = getTenantProjects(slug).map((project) =>
    project.id === projectId
      ? {
          ...project,
          members: project.members.filter((member) => member.id !== memberId),
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
