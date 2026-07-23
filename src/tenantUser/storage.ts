import type { TenantInstance } from './instances'

const TENANT_USER_ONBOARDING_COMPLETE_KEY_PREFIX = 'bmaas-tenant-user-onboarding-complete-'
const TENANT_USER_ACTIVE_NAV_KEY_PREFIX = 'bmaas-tenant-user-active-nav-'
const TENANT_USER_INSTANCES_KEY_PREFIX = 'bmaas-tenant-user-instances-'

export type TenantUserNavId = 'catalog' | 'my-instances' | 'activity-log'

const TENANT_USER_NAV_IDS: TenantUserNavId[] = ['catalog', 'my-instances', 'activity-log']

function getSlugKey(prefix: string, slug: string): string {
  return `${prefix}${slug}`
}

function isTenantUserNavId(value: string): value is TenantUserNavId {
  return TENANT_USER_NAV_IDS.includes(value as TenantUserNavId)
}

function isTenantInstance(value: unknown): value is TenantInstance {
  if (!value || typeof value !== 'object') {
    return false
  }

  const instance = value as TenantInstance
  return (
    typeof instance.id === 'string' &&
    typeof instance.name === 'string' &&
    typeof instance.catalogItemDisplayName === 'string' &&
    typeof instance.hardwareProfile === 'string' &&
    typeof instance.osImage === 'string' &&
    typeof instance.networkLabel === 'string' &&
    typeof instance.gpuLabel === 'string' &&
    typeof instance.projectName === 'string' &&
    (instance.status === 'provisioning' || instance.status === 'running' || instance.status === 'failed') &&
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

    return parsed.filter(isTenantInstance)
  } catch {
    return []
  }
}

export function setTenantUserInstances(slug: string, instances: TenantInstance[]): void {
  try {
    sessionStorage.setItem(getSlugKey(TENANT_USER_INSTANCES_KEY_PREFIX, slug), JSON.stringify(instances))
  } catch {
    /* demo storage unavailable */
  }
}

export function addTenantUserInstance(slug: string, instance: TenantInstance): TenantInstance[] {
  const instances = [...getTenantUserInstances(slug), instance]
  setTenantUserInstances(slug, instances)
  return instances
}

export function updateTenantUserInstance(
  slug: string,
  instanceId: string,
  patch: Partial<TenantInstance>,
): TenantInstance[] {
  const instances = getTenantUserInstances(slug).map((instance) =>
    instance.id === instanceId ? { ...instance, ...patch } : instance,
  )
  setTenantUserInstances(slug, instances)
  return instances
}

export function removeTenantUserInstance(slug: string, instanceId: string): TenantInstance[] {
  const instances = getTenantUserInstances(slug).filter((instance) => instance.id !== instanceId)
  setTenantUserInstances(slug, instances)
  return instances
}
