import type { RegisteredOrganization } from '../providerAdmin/organizations'
import type { TenantInstance } from './instances'
import {
  addTenantUserInstance,
  ensureTenantDemoInstances,
  removeTenantUserInstance,
  updateTenantUserInstance,
} from './storage'

export const PROVIDER_INSTANCE_SCOPE_SEPARATOR = '::'

export function scopeProviderServiceInstance(
  instance: TenantInstance,
  tenantSlug: string,
): TenantInstance {
  if (instance.ownerTenantSlug === tenantSlug) {
    return instance
  }

  return {
    ...instance,
    ownerTenantSlug: tenantSlug,
    id: `${tenantSlug}${PROVIDER_INSTANCE_SCOPE_SEPARATOR}${instance.id}`,
  }
}

export function unscopeProviderServiceInstance(instance: TenantInstance): {
  tenantSlug: string
  instance: TenantInstance
} {
  const tenantSlug = instance.ownerTenantSlug ?? ''
  if (!tenantSlug) {
    return { tenantSlug: '', instance }
  }

  const prefix = `${tenantSlug}${PROVIDER_INSTANCE_SCOPE_SEPARATOR}`
  const rawId = instance.id.startsWith(prefix) ? instance.id.slice(prefix.length) : instance.id
  const { ownerTenantSlug: _ownerTenantSlug, ...rest } = instance

  return {
    tenantSlug,
    instance: { ...rest, id: rawId },
  }
}

export function ensureProviderServicesInstances(
  organizations: readonly RegisteredOrganization[],
): TenantInstance[] {
  return organizations.flatMap((organization) =>
    ensureTenantDemoInstances(organization.slug, organization.name).map((instance) =>
      scopeProviderServiceInstance(instance, organization.slug),
    ),
  )
}

export function mergeProviderServiceInstancesUpdate(
  allInstances: readonly TenantInstance[],
  tenantSlug: string,
  tenantInstances: readonly TenantInstance[],
): TenantInstance[] {
  const scoped = tenantInstances.map((instance) =>
    scopeProviderServiceInstance(instance, tenantSlug),
  )
  const rest = allInstances.filter((instance) => instance.ownerTenantSlug !== tenantSlug)
  return [...rest, ...scoped]
}

function getTenantInstancesFromProviderView(
  allInstances: readonly TenantInstance[],
  tenantSlug: string,
  fallbackTenantSlug: string,
): TenantInstance[] {
  return allInstances
    .filter((instance) => (instance.ownerTenantSlug ?? fallbackTenantSlug) === tenantSlug)
    .map((instance) => unscopeProviderServiceInstance(instance).instance)
}

export function patchProviderServiceInstance(
  allInstances: readonly TenantInstance[],
  instanceId: string,
  patch: Partial<TenantInstance>,
  fallbackTenantSlug: string,
): TenantInstance[] {
  const target = allInstances.find((instance) => instance.id === instanceId)
  if (!target) {
    return [...allInstances]
  }

  const { tenantSlug, instance } = unscopeProviderServiceInstance(target)
  const ownerSlug = tenantSlug || fallbackTenantSlug
  const tenantInstances = getTenantInstancesFromProviderView(
    allInstances,
    ownerSlug,
    fallbackTenantSlug,
  )
  const updated = updateTenantUserInstance(ownerSlug, instance.id, patch, tenantInstances)
  return mergeProviderServiceInstancesUpdate(allInstances, ownerSlug, updated)
}

export function removeProviderServiceInstance(
  allInstances: readonly TenantInstance[],
  instanceId: string,
  fallbackTenantSlug: string,
): TenantInstance[] {
  const target = allInstances.find((instance) => instance.id === instanceId)
  if (!target) {
    return [...allInstances]
  }

  const { tenantSlug, instance } = unscopeProviderServiceInstance(target)
  const ownerSlug = tenantSlug || fallbackTenantSlug
  const tenantInstances = getTenantInstancesFromProviderView(
    allInstances,
    ownerSlug,
    fallbackTenantSlug,
  )
  const updated = removeTenantUserInstance(ownerSlug, instance.id, tenantInstances)
  return mergeProviderServiceInstancesUpdate(allInstances, ownerSlug, updated)
}

export function addProviderServiceInstance(
  allInstances: readonly TenantInstance[],
  tenantSlug: string,
  instance: TenantInstance,
): TenantInstance[] {
  const tenantInstances = getTenantInstancesFromProviderView(
    allInstances,
    tenantSlug,
    tenantSlug,
  )
  const updated = addTenantUserInstance(tenantSlug, instance, tenantInstances)
  return mergeProviderServiceInstancesUpdate(allInstances, tenantSlug, updated)
}
