import type { ExternalIpPool } from './externalIpPools'
import type { ProviderVirtualNetwork } from './networkInventory'
import { hasVirtualNetworkNatGateway } from './networkInventory'

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

const DEMO_EXTERNAL_IPS: ExternalIp[] = [
  {
    id: 'eip-standby-northsummit',
    address: '203.0.113.45',
    family: 'IPv4',
    status: 'Available',
    poolId: 'eipool-northsummit-edge',
    poolName: 'northsummit-public-edge',
    attachedTo: 'Unassigned',
  },
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

/** Demo inventory of individual external addresses derived from NAT gateways and seed data. */
export function getExternalIps(
  virtualNetworks: readonly ProviderVirtualNetwork[],
  pools: readonly ExternalIpPool[],
): ExternalIp[] {
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
  const seeded = DEMO_EXTERNAL_IPS.filter((entry) => !natAddresses.has(entry.address))

  return [...natIps, ...seeded]
}

export function groupExternalIpsByPool(
  pools: readonly ExternalIpPool[],
  virtualNetworks: readonly ProviderVirtualNetwork[],
): ExternalIpPoolGroup[] {
  const ips = getExternalIps(virtualNetworks, pools)

  return pools.map((pool) => ({
    pool,
    ips: ips.filter((ip) => ip.poolId === pool.id),
  }))
}

export function getExternalIpStatusLabelColor(status: ExternalIpStatus): 'blue' | 'green' {
  return status === 'In use' ? 'blue' : 'green'
}
