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
  deleteProviderExternalIpPool,
  deleteProviderSecurityGroup,
  deleteProviderSubnet,
  getCatalogExternalIpPoolOptions,
  getCatalogSecurityGroupOptions,
  getCatalogSubnetOptions,
  getCatalogVirtualNetworkOptions,
  getProviderExternalIpPools,
  getProviderSecurityGroups,
  getProviderSubnets,
  getProviderVirtualNetworks,
  updateProviderExternalIpPool,
  updateProviderSecurityGroup,
  updateProviderSubnet,
  updateProviderVirtualNetwork,
} from '../providerSetup/storage'
import {
  addTenantExternalIpPool,
  addTenantSecurityGroup,
  addTenantSubnet,
  addTenantVirtualNetwork,
  deleteTenantExternalIpPool,
  deleteTenantSecurityGroup,
  deleteTenantSubnet,
  getTenantExternalIpPoolOptions,
  getTenantExternalIpPools,
  getTenantSecurityGroupOptions,
  getTenantSecurityGroups,
  getTenantSubnetOptions,
  getTenantSubnets,
  getTenantVirtualNetworkOptions,
  getTenantVirtualNetworks,
  updateTenantExternalIpPool,
  updateTenantSecurityGroup,
  updateTenantSubnet,
  updateTenantVirtualNetwork,
} from '../tenantAdmin/networkInventoryStorage'

export type NetworkInventoryScope = {
  mode: 'provider' | 'tenant'
  tenantSlug?: string
  getVirtualNetworks: () => ProviderVirtualNetwork[]
  getSubnets: () => ProviderSubnet[]
  getSecurityGroups: () => ProviderSecurityGroup[]
  getExternalIpPools: () => ExternalIpPool[]
  addVirtualNetwork: (network: ProviderVirtualNetwork) => void
  updateVirtualNetwork: (network: ProviderVirtualNetwork) => void
  addSubnet: (subnet: ProviderSubnet) => void
  updateSubnet: (subnet: ProviderSubnet) => void
  deleteSubnet: (subnetId: string) => void
  addSecurityGroup: (group: ProviderSecurityGroup) => void
  updateSecurityGroup: (group: ProviderSecurityGroup) => void
  deleteSecurityGroup: (groupId: string) => void
  addExternalIpPool: (pool: ExternalIpPool) => void
  updateExternalIpPool: (pool: ExternalIpPool) => void
  deleteExternalIpPool: (poolId: string) => void
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
      updateVirtualNetwork: (network) => updateTenantVirtualNetwork(tenantSlug, network),
      addSubnet: (subnet) => addTenantSubnet(tenantSlug, subnet),
      updateSubnet: (subnet) => updateTenantSubnet(tenantSlug, subnet),
      deleteSubnet: (subnetId) => deleteTenantSubnet(tenantSlug, subnetId),
      addSecurityGroup: (group) => addTenantSecurityGroup(tenantSlug, group),
      updateSecurityGroup: (group) => updateTenantSecurityGroup(tenantSlug, group),
      deleteSecurityGroup: (groupId) => deleteTenantSecurityGroup(tenantSlug, groupId),
      addExternalIpPool: (pool) => addTenantExternalIpPool(tenantSlug, pool),
      updateExternalIpPool: (pool) => updateTenantExternalIpPool(tenantSlug, pool),
      deleteExternalIpPool: (poolId) => deleteTenantExternalIpPool(tenantSlug, poolId),
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
    updateVirtualNetwork: updateProviderVirtualNetwork,
    addSubnet: addProviderSubnet,
    updateSubnet: updateProviderSubnet,
    deleteSubnet: deleteProviderSubnet,
    addSecurityGroup: addProviderSecurityGroup,
    updateSecurityGroup: updateProviderSecurityGroup,
    deleteSecurityGroup: deleteProviderSecurityGroup,
    addExternalIpPool: addProviderExternalIpPool,
    updateExternalIpPool: updateProviderExternalIpPool,
    deleteExternalIpPool: deleteProviderExternalIpPool,
    getVirtualNetworkOptions: getCatalogVirtualNetworkOptions,
    getSubnetOptions: getCatalogSubnetOptions,
    getSecurityGroupOptions: getCatalogSecurityGroupOptions,
    getExternalIpPoolOptions: getCatalogExternalIpPoolOptions,
  }
}
