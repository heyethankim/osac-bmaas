import type { ExternalIpPool } from '../providerAdmin/externalIpPools'
import type { CatalogNetworkResourceOption } from '../providerAdmin/catalogNetworkPolicy'
import type {
  ProviderSecurityGroup,
  ProviderSubnet,
  ProviderVirtualNetwork,
} from '../providerAdmin/networkInventory'
import {
  addProviderExternalIpPool,
  addProviderSecurityGroup,
  addProviderSubnet,
  addProviderVirtualNetwork,
  getCatalogExternalIpPoolOptions,
  getCatalogSecurityGroupOptions,
  getCatalogSubnetOptions,
  getCatalogVirtualNetworkOptions,
  getProviderExternalIpPools,
  getProviderSecurityGroups,
  getProviderSubnets,
  getProviderVirtualNetworks,
} from '../providerSetup/storage'
import {
  addTenantExternalIpPool,
  addTenantSecurityGroup,
  addTenantSubnet,
  addTenantVirtualNetwork,
  getTenantExternalIpPoolOptions,
  getTenantExternalIpPools,
  getTenantSecurityGroupOptions,
  getTenantSecurityGroups,
  getTenantSubnetOptions,
  getTenantSubnets,
  getTenantVirtualNetworkOptions,
  getTenantVirtualNetworks,
} from '../tenantAdmin/networkInventoryStorage'

export type NetworkInventoryScope = {
  mode: 'provider' | 'tenant'
  tenantSlug?: string
  getVirtualNetworks: () => ProviderVirtualNetwork[]
  getSubnets: () => ProviderSubnet[]
  getSecurityGroups: () => ProviderSecurityGroup[]
  getExternalIpPools: () => ExternalIpPool[]
  addVirtualNetwork: (network: ProviderVirtualNetwork) => void
  addSubnet: (subnet: ProviderSubnet) => void
  addSecurityGroup: (group: ProviderSecurityGroup) => void
  addExternalIpPool: (pool: ExternalIpPool) => void
  getVirtualNetworkOptions: () => readonly CatalogNetworkResourceOption[]
  getSubnetOptions: (virtualNetworkId?: string) => readonly CatalogNetworkResourceOption[]
  getSecurityGroupOptions: () => readonly CatalogNetworkResourceOption[]
  getExternalIpPoolOptions: () => readonly CatalogNetworkResourceOption[]
}

export function resolveNetworkInventoryScope(
  tenantSlug?: string | null,
): NetworkInventoryScope {
  if (tenantSlug) {
    return {
      mode: 'tenant',
      tenantSlug,
      getVirtualNetworks: () => getTenantVirtualNetworks(tenantSlug),
      getSubnets: () => getTenantSubnets(tenantSlug),
      getSecurityGroups: () => getTenantSecurityGroups(tenantSlug),
      getExternalIpPools: () => getTenantExternalIpPools(tenantSlug),
      addVirtualNetwork: (network) => addTenantVirtualNetwork(tenantSlug, network),
      addSubnet: (subnet) => addTenantSubnet(tenantSlug, subnet),
      addSecurityGroup: (group) => addTenantSecurityGroup(tenantSlug, group),
      addExternalIpPool: (pool) => addTenantExternalIpPool(tenantSlug, pool),
      getVirtualNetworkOptions: () => getTenantVirtualNetworkOptions(tenantSlug),
      getSubnetOptions: (virtualNetworkId) =>
        getTenantSubnetOptions(tenantSlug, virtualNetworkId),
      getSecurityGroupOptions: () => getTenantSecurityGroupOptions(tenantSlug),
      getExternalIpPoolOptions: () => getTenantExternalIpPoolOptions(tenantSlug),
    }
  }

  return {
    mode: 'provider',
    getVirtualNetworks: getProviderVirtualNetworks,
    getSubnets: getProviderSubnets,
    getSecurityGroups: getProviderSecurityGroups,
    getExternalIpPools: getProviderExternalIpPools,
    addVirtualNetwork: addProviderVirtualNetwork,
    addSubnet: addProviderSubnet,
    addSecurityGroup: addProviderSecurityGroup,
    addExternalIpPool: addProviderExternalIpPool,
    getVirtualNetworkOptions: getCatalogVirtualNetworkOptions,
    getSubnetOptions: getCatalogSubnetOptions,
    getSecurityGroupOptions: getCatalogSecurityGroupOptions,
    getExternalIpPoolOptions: getCatalogExternalIpPoolOptions,
  }
}
