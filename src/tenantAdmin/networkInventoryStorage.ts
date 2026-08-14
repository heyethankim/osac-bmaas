import {
  DEFAULT_EXTERNAL_IP_POOLS,
  type ExternalIpPool,
} from '../providerAdmin/externalIpPools'
import {
  toExternalIpPoolCatalogOption,
  type CatalogNetworkResourceOption,
} from '../providerAdmin/catalogNetworkPolicy'
import {
  DEFAULT_PROVIDER_SECURITY_GROUPS,
  DEFAULT_PROVIDER_SUBNETS,
  DEFAULT_PROVIDER_VIRTUAL_NETWORKS,
  getNetworkInventoryStatus,
  toCatalogNetworkOption,
  type ProviderSecurityGroup,
  type ProviderSubnet,
  type ProviderVirtualNetwork,
} from '../providerAdmin/networkInventory'

const TENANT_VIRTUAL_NETWORKS_KEY_PREFIX = 'bmaas-tenant-virtual-networks-'
const TENANT_SUBNETS_KEY_PREFIX = 'bmaas-tenant-subnets-'
const TENANT_SECURITY_GROUPS_KEY_PREFIX = 'bmaas-tenant-security-groups-'
const TENANT_EXTERNAL_IP_POOLS_KEY_PREFIX = 'bmaas-tenant-external-ip-pools-'

function tenantKey(prefix: string, slug: string): string {
  return `${prefix}${slug}`
}

function cloneDefaults<T>(items: readonly T[]): T[] {
  return items.map((item) => ({ ...item }))
}

function readJsonArray<T>(
  key: string,
  fallback: T[],
  isValid: (value: unknown) => value is T,
): T[] {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) {
      sessionStorage.setItem(key, JSON.stringify(fallback))
      return cloneDefaults(fallback)
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      sessionStorage.setItem(key, JSON.stringify(fallback))
      return cloneDefaults(fallback)
    }

    const items = parsed.filter(isValid)
    if (items.length === 0) {
      sessionStorage.setItem(key, JSON.stringify(fallback))
      return cloneDefaults(fallback)
    }

    return items
  } catch {
    return cloneDefaults(fallback)
  }
}

function writeJsonArray<T>(key: string, items: T[]): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(items))
  } catch {
    /* demo storage unavailable */
  }
}

function isProviderVirtualNetwork(value: unknown): value is ProviderVirtualNetwork {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const network = value as ProviderVirtualNetwork
  return (
    typeof network.id === 'string' &&
    typeof network.name === 'string' &&
    typeof network.detail === 'string' &&
    typeof network.cidr === 'string' &&
    typeof network.createdAt === 'string'
  )
}

function isProviderSubnet(value: unknown): value is ProviderSubnet {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const subnet = value as ProviderSubnet
  return (
    typeof subnet.id === 'string' &&
    typeof subnet.name === 'string' &&
    typeof subnet.detail === 'string' &&
    typeof subnet.cidr === 'string' &&
    typeof subnet.vlan === 'string' &&
    typeof subnet.virtualNetworkId === 'string' &&
    typeof subnet.createdAt === 'string'
  )
}

function isProviderSecurityGroup(value: unknown): value is ProviderSecurityGroup {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const group = value as ProviderSecurityGroup
  return (
    typeof group.id === 'string' &&
    typeof group.name === 'string' &&
    typeof group.detail === 'string' &&
    typeof group.createdAt === 'string'
  )
}

function isExternalIpPool(value: unknown): value is ExternalIpPool {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const pool = value as ExternalIpPool
  return (
    typeof pool.id === 'string' &&
    typeof pool.name === 'string' &&
    typeof pool.cidr === 'string' &&
    typeof pool.dataCenter === 'string' &&
    typeof pool.totalAddresses === 'number' &&
    typeof pool.createdAt === 'string'
  )
}

/** Tenant-owned network inventory seeded independently from provider defaults. */
export function getTenantVirtualNetworks(slug: string): ProviderVirtualNetwork[] {
  return readJsonArray(
    tenantKey(TENANT_VIRTUAL_NETWORKS_KEY_PREFIX, slug),
    DEFAULT_PROVIDER_VIRTUAL_NETWORKS,
    isProviderVirtualNetwork,
  ).map((network) => ({
    ...network,
    status: getNetworkInventoryStatus(network),
  }))
}

export function setTenantVirtualNetworks(
  slug: string,
  networks: ProviderVirtualNetwork[],
): void {
  writeJsonArray(tenantKey(TENANT_VIRTUAL_NETWORKS_KEY_PREFIX, slug), networks)
}

export function addTenantVirtualNetwork(
  slug: string,
  network: ProviderVirtualNetwork,
): void {
  setTenantVirtualNetworks(slug, [...getTenantVirtualNetworks(slug), network])
}

export function getTenantSubnets(slug: string): ProviderSubnet[] {
  return readJsonArray(
    tenantKey(TENANT_SUBNETS_KEY_PREFIX, slug),
    DEFAULT_PROVIDER_SUBNETS,
    isProviderSubnet,
  ).map((subnet) => ({
    ...subnet,
    status: getNetworkInventoryStatus(subnet),
  }))
}

export function setTenantSubnets(slug: string, subnets: ProviderSubnet[]): void {
  writeJsonArray(tenantKey(TENANT_SUBNETS_KEY_PREFIX, slug), subnets)
}

export function addTenantSubnet(slug: string, subnet: ProviderSubnet): void {
  setTenantSubnets(slug, [...getTenantSubnets(slug), subnet])
}

export function getTenantSecurityGroups(slug: string): ProviderSecurityGroup[] {
  return readJsonArray(
    tenantKey(TENANT_SECURITY_GROUPS_KEY_PREFIX, slug),
    DEFAULT_PROVIDER_SECURITY_GROUPS,
    isProviderSecurityGroup,
  ).map((group) => ({
    ...group,
    status: getNetworkInventoryStatus(group),
  }))
}

export function setTenantSecurityGroups(
  slug: string,
  groups: ProviderSecurityGroup[],
): void {
  writeJsonArray(tenantKey(TENANT_SECURITY_GROUPS_KEY_PREFIX, slug), groups)
}

export function addTenantSecurityGroup(
  slug: string,
  group: ProviderSecurityGroup,
): void {
  setTenantSecurityGroups(slug, [...getTenantSecurityGroups(slug), group])
}

export function getTenantExternalIpPools(slug: string): ExternalIpPool[] {
  return readJsonArray(
    tenantKey(TENANT_EXTERNAL_IP_POOLS_KEY_PREFIX, slug),
    DEFAULT_EXTERNAL_IP_POOLS,
    isExternalIpPool,
  )
}

export function setTenantExternalIpPools(slug: string, pools: ExternalIpPool[]): void {
  writeJsonArray(tenantKey(TENANT_EXTERNAL_IP_POOLS_KEY_PREFIX, slug), pools)
}

export function addTenantExternalIpPool(slug: string, pool: ExternalIpPool): void {
  setTenantExternalIpPools(slug, [...getTenantExternalIpPools(slug), pool])
}

export function getTenantVirtualNetworkOptions(
  slug: string,
): CatalogNetworkResourceOption[] {
  return getTenantVirtualNetworks(slug).map(toCatalogNetworkOption)
}

export function getTenantSubnetOptions(
  slug: string,
  virtualNetworkId?: string,
): CatalogNetworkResourceOption[] {
  const subnets = getTenantSubnets(slug)
  const scoped = virtualNetworkId
    ? subnets.filter((subnet) => subnet.virtualNetworkId === virtualNetworkId)
    : subnets
  return (scoped.length > 0 ? scoped : subnets).map(toCatalogNetworkOption)
}

export function getTenantSecurityGroupOptions(
  slug: string,
): CatalogNetworkResourceOption[] {
  return getTenantSecurityGroups(slug).map(toCatalogNetworkOption)
}

export function getTenantExternalIpPoolOptions(
  slug: string,
): CatalogNetworkResourceOption[] {
  return getTenantExternalIpPools(slug).map(toExternalIpPoolCatalogOption)
}
