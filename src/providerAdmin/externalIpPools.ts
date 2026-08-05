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

export const EXTERNAL_IP_POOL_DATA_CENTERS = ['eu-west-1-dc-a', 'us-east-1-dc-b'] as const

export const DEFAULT_EXTERNAL_IP_POOLS: ExternalIpPool[] = [
  {
    id: 'eipool-northstar-edge',
    name: 'northstar-public-edge',
    cidr: '203.0.113.0/24',
    dataCenter: 'eu-west-1-dc-a',
    totalAddresses: 254,
    assignedOrganizationId: null,
    assignedOrganizationName: null,
    createdAt: '2026-07-01T09:00:00.000Z',
  },
  {
    id: 'eipool-standby-a',
    name: 'standby-pool-a',
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

export function getExternalIpPoolById(
  pools: ExternalIpPool[],
  poolId: string,
): ExternalIpPool | null {
  return pools.find((pool) => pool.id === poolId) ?? null
}
