import type { ExternalIpPool } from './externalIpPools'
import type { ProviderVirtualNetwork } from './networkInventory'
import { hasVirtualNetworkNatGateway } from './networkInventory'
import type { CatalogServiceId } from '../providerSetup/templateDemo'
import type { TenantInstance } from '../tenantUser/instances'
import { getTenantInstanceServiceId } from '../tenantUser/instances'

export type ExternalIpStatus = 'In use' | 'Available'

export type ExternalIp = {
  id: string
  address: string
  family: 'IPv4' | 'IPv6'
  status: ExternalIpStatus
  poolId: string | null
  poolName: string | null
  attachedTo: string
}

export type ExternalIpPoolGroup = {
  pool: ExternalIpPool
  ips: ExternalIp[]
}

/** Demo external IPs allocated from northsummit-public-edge and attached to tenant workloads. */
export const DEFAULT_NORTHSUMMIT_EXTERNAL_IPS: ExternalIp[] = [
  {
    id: 'eip-northsummit-bm-01',
    address: '203.0.113.30',
    family: 'IPv4',
    status: 'In use',
    poolId: 'eipool-northsummit-edge',
    poolName: 'northsummit-public-edge',
    attachedTo: 'Bare metal · bm-server-01',
  },
  {
    id: 'eip-northsummit-cluster-01',
    address: '203.0.113.31',
    family: 'IPv4',
    status: 'In use',
    poolId: 'eipool-northsummit-edge',
    poolName: 'northsummit-public-edge',
    attachedTo: 'Cluster · ocp-cluster-01',
  },
  {
    id: 'eip-northsummit-bm-04',
    address: '203.0.113.32',
    family: 'IPv4',
    status: 'In use',
    poolId: 'eipool-northsummit-edge',
    poolName: 'northsummit-public-edge',
    attachedTo: 'Bare metal · bm-server-04',
  },
]

const DEMO_EXTERNAL_IPS: ExternalIp[] = [
  ...DEFAULT_NORTHSUMMIT_EXTERNAL_IPS,
  {
    id: 'eip-standby-pool-a',
    address: '198.51.100.12',
    family: 'IPv4',
    status: 'Available',
    poolId: 'eipool-standby-a',
    poolName: 'standby-pool-a',
    attachedTo: 'Unassigned',
  },
]

function resolvePoolForAddress(
  pools: readonly ExternalIpPool[],
  address: string,
): ExternalIpPool | null {
  return (
    pools.find((entry) => {
      const [network] = entry.cidr.split('/')
      const prefix = network.split('.').slice(0, 3).join('.')
      return address.startsWith(prefix)
    }) ?? null
  )
}

export function generateExternalIpId(): string {
  return `eip-${Math.random().toString(36).slice(2, 10)}`
}

export function getUsedExternalIpAddresses(ips: readonly ExternalIp[]): Set<string> {
  return new Set(ips.map((entry) => entry.address))
}

export function allocateExternalIpAddress(
  pool: ExternalIpPool,
  usedAddresses: ReadonlySet<string>,
): string {
  const cidr = pool.cidr.trim()
  const slashIndex = cidr.lastIndexOf('/')
  if (slashIndex === -1) {
    throw new Error('Invalid pool CIDR')
  }

  const prefix = Number.parseInt(cidr.slice(slashIndex + 1), 10)
  const network = cidr.slice(0, slashIndex)
  const octets = network.split('.').map((part) => Number.parseInt(part, 10))

  if (octets.length !== 4 || octets.some((part) => !Number.isFinite(part))) {
    throw new Error('Unsupported pool CIDR for demo allocation')
  }

  const startHost = prefix >= 31 ? 0 : 1
  const endHost = prefix >= 31 ? 2 ** (32 - prefix) - 1 : 254

  for (let host = startHost; host <= endHost; host += 1) {
    const address = `${octets[0]}.${octets[1]}.${octets[2]}.${host}`
    if (!usedAddresses.has(address)) {
      return address
    }
  }

  throw new Error('No addresses available in this pool')
}

export function createAllocatedExternalIp(
  pool: ExternalIpPool,
  usedAddresses: ReadonlySet<string>,
): ExternalIp {
  return {
    id: generateExternalIpId(),
    address: allocateExternalIpAddress(pool, usedAddresses),
    family: pool.ipFamily === 'IPv6' ? 'IPv6' : 'IPv4',
    status: 'Available',
    poolId: pool.id,
    poolName: pool.name,
    attachedTo: 'Unassigned',
  }
}

/** Demo inventory of individual external addresses derived from NAT gateways and seed data. */
export function getExternalIps(
  virtualNetworks: readonly ProviderVirtualNetwork[],
  pools: readonly ExternalIpPool[],
  extraIps: readonly ExternalIp[] = [],
): ExternalIp[] {
  const poolIds = new Set(pools.map((pool) => pool.id))
  const natIps = virtualNetworks
    .filter(hasVirtualNetworkNatGateway)
    .map((network) => {
      const pool = resolvePoolForAddress(pools, network.natGateway.publicIp)

      return {
        id: `eip-${network.natGateway.id}`,
        address: network.natGateway.publicIp,
        family: 'IPv4' as const,
        status: 'In use' as const,
        poolId: pool?.id ?? null,
        poolName: pool?.name ?? null,
        attachedTo: `NAT gateway · ${network.name}`,
      }
    })

  const natAddresses = new Set(natIps.map((entry) => entry.address))
  const seeded = DEMO_EXTERNAL_IPS.filter(
    (entry) =>
      !natAddresses.has(entry.address) && entry.poolId !== null && poolIds.has(entry.poolId),
  )
  const persisted = extraIps.filter((entry) => !natAddresses.has(entry.address))
  const seen = new Set<string>()

  return [...natIps, ...seeded, ...persisted].filter((entry) => {
    if (seen.has(entry.address)) {
      return false
    }

    seen.add(entry.address)
    return true
  })
}

export function groupExternalIpsByPool(
  pools: readonly ExternalIpPool[],
  virtualNetworks: readonly ProviderVirtualNetwork[],
  extraIps: readonly ExternalIp[] = [],
): ExternalIpPoolGroup[] {
  const ips = getExternalIps(virtualNetworks, pools, extraIps)

  return pools.map((pool) => ({
    pool,
    ips: ips.filter((ip) => ip.poolId === pool.id),
  }))
}

/** Tenant External IPs — only addresses the tenant has explicitly created. */
export function groupTenantExternalIpsByPool(
  pools: readonly ExternalIpPool[],
  ips: readonly ExternalIp[],
): ExternalIpPoolGroup[] {
  return pools.map((pool) => ({
    pool,
    ips: ips.filter((ip) => ip.poolId === pool.id),
  }))
}

export function getExternalIpStatusLabelColor(status: ExternalIpStatus): 'blue' | 'purple' {
  return status === 'In use' ? 'blue' : 'purple'
}

export function groupExternalIpsByStatus(ips: readonly ExternalIp[]): {
  inUse: ExternalIp[]
  available: ExternalIp[]
} {
  const inUse: ExternalIp[] = []
  const available: ExternalIp[] = []

  for (const ip of ips) {
    if (ip.status === 'In use') {
      inUse.push(ip)
    } else {
      available.push(ip)
    }
  }

  return { inUse, available }
}

/** Tenant-managed addresses may be released when not attached to a workload. */
export function canReleaseTenantExternalIp(ip: ExternalIp): boolean {
  return ip.status === 'Available'
}

export type ExternalIpAttachmentKind =
  | 'baremetal'
  | 'virtual-machine'
  | 'cluster'
  | 'models'
  | 'nat-gateway'

export type ExternalIpAttachmentMeta = {
  kind: ExternalIpAttachmentKind
  kindLabel: string
  name: string
}

const EXTERNAL_IP_ATTACHMENT_PREFIXES: Record<
  string,
  Pick<ExternalIpAttachmentMeta, 'kind' | 'kindLabel'>
> = {
  'Bare metal': { kind: 'baremetal', kindLabel: 'Bare metal' },
  'Virtual machine': { kind: 'virtual-machine', kindLabel: 'Virtual machine' },
  Cluster: { kind: 'cluster', kindLabel: 'Cluster' },
  Models: { kind: 'models', kindLabel: 'Models' },
  'NAT gateway': { kind: 'nat-gateway', kindLabel: 'NAT gateway' },
}

const EXTERNAL_IP_ATTACHMENT_SEPARATOR = ' · '

export const EXTERNAL_IP_ATTACHMENT_SERVICE_IDS: Partial<
  Record<ExternalIpAttachmentKind, CatalogServiceId>
> = {
  baremetal: 'baremetal',
  'virtual-machine': 'virtual-machine',
  cluster: 'cluster',
  models: 'models',
}

export function findTenantInstanceForExternalIpAttachment(
  instances: readonly TenantInstance[],
  meta: ExternalIpAttachmentMeta,
): TenantInstance | null {
  const serviceId = EXTERNAL_IP_ATTACHMENT_SERVICE_IDS[meta.kind]
  if (!serviceId) {
    return null
  }

  return (
    instances.find(
      (instance) =>
        instance.name === meta.name && getTenantInstanceServiceId(instance) === serviceId,
    ) ?? null
  )
}

export function parseExternalIpAttachment(attachment: string): ExternalIpAttachmentMeta | null {
  const trimmed = attachment.trim()
  if (!trimmed || trimmed === 'Unassigned') {
    return null
  }

  const separatorIndex = trimmed.indexOf(EXTERNAL_IP_ATTACHMENT_SEPARATOR)
  if (separatorIndex === -1) {
    return null
  }

  const prefix = trimmed.slice(0, separatorIndex)
  const name = trimmed.slice(separatorIndex + EXTERNAL_IP_ATTACHMENT_SEPARATOR.length).trim()
  const mapping = EXTERNAL_IP_ATTACHMENT_PREFIXES[prefix]

  if (!mapping || !name) {
    return null
  }

  return {
    ...mapping,
    name,
  }
}

/** Parsed attachment metadata only when the IP is actively in use. */
export function getExternalIpAttachmentMeta(ip: ExternalIp): ExternalIpAttachmentMeta | null {
  if (ip.status !== 'In use') {
    return null
  }

  return parseExternalIpAttachment(ip.attachedTo)
}

/** Returns workload attachment text only when the IP is actively in use. */
export function getExternalIpAttachmentLabel(ip: ExternalIp): string | null {
  const meta = getExternalIpAttachmentMeta(ip)
  if (!meta) {
    return null
  }

  return `${meta.kindLabel}${EXTERNAL_IP_ATTACHMENT_SEPARATOR}${meta.name}`
}
