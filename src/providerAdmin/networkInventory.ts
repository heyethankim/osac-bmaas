/** Provider-managed network inventory used by catalog defaults and tenant overrides. */

export type NetworkInventoryOption = {
  id: string
  name: string
  detail: string
}

export type ProviderVirtualNetwork = {
  id: string
  name: string
  detail: string
  /** IPv4 CIDR block for the virtual network. */
  cidr: string
  /** IPv6 CIDR block for the virtual network. Optional. */
  ipv6Cidr?: string
  /** @deprecated Kept for older stored inventory; no longer shown in the UI. */
  dataCenter?: string
  createdAt: string
}

export type ProviderSubnet = {
  id: string
  name: string
  detail: string
  cidr: string
  vlan: string
  virtualNetworkId: string
  createdAt: string
}

export type ProviderSecurityGroup = {
  id: string
  name: string
  detail: string
  virtualNetworkId: string
  /** Summary of inbound allow rules shown in inventory tables. */
  inboundRules: string
  /** Summary of outbound allow rules shown in inventory tables. */
  outboundRules: string
  createdAt: string
}

export const NETWORK_INVENTORY_DATA_CENTERS = ['EU-West-1-DC-A', 'US-East-1-DC-B'] as const

export const DEFAULT_PROVIDER_VIRTUAL_NETWORKS: ProviderVirtualNetwork[] = [
  {
    id: 'vnet-tenant-workload',
    name: 'Tenant workload VNet',
    detail: 'Primary tenant compute network',
    cidr: '10.42.0.0/16',
    ipv6Cidr: '2001:db8:42::/48',
    dataCenter: 'EU-West-1-DC-A',
    createdAt: '2026-07-01T09:00:00.000Z',
  },
  {
    id: 'vnet-shared-services',
    name: 'Shared services VNet',
    detail: 'Provider-managed shared services',
    cidr: '10.50.0.0/16',
    ipv6Cidr: '2001:db8:50::/48',
    dataCenter: 'EU-West-1-DC-A',
    createdAt: '2026-07-01T09:00:00.000Z',
  },
]

export const DEFAULT_PROVIDER_SUBNETS: ProviderSubnet[] = [
  {
    id: 'subnet-bm-compute-a',
    name: 'bm-compute-a',
    detail: '10.42.0.0/24 · VLAN 200',
    cidr: '10.42.0.0/24',
    vlan: '200',
    virtualNetworkId: 'vnet-tenant-workload',
    createdAt: '2026-07-01T09:00:00.000Z',
  },
  {
    id: 'subnet-bm-compute-b',
    name: 'bm-compute-b',
    detail: '10.42.1.0/24 · VLAN 201',
    cidr: '10.42.1.0/24',
    vlan: '201',
    virtualNetworkId: 'vnet-tenant-workload',
    createdAt: '2026-07-01T09:00:00.000Z',
  },
  {
    id: 'subnet-shared-services-a',
    name: 'shared-services-a',
    detail: '10.50.0.0/24 · VLAN 300',
    cidr: '10.50.0.0/24',
    vlan: '300',
    virtualNetworkId: 'vnet-shared-services',
    createdAt: '2026-07-01T09:00:00.000Z',
  },
]

export const DEFAULT_PROVIDER_SECURITY_GROUPS: ProviderSecurityGroup[] = [
  {
    id: 'sg-allow-ssh-https',
    name: 'allow-ssh-https',
    detail: 'SSH + HTTPS ingress',
    virtualNetworkId: 'vnet-tenant-workload',
    inboundRules: 'SSH (22), HTTPS (443)',
    outboundRules: 'Allow all',
    createdAt: '2026-07-01T09:00:00.000Z',
  },
  {
    id: 'sg-restricted-egress',
    name: 'restricted-egress',
    detail: 'Deny all egress except registry',
    virtualNetworkId: 'vnet-shared-services',
    inboundRules: 'None',
    outboundRules: 'Registry (443)',
    createdAt: '2026-07-01T09:00:00.000Z',
  },
]

export function generateProviderVirtualNetworkId(): string {
  return `vnet_${Math.random().toString(36).slice(2, 8)}`
}

export function generateProviderSubnetId(): string {
  return `subnet_${Math.random().toString(36).slice(2, 8)}`
}

export function generateProviderSecurityGroupId(): string {
  return `sg_${Math.random().toString(36).slice(2, 8)}`
}

export function toCatalogNetworkOption(resource: {
  id: string
  name: string
  detail: string
}): NetworkInventoryOption {
  return {
    id: resource.id,
    name: resource.name,
    detail: resource.detail,
  }
}

export function getSubnetsForVirtualNetwork(
  subnets: readonly ProviderSubnet[],
  virtualNetworkId: string,
): ProviderSubnet[] {
  return subnets.filter((subnet) => subnet.virtualNetworkId === virtualNetworkId)
}

export function getSecurityGroupsForVirtualNetwork(
  securityGroups: readonly ProviderSecurityGroup[],
  virtualNetworkId: string,
): ProviderSecurityGroup[] {
  return securityGroups.filter((group) => group.virtualNetworkId === virtualNetworkId)
}

export function formatSubnetDetail(cidr: string, vlan: string): string {
  return `${cidr} · VLAN ${vlan}`
}
