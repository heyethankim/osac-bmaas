export type ExternalIpPoolIpFamily = 'IPv4' | 'IPv6'

export type ExternalIpPool = {
  id: string
  name: string
  description?: string
  ipFamily?: ExternalIpPoolIpFamily
  cidrs?: string[]
  cidr: string
  dataCenter: string
  totalAddresses: number
  assignedOrganizationId: string | null
  assignedOrganizationName: string | null
  createdAt: string
}

export const DEFAULT_PROVIDER_EXTERNAL_IP_POOL_IPV4_CIDR = '203.0.113.0/26'
export const DEFAULT_PROVIDER_EXTERNAL_IP_POOL_IPV6_CIDR = '2001:db8::/32'
export const DEFAULT_PROVIDER_EXTERNAL_IP_POOL_NAME = 'harborline-capital-public-edge'
export const DEFAULT_PROVIDER_EXTERNAL_IP_POOL_DESCRIPTION =
  'Routable address pool for Harborline Capital tenant edge exposure.'
export const DEFAULT_NORTHSUMMIT_EXTERNAL_IP_POOL_DESCRIPTION =
  'Routable address pool for North Summit Bank tenant edge exposure.'
export const DEFAULT_NORTHSUMMIT_RESERVED_EXTERNAL_IP_POOL_DESCRIPTION =
  'Secondary routable address pool for North Summit Bank reserved and failover allocations.'

export function getExternalIpPoolDefaultDescription(pool: ExternalIpPool): string {
  if (pool.id === 'eipool-northsummit-edge' || pool.name === 'northsummit-public-edge') {
    return DEFAULT_NORTHSUMMIT_EXTERNAL_IP_POOL_DESCRIPTION
  }

  if (
    pool.id === 'eipool-northsummit-reserved' ||
    pool.name === 'northsummit-reserved-edge'
  ) {
    return DEFAULT_NORTHSUMMIT_RESERVED_EXTERNAL_IP_POOL_DESCRIPTION
  }

  if (
    pool.id === 'eipool-standby-a' ||
    pool.name === 'standby-pool-a' ||
    pool.name === DEFAULT_PROVIDER_EXTERNAL_IP_POOL_NAME
  ) {
    return DEFAULT_PROVIDER_EXTERNAL_IP_POOL_DESCRIPTION
  }

  return DEFAULT_PROVIDER_EXTERNAL_IP_POOL_DESCRIPTION
}

export function getDefaultExternalIpPoolCidr(ipFamily: ExternalIpPoolIpFamily): string {
  return ipFamily === 'IPv6'
    ? DEFAULT_PROVIDER_EXTERNAL_IP_POOL_IPV6_CIDR
    : DEFAULT_PROVIDER_EXTERNAL_IP_POOL_IPV4_CIDR
}

export function getDefaultExternalIpPoolCidrs(ipFamily: ExternalIpPoolIpFamily): string[] {
  if (ipFamily === 'IPv6') {
    return [DEFAULT_PROVIDER_EXTERNAL_IP_POOL_IPV6_CIDR, '2001:db8:1::/48']
  }

  return [DEFAULT_PROVIDER_EXTERNAL_IP_POOL_IPV4_CIDR, '203.0.113.64/26']
}

const PROVIDER_EXTERNAL_IP_POOL_IPV4_BASES = ['203.0.113', '198.51.100', '192.0.2'] as const

function normalizeExternalIpPoolCidr(cidr: string): string {
  return cidr.trim()
}

export function suggestNextExternalIpPoolCidr(
  ipFamily: ExternalIpPoolIpFamily,
  existingCidrs: readonly string[],
): string {
  const used = new Set(
    existingCidrs.map(normalizeExternalIpPoolCidr).filter(Boolean),
  )

  if (ipFamily === 'IPv6') {
    for (let index = 0; index < 16; index += 1) {
      const candidate =
        index === 0 ? DEFAULT_PROVIDER_EXTERNAL_IP_POOL_IPV6_CIDR : `2001:db8:${index}::/48`
      if (!used.has(candidate)) {
        return candidate
      }
    }

    return DEFAULT_PROVIDER_EXTERNAL_IP_POOL_IPV6_CIDR
  }

  for (const base of PROVIDER_EXTERNAL_IP_POOL_IPV4_BASES) {
    for (let slot = 0; slot < 4; slot += 1) {
      const candidate = `${base}.${slot * 64}/26`
      if (!used.has(candidate)) {
        return candidate
      }
    }
  }

  return DEFAULT_PROVIDER_EXTERNAL_IP_POOL_IPV4_CIDR
}

export function getExternalIpPoolCidrs(pool: ExternalIpPool): string[] {
  if (pool.cidrs?.length) {
    return pool.cidrs
  }

  return pool.cidr ? [pool.cidr] : []
}

export function getExternalIpPoolIpFamilyLabel(
  ipFamily: ExternalIpPoolIpFamily | undefined,
): string {
  return ipFamily === 'IPv6' ? 'IPv6' : 'IPv4'
}

export function countHostAddressesInCidr(
  cidr: string,
  ipFamily: ExternalIpPoolIpFamily = 'IPv4',
): number {
  const trimmed = cidr.trim()
  const slashIndex = trimmed.lastIndexOf('/')
  if (slashIndex === -1) {
    return 0
  }

  const prefix = Number.parseInt(trimmed.slice(slashIndex + 1), 10)
  if (!Number.isFinite(prefix)) {
    return 0
  }

  if (ipFamily === 'IPv6') {
    const hostBits = 128 - prefix
    if (hostBits >= 16) {
      return 65_536
    }

    return 2 ** hostBits
  }

  if (prefix >= 32) {
    return 1
  }

  if (prefix >= 31) {
    return 2 ** (32 - prefix)
  }

  return Math.max(2 ** (32 - prefix) - 2, 0)
}

export function getExternalIpPoolTotalAddresses(pool: ExternalIpPool): number {
  if (usesProviderExternalIpPoolModel(pool)) {
    const ipFamily = pool.ipFamily ?? 'IPv4'

    return getExternalIpPoolCidrs(pool).reduce(
      (sum, cidr) => sum + countHostAddressesInCidr(cidr, ipFamily),
      0,
    )
  }

  return pool.totalAddresses
}

export function getExternalIpPoolAvailableAddresses(
  pool: ExternalIpPool,
  inUseCount = 0,
): number {
  return Math.max(getExternalIpPoolTotalAddresses(pool) - inUseCount, 0)
}

export type ExternalIpPoolLifecycleStatus = 'Unassigned' | 'Ready'

export function getExternalIpPoolLifecycleStatus(
  pool: ExternalIpPool,
): ExternalIpPoolLifecycleStatus {
  return pool.assignedOrganizationId !== null ? 'Ready' : 'Unassigned'
}

export function getExternalIpPoolLifecycleStatusLabelColor(
  status: ExternalIpPoolLifecycleStatus,
): 'blue' | 'green' {
  return status === 'Ready' ? 'green' : 'blue'
}

export function formatExternalIpPoolCidrs(pool: ExternalIpPool): string {
  return getExternalIpPoolCidrs(pool).join(', ')
}

export function usesProviderExternalIpPoolModel(pool: ExternalIpPool): boolean {
  return Boolean(pool.ipFamily || pool.cidrs?.length || pool.description)
}

export const EXTERNAL_IP_POOL_DATA_CENTERS = ['eu-west-1-dc-a', 'us-east-1-dc-b'] as const

export const DEMO_NORTH_SUMMIT_EXTERNAL_IP_POOL_ASSIGNMENT = {
  assignedOrganizationId: 'org-northsummit-bank',
  assignedOrganizationName: 'North Summit Bank',
} as const

export const DEFAULT_EXTERNAL_IP_POOLS: ExternalIpPool[] = [
  {
    id: 'eipool-northsummit-edge',
    name: 'northsummit-public-edge',
    description: DEFAULT_NORTHSUMMIT_EXTERNAL_IP_POOL_DESCRIPTION,
    cidr: '203.0.113.0/24',
    dataCenter: 'eu-west-1-dc-a',
    totalAddresses: 254,
    ...DEMO_NORTH_SUMMIT_EXTERNAL_IP_POOL_ASSIGNMENT,
    createdAt: '2026-07-01T09:00:00.000Z',
  },
  {
    id: 'eipool-northsummit-reserved',
    name: 'northsummit-reserved-edge',
    description: DEFAULT_NORTHSUMMIT_RESERVED_EXTERNAL_IP_POOL_DESCRIPTION,
    cidr: '198.51.100.64/26',
    dataCenter: 'us-east-1-dc-b',
    totalAddresses: 62,
    ...DEMO_NORTH_SUMMIT_EXTERNAL_IP_POOL_ASSIGNMENT,
    createdAt: '2026-08-15T10:00:00.000Z',
  },
  {
    id: 'eipool-standby-a',
    name: 'standby-pool-a',
    description: DEFAULT_PROVIDER_EXTERNAL_IP_POOL_DESCRIPTION,
    cidr: '198.51.100.0/26',
    dataCenter: 'eu-west-1-dc-a',
    totalAddresses: 62,
    assignedOrganizationId: null,
    assignedOrganizationName: null,
    createdAt: '2026-07-01T09:00:00.000Z',
  },
]

export function generateExternalIpPoolId(): string {
  const suffix = Math.random().toString(36).slice(2, 8)
  return `eipool-${suffix}`
}

export function getAssignableExternalIpPools(pools: ExternalIpPool[]): ExternalIpPool[] {
  return pools.filter((pool) => pool.assignedOrganizationId === null)
}

export function getExternalIpPoolsAssignedToOrganization(
  pools: readonly ExternalIpPool[],
  organizationId: string,
): ExternalIpPool[] {
  return pools.filter((pool) => pool.assignedOrganizationId === organizationId)
}

export function getExternalIpPoolById(
  pools: ExternalIpPool[],
  poolId: string,
): ExternalIpPool | null {
  return pools.find((pool) => pool.id === poolId) ?? null
}
