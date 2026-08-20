import { DEMO_TENANT_LABEL } from '../demoTenant'
import {
  createDemoTenantBareMetalInstance,
  createDemoTenantBareMetalInstance02,
  createDemoTenantBareMetalInstance03,
  createDemoTenantClusterInstance,
  createDemoTenantClusterInstance02,
  createDemoTenantClusterInstance03,
  createDemoTenantClusterInstance04,
  DEMO_TENANT_BARE_METAL_INSTANCE_ID,
  DEMO_TENANT_BARE_METAL_INSTANCE_ID_02,
  DEMO_TENANT_BARE_METAL_INSTANCE_ID_03,
  DEMO_TENANT_CLUSTER_INSTANCE_ID,
  DEMO_TENANT_CLUSTER_INSTANCE_ID_02,
  DEMO_TENANT_CLUSTER_INSTANCE_ID_03,
  DEMO_TENANT_CLUSTER_INSTANCE_ID_04,
  DEMO_TENANT_CLUSTER_STATES,
  DEMO_TENANT_VIRTUAL_MACHINE_INSTANCE_ID,
  DEMO_TENANT_VIRTUAL_MACHINE_INSTANCE_ID_02,
  DEMO_TENANT_VIRTUAL_MACHINE_INSTANCE_ID_03,
  getDemoInstanceProjectIds,
  getTenantInstanceProjectIds,
  syncDemoMultiProjectShowcaseInstance,
  type TenantInstance,
} from './instances'
import {
  DEMO_TENANT_PROJECT_ID,
  DEMO_TENANT_PROJECT_ID_02,
  DEMO_TENANT_PROJECT_NAME,
  DEMO_TENANT_PROJECT_NAME_02,
} from '../tenantAdmin/storage'

const TENANT_USER_ONBOARDING_COMPLETE_KEY_PREFIX = 'bmaas-tenant-user-onboarding-complete-'
const TENANT_USER_ACTIVE_NAV_KEY_PREFIX = 'bmaas-tenant-user-active-nav-'
const TENANT_USER_INSTANCES_KEY_PREFIX = 'bmaas-tenant-user-instances-'

export type TenantUserNavId =
  | 'catalog'
  | 'services-baremetal'
  | 'services-clusters'
  | 'services-models'
  | 'services-virtual-machines'
  | 'projects-teams'
  | 'networking-virtual-networks'
  | 'networking-subnets'
  | 'networking-security-groups'
  | 'networking-external-ip-pools'
  | 'activity-log'

const TENANT_USER_NAV_IDS: TenantUserNavId[] = [
  'catalog',
  'services-baremetal',
  'services-clusters',
  'services-models',
  'services-virtual-machines',
  'projects-teams',
  'networking-virtual-networks',
  'networking-subnets',
  'networking-security-groups',
  'networking-external-ip-pools',
  'activity-log',
]

const LEGACY_TENANT_USER_NAV_IDS: Record<string, TenantUserNavId> = {
  'my-instances': 'services-baremetal',
  services: 'services-baremetal',
}

function getSlugKey(prefix: string, slug: string): string {
  return `${prefix}${slug}`
}

function isTenantUserNavId(value: string): value is TenantUserNavId {
  return TENANT_USER_NAV_IDS.includes(value as TenantUserNavId)
}

function isTenantInstanceNetworking(value: unknown): value is TenantInstance['networking'] {
  if (!value || typeof value !== 'object') {
    return false
  }

  const networking = value as NonNullable<TenantInstance['networking']>
  return (
    typeof networking.enabled === 'boolean' &&
    typeof networking.virtualNetwork === 'string' &&
    typeof networking.subnet === 'string' &&
    typeof networking.securityGroup === 'string'
  )
}

function isTenantInstance(value: unknown): value is TenantInstance {
  if (!value || typeof value !== 'object') {
    return false
  }

  const instance = value as TenantInstance
  const validServiceId =
    instance.serviceId === undefined ||
    instance.serviceId === 'baremetal' ||
    instance.serviceId === 'cluster' ||
    instance.serviceId === 'models' ||
    instance.serviceId === 'virtual-machine'
  const validSpecRows =
    instance.specRows === undefined ||
    (Array.isArray(instance.specRows) &&
      instance.specRows.every(
        (row) =>
          row &&
          typeof row === 'object' &&
          typeof (row as { label?: unknown }).label === 'string' &&
          typeof (row as { value?: unknown }).value === 'string',
      ))
  const validStatus =
    instance.status === 'provisioning' ||
    instance.status === 'restarting' ||
    instance.status === 'running' ||
    instance.status === 'stopped' ||
    instance.status === 'failed'

  return (
    typeof instance.id === 'string' &&
    typeof instance.name === 'string' &&
    (instance.description === undefined || typeof instance.description === 'string') &&
    typeof instance.catalogItemDisplayName === 'string' &&
    validServiceId &&
    typeof instance.hardwareProfile === 'string' &&
    typeof instance.osImage === 'string' &&
    typeof instance.networkLabel === 'string' &&
    (instance.networking === undefined || isTenantInstanceNetworking(instance.networking)) &&
    typeof instance.gpuLabel === 'string' &&
    validSpecRows &&
    typeof instance.projectName === 'string' &&
    (instance.projectIds === undefined ||
      (Array.isArray(instance.projectIds) &&
        instance.projectIds.every((projectId) => typeof projectId === 'string'))) &&
    (instance.scopeKind === undefined ||
      instance.scopeKind === 'organization' ||
      instance.scopeKind === 'project') &&
    validStatus &&
    typeof instance.createdAt === 'string' &&
    (instance.provisionedAt === null || typeof instance.provisionedAt === 'string')
  )
}

export function isTenantUserOnboardingComplete(slug: string): boolean {
  try {
    return sessionStorage.getItem(getSlugKey(TENANT_USER_ONBOARDING_COMPLETE_KEY_PREFIX, slug)) === 'true'
  } catch {
    return false
  }
}

export function setTenantUserOnboardingComplete(slug: string): void {
  try {
    sessionStorage.setItem(getSlugKey(TENANT_USER_ONBOARDING_COMPLETE_KEY_PREFIX, slug), 'true')
  } catch {
    /* demo storage unavailable */
  }
}

export function clearTenantUserOnboardingComplete(slug: string): void {
  try {
    sessionStorage.removeItem(getSlugKey(TENANT_USER_ONBOARDING_COMPLETE_KEY_PREFIX, slug))
  } catch {
    /* demo storage unavailable */
  }
}

export function getTenantUserActiveNav(slug: string): TenantUserNavId {
  try {
    const stored = sessionStorage.getItem(getSlugKey(TENANT_USER_ACTIVE_NAV_KEY_PREFIX, slug))
    if (stored && isTenantUserNavId(stored)) {
      return stored
    }
    if (stored && LEGACY_TENANT_USER_NAV_IDS[stored]) {
      const normalized = LEGACY_TENANT_USER_NAV_IDS[stored]
      setTenantUserActiveNav(slug, normalized)
      return normalized
    }
  } catch {
    /* demo storage unavailable */
  }

  return 'catalog'
}

export function setTenantUserActiveNav(slug: string, navId: TenantUserNavId): void {
  try {
    sessionStorage.setItem(getSlugKey(TENANT_USER_ACTIVE_NAV_KEY_PREFIX, slug), navId)
  } catch {
    /* demo storage unavailable */
  }
}

export function getTenantUserInstances(slug: string): TenantInstance[] {
  try {
    const raw = sessionStorage.getItem(getSlugKey(TENANT_USER_INSTANCES_KEY_PREFIX, slug))
    if (!raw) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isTenantInstance).map((instance) => {
      const projectIds = getTenantInstanceProjectIds(instance)
      const primaryProjectName =
        projectIds[0] === DEMO_TENANT_PROJECT_ID_02
          ? DEMO_TENANT_PROJECT_NAME_02
          : projectIds.includes(DEMO_TENANT_PROJECT_ID)
            ? DEMO_TENANT_PROJECT_NAME
            : instance.projectName

      return {
        ...instance,
        projectIds,
        scopeKind: projectIds.length > 0 ? 'project' : (instance.scopeKind ?? 'organization'),
        projectName: projectIds.length > 0 ? primaryProjectName : instance.projectName,
      }
    })
  } catch {
    return []
  }
}

function getDemoOrganizationName(slug: string): string {
  if (slug === 'northstar' || slug === 'evergreen') {
    return DEMO_TENANT_LABEL[slug]
  }
  return DEMO_TENANT_LABEL.northstar
}

/**
 * Ensures Tenant Admin / Tenant User Services lists include demo Bare metal
 * and Cluster instances. Virtual machines and Models stay empty (catalog-launch only).
 * Stable IDs avoid duplicates across reloads.
 */
export function ensureTenantDemoInstances(
  slug: string,
  organizationName: string = getDemoOrganizationName(slug),
): TenantInstance[] {
  const existing = getTenantUserInstances(slug)
  let next = [...existing]
  let changed = false

  // Drop legacy seeded VMs so Virtual machines matches Models (empty until launch).
  const retiredDemoVmIds = new Set([
    DEMO_TENANT_VIRTUAL_MACHINE_INSTANCE_ID,
    DEMO_TENANT_VIRTUAL_MACHINE_INSTANCE_ID_02,
    DEMO_TENANT_VIRTUAL_MACHINE_INSTANCE_ID_03,
  ])
  const withoutRetiredVms = next.filter((instance) => !retiredDemoVmIds.has(instance.id))
  if (withoutRetiredVms.length !== next.length) {
    next = withoutRetiredVms
    changed = true
  }

  const demos: Array<{ id: string; create: (org: string) => TenantInstance }> = [
    { id: DEMO_TENANT_BARE_METAL_INSTANCE_ID, create: createDemoTenantBareMetalInstance },
    { id: DEMO_TENANT_BARE_METAL_INSTANCE_ID_02, create: createDemoTenantBareMetalInstance02 },
    { id: DEMO_TENANT_BARE_METAL_INSTANCE_ID_03, create: createDemoTenantBareMetalInstance03 },
    { id: DEMO_TENANT_CLUSTER_INSTANCE_ID, create: createDemoTenantClusterInstance },
    { id: DEMO_TENANT_CLUSTER_INSTANCE_ID_02, create: createDemoTenantClusterInstance02 },
    { id: DEMO_TENANT_CLUSTER_INSTANCE_ID_03, create: createDemoTenantClusterInstance03 },
    { id: DEMO_TENANT_CLUSTER_INSTANCE_ID_04, create: createDemoTenantClusterInstance04 },
  ]

  for (const demo of demos) {
    const existingIndex = next.findIndex((instance) => instance.id === demo.id)
    if (existingIndex === -1) {
      next.push(demo.create(organizationName))
      changed = true
      continue
    }

    const current = next[existingIndex]!
    const desiredProjectIds = getDemoInstanceProjectIds(demo.id)
    const hasStoredProjectIds = Array.isArray(current.projectIds)
    const currentProjectIds = hasStoredProjectIds
      ? [...new Set(current.projectIds.filter(Boolean))].slice(0, 1)
      : []
    const desiredKey = desiredProjectIds.join(',')
    const currentKey = currentProjectIds.join(',')
    const desiredProjectName =
      desiredProjectIds[0] === DEMO_TENANT_PROJECT_ID_02
        ? DEMO_TENANT_PROJECT_NAME_02
        : DEMO_TENANT_PROJECT_NAME
    const needsProjectSync =
      desiredProjectIds.length > 0 &&
      (desiredKey !== currentKey ||
        current.scopeKind !== 'project' ||
        current.projectName === 'ml-platform' ||
        current.projectName !== desiredProjectName)

    if (needsProjectSync) {
      next[existingIndex] = {
        ...current,
        scopeKind: 'project',
        projectName: desiredProjectName,
        projectIds: desiredProjectIds,
      }
      changed = true
    } else if (!hasStoredProjectIds) {
      next[existingIndex] = {
        ...current,
        projectIds: getTenantInstanceProjectIds(current),
      }
      changed = true
    }

    if (demo.id === DEMO_TENANT_BARE_METAL_INSTANCE_ID_03) {
      const synced = syncDemoMultiProjectShowcaseInstance(next[existingIndex]!)
      if (synced) {
        next[existingIndex] = synced
        changed = true
      }
    }

    const clusterState = DEMO_TENANT_CLUSTER_STATES.find((entry) => entry.id === demo.id)
    if (!clusterState) {
      continue
    }

    const refreshed = next[existingIndex]!
    const fresh = demo.create(organizationName)
    const needsClusterConfigRefresh =
      demo.id === DEMO_TENANT_CLUSTER_INSTANCE_ID &&
      (refreshed.clusterConfig?.upgradeStatus !== fresh.clusterConfig?.upgradeStatus ||
        refreshed.clusterConfig?.desiredVersion !== fresh.clusterConfig?.desiredVersion ||
        refreshed.osImage !== fresh.osImage ||
        (refreshed.clusterConfig?.nodeSets?.length ?? 0) < 2 ||
        refreshed.clusterConfig?.nodeSets?.some(
          (nodeSet, index) =>
            !nodeSet.version ||
            !nodeSet.name ||
            nodeSet.version !== fresh.clusterConfig?.nodeSets?.[index]?.version,
        ))

    if (
      refreshed.name !== clusterState.name ||
      refreshed.status !== clusterState.status ||
      needsClusterConfigRefresh
    ) {
      next[existingIndex] = {
        ...fresh,
        projectIds: refreshed.projectIds,
        projectName: refreshed.projectName,
        scopeKind: refreshed.scopeKind,
        // Keep user-driven lifecycle timestamps when only refreshing config shape.
        createdAt: refreshed.createdAt,
        provisionedAt:
          clusterState.status === 'provisioning'
            ? null
            : (refreshed.provisionedAt ?? refreshed.createdAt),
        name: clusterState.name,
        status: clusterState.status,
      }
      changed = true
    }
  }

  for (let index = 0; index < next.length; index += 1) {
    const synced = syncDemoMultiProjectShowcaseInstance(next[index]!)
    if (synced) {
      next[index] = synced
      changed = true
    }
  }

  if (changed) {
    setTenantUserInstances(slug, next)
  }

  return next
}

/** Read instances and seed Bare metal / Cluster demos when missing (shared by Admin + User). */
export function getOrEnsureTenantUserInstances(
  slug: string,
  organizationName?: string,
): TenantInstance[] {
  return ensureTenantDemoInstances(slug, organizationName ?? getDemoOrganizationName(slug))
}

export function setTenantUserInstances(slug: string, instances: TenantInstance[]): void {
  try {
    sessionStorage.setItem(getSlugKey(TENANT_USER_INSTANCES_KEY_PREFIX, slug), JSON.stringify(instances))
  } catch {
    /* demo storage unavailable */
  }
}

export function addTenantUserInstance(
  slug: string,
  instance: TenantInstance,
  knownInstances?: TenantInstance[],
): TenantInstance[] {
  const source = knownInstances ?? getTenantUserInstances(slug)
  const instances = source.some((item) => item.id === instance.id)
    ? source.map((item) => (item.id === instance.id ? instance : item))
    : [...source, instance]
  setTenantUserInstances(slug, instances)
  return instances
}

export function updateTenantUserInstance(
  slug: string,
  instanceId: string,
  patch: Partial<TenantInstance>,
  knownInstances?: TenantInstance[],
): TenantInstance[] {
  const source = knownInstances ?? getTenantUserInstances(slug)
  const instances = source.map((instance) =>
    instance.id === instanceId ? { ...instance, ...patch } : instance,
  )
  setTenantUserInstances(slug, instances)
  return instances
}

export function removeTenantUserInstance(
  slug: string,
  instanceId: string,
  knownInstances?: TenantInstance[],
): TenantInstance[] {
  const source = knownInstances ?? getTenantUserInstances(slug)
  const instances = source.filter((instance) => instance.id !== instanceId)
  setTenantUserInstances(slug, instances)
  return instances
}
