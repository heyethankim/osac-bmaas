import { DEMO_TENANT_LABEL } from '../demoTenant'
import {
  createDemoTenantBareMetalInstance,
  createDemoTenantBareMetalInstance02,
  createDemoTenantBareMetalInstance03,
  createDemoTenantClusterInstance,
  createDemoTenantClusterInstance02,
  createDemoTenantClusterInstance03,
  createDemoTenantClusterInstance04,
  createDemoTenantVirtualMachineInstance,
  createDemoTenantVirtualMachineInstance02,
  createDemoTenantVirtualMachineInstance03,
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
  type TenantInstance,
} from './instances'

const TENANT_USER_ONBOARDING_COMPLETE_KEY_PREFIX = 'bmaas-tenant-user-onboarding-complete-'
const TENANT_USER_ACTIVE_NAV_KEY_PREFIX = 'bmaas-tenant-user-active-nav-'
const TENANT_USER_INSTANCES_KEY_PREFIX = 'bmaas-tenant-user-instances-'

export type TenantUserNavId =
  | 'catalog'
  | 'services-baremetal'
  | 'services-clusters'
  | 'services-models'
  | 'services-virtual-machines'
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
    typeof instance.catalogItemDisplayName === 'string' &&
    validServiceId &&
    typeof instance.hardwareProfile === 'string' &&
    typeof instance.osImage === 'string' &&
    typeof instance.networkLabel === 'string' &&
    (instance.networking === undefined || isTenantInstanceNetworking(instance.networking)) &&
    typeof instance.gpuLabel === 'string' &&
    validSpecRows &&
    typeof instance.projectName === 'string' &&
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

    return parsed.filter(isTenantInstance).map((instance) => ({
      ...instance,
      scopeKind: instance.scopeKind ?? 'project',
    }))
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
 * Ensures Tenant Admin / Tenant User Services lists include demo Bare metal,
 * Virtual machine, and Cluster instances. Stable IDs avoid duplicates across reloads.
 */
export function ensureTenantDemoInstances(
  slug: string,
  organizationName: string = getDemoOrganizationName(slug),
): TenantInstance[] {
  const existing = getTenantUserInstances(slug)
  const next = [...existing]
  let changed = false

  const demos: Array<{ id: string; create: (org: string) => TenantInstance }> = [
    { id: DEMO_TENANT_BARE_METAL_INSTANCE_ID, create: createDemoTenantBareMetalInstance },
    { id: DEMO_TENANT_BARE_METAL_INSTANCE_ID_02, create: createDemoTenantBareMetalInstance02 },
    { id: DEMO_TENANT_BARE_METAL_INSTANCE_ID_03, create: createDemoTenantBareMetalInstance03 },
    { id: DEMO_TENANT_VIRTUAL_MACHINE_INSTANCE_ID, create: createDemoTenantVirtualMachineInstance },
    {
      id: DEMO_TENANT_VIRTUAL_MACHINE_INSTANCE_ID_02,
      create: createDemoTenantVirtualMachineInstance02,
    },
    {
      id: DEMO_TENANT_VIRTUAL_MACHINE_INSTANCE_ID_03,
      create: createDemoTenantVirtualMachineInstance03,
    },
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

    const clusterState = DEMO_TENANT_CLUSTER_STATES.find((entry) => entry.id === demo.id)
    if (!clusterState) {
      continue
    }

    const current = next[existingIndex]!
    const fresh = demo.create(organizationName)
    const needsClusterConfigRefresh =
      demo.id === DEMO_TENANT_CLUSTER_INSTANCE_ID &&
      (current.clusterConfig?.upgradeStatus !== fresh.clusterConfig?.upgradeStatus ||
        current.clusterConfig?.desiredVersion !== fresh.clusterConfig?.desiredVersion ||
        current.osImage !== fresh.osImage ||
        (current.clusterConfig?.nodeSets?.length ?? 0) < 2 ||
        current.clusterConfig?.nodeSets?.some(
          (nodeSet, index) =>
            !nodeSet.version ||
            !nodeSet.name ||
            nodeSet.version !== fresh.clusterConfig?.nodeSets?.[index]?.version,
        ))

    if (
      current.name !== clusterState.name ||
      current.status !== clusterState.status ||
      needsClusterConfigRefresh
    ) {
      next[existingIndex] = {
        ...fresh,
        // Keep user-driven lifecycle timestamps when only refreshing config shape.
        createdAt: current.createdAt,
        provisionedAt:
          clusterState.status === 'provisioning'
            ? null
            : (current.provisionedAt ?? current.createdAt),
        name: clusterState.name,
        status: clusterState.status,
      }
      changed = true
    }
  }

  if (changed) {
    setTenantUserInstances(slug, next)
  }

  return next
}

/** Read instances and seed Bare metal / VM demos when missing (shared by Admin + User). */
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
