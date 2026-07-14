export type ExternalIpPool = {
  id: string
  name: string
  cidr: string
  dataCenter: string
  totalAddresses: number
  assignedOrganizationId: string | null
  assignedOrganizationName: string | null
  createdAt: string
}

export const EXTERNAL_IP_POOL_DATA_CENTERS = ['EU-West-1-DC-A', 'US-East-1-DC-B'] as const

export const DEFAULT_EXTERNAL_IP_POOLS: ExternalIpPool[] = [
  {
    id: 'eipool-northstar-edge',
    name: 'Northstar public edge',
    cidr: '203.0.113.0/24',
    dataCenter: 'EU-West-1-DC-A',
    totalAddresses: 254,
    assignedOrganizationId: null,
    assignedOrganizationName: null,
    createdAt: '2026-07-01T09:00:00.000Z',
  },
  {
    id: 'eipool-standby-a',
    name: 'Standby pool A',
    cidr: '198.51.100.0/26',
    dataCenter: 'EU-West-1-DC-A',
    totalAddresses: 62,
    assignedOrganizationId: null,
    assignedOrganizationName: null,
    createdAt: '2026-07-01T09:00:00.000Z',
  },
]

export function generateExternalIpPoolId(): string {
  const suffix = Math.random().toString(36).slice(2, 8)
  return `eipool_${suffix}`
}

export function getAssignableExternalIpPools(pools: ExternalIpPool[]): ExternalIpPool[] {
  return pools.filter((pool) => pool.assignedOrganizationId === null)
}

export function getExternalIpPoolById(
  pools: ExternalIpPool[],
  poolId: string,
): ExternalIpPool | null {
  return pools.find((pool) => pool.id === poolId) ?? null
}
