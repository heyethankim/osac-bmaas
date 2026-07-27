import type { CatalogNetworkPolicy, CatalogNetworkPolicyField } from '../providerAdmin/catalogNetworkPolicy'
import {
  DEFAULT_CATALOG_NETWORK_POLICY,
  getCatalogNetworkOptionLabel,
  resolveCatalogNetworkPolicyField,
  type CatalogNetworkResourceOption,
} from '../providerAdmin/catalogNetworkPolicy'
import type { RegisteredOrganization } from '../providerAdmin/organizations'
import type { ProviderCatalogDraft } from '../providerSetup/storage'
import {
  getCatalogItemNetworkPolicy,
  getCatalogSecurityGroupOptions,
  getCatalogSubnetOptions,
  getCatalogVirtualNetworkOptions,
  getProviderCatalogItems,
} from '../providerSetup/storage'

export type TenantNetworkResourceKind = 'virtual-network' | 'subnet' | 'security-group'

export type TenantNetworkOverrides = {
  virtualNetworkId?: string
  subnetId?: string
  securityGroupId?: string
}

const TENANT_NETWORK_OVERRIDES_KEY_PREFIX = 'bmaas-tenant-network-overrides-'

function getOverridesKey(slug: string): string {
  return `${TENANT_NETWORK_OVERRIDES_KEY_PREFIX}${slug}`
}

function isTenantNetworkOverrides(value: unknown): value is TenantNetworkOverrides {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const overrides = value as TenantNetworkOverrides
  return (
    (overrides.virtualNetworkId === undefined || typeof overrides.virtualNetworkId === 'string') &&
    (overrides.subnetId === undefined || typeof overrides.subnetId === 'string') &&
    (overrides.securityGroupId === undefined || typeof overrides.securityGroupId === 'string')
  )
}

export function getTenantNetworkOverrides(slug: string): TenantNetworkOverrides {
  try {
    const raw = sessionStorage.getItem(getOverridesKey(slug))
    if (!raw) {
      return {}
    }
    const parsed: unknown = JSON.parse(raw)
    return isTenantNetworkOverrides(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export function setTenantNetworkOverrides(
  slug: string,
  overrides: TenantNetworkOverrides,
): TenantNetworkOverrides {
  try {
    sessionStorage.setItem(getOverridesKey(slug), JSON.stringify(overrides))
  } catch {
    /* demo storage unavailable */
  }
  return overrides
}

export function applyTenantNetworkOverrides(
  policy: CatalogNetworkPolicy,
  overrides: TenantNetworkOverrides,
): CatalogNetworkPolicy {
  if (!policy.enabled) {
    return policy
  }

  const virtualNetwork = resolveEffectiveNetworkField(
    policy.virtualNetwork,
    getCatalogVirtualNetworkOptions(),
    overrides.virtualNetworkId,
  )
  const subnet = resolveEffectiveNetworkField(
    policy.subnet,
    getCatalogSubnetOptions(virtualNetwork.id),
    overrides.subnetId,
  )
  const securityGroup = resolveEffectiveNetworkField(
    policy.securityGroup,
    getCatalogSecurityGroupOptions(),
    overrides.securityGroupId,
  )

  return {
    ...policy,
    virtualNetwork,
    subnet,
    securityGroup,
  }
}

export function resolveCatalogNetworkPolicyForOrganization(
  organization: RegisteredOrganization,
  catalogDraft: ProviderCatalogDraft | null,
): CatalogNetworkPolicy {
  let base: CatalogNetworkPolicy = DEFAULT_CATALOG_NETWORK_POLICY

  if (organization.catalogItemId) {
    const assigned = getProviderCatalogItems().find(
      (item) => item.catalogItemId === organization.catalogItemId,
    )
    if (assigned) {
      base = getCatalogItemNetworkPolicy(assigned)
    } else if (catalogDraft) {
      base = getCatalogItemNetworkPolicy(catalogDraft)
    }
  } else if (catalogDraft) {
    base = getCatalogItemNetworkPolicy(catalogDraft)
  }

  return applyTenantNetworkOverrides(base, getTenantNetworkOverrides(organization.slug))
}

export function getTenantNetworkResourceMeta(
  kind: TenantNetworkResourceKind,
  virtualNetworkId?: string,
): {
  title: string
  fieldLabel: string
  lede: string
  fieldKey: 'virtualNetwork' | 'subnet' | 'securityGroup'
  overrideKey: keyof TenantNetworkOverrides
  options: readonly CatalogNetworkResourceOption[]
} {
  switch (kind) {
    case 'virtual-network':
      return {
        title: 'Virtual networks',
        fieldLabel: 'Virtual network',
        lede: 'Organization virtual networks available to projects. Locked catalog defaults cannot be changed.',
        fieldKey: 'virtualNetwork',
        overrideKey: 'virtualNetworkId',
        options: getCatalogVirtualNetworkOptions(),
      }
    case 'subnet':
      return {
        title: 'Subnets',
        fieldLabel: 'Subnet',
        lede: 'Subnets within your organization networks. Locked catalog defaults cannot be changed.',
        fieldKey: 'subnet',
        overrideKey: 'subnetId',
        options: getCatalogSubnetOptions(virtualNetworkId),
      }
    case 'security-group':
      return {
        title: 'Security groups',
        fieldLabel: 'Security group',
        lede: 'Security groups that control network access for workloads. Locked catalog defaults cannot be changed.',
        fieldKey: 'securityGroup',
        overrideKey: 'securityGroupId',
        options: getCatalogSecurityGroupOptions(),
      }
  }
}

export function resolveEffectiveNetworkField(
  policyField: CatalogNetworkPolicyField,
  options: readonly CatalogNetworkResourceOption[],
  overrideId: string | undefined,
): CatalogNetworkPolicyField {
  if (policyField.locked || !overrideId) {
    return policyField
  }

  return resolveCatalogNetworkPolicyField(options, overrideId, false)
}

export function getNetworkOptionDetail(
  options: readonly CatalogNetworkResourceOption[],
  id: string,
): string {
  const option = options.find((item) => item.id === id)
  return option ? getCatalogNetworkOptionLabel(option) : id
}

export type TenantCatalogNetworkFieldSummary = {
  kind: TenantNetworkResourceKind
  label: string
  value: string
  locked: boolean
  selectedId: string
}

export function getTenantCatalogNetworkFieldSummaries(
  policy: CatalogNetworkPolicy,
): TenantCatalogNetworkFieldSummary[] {
  return [
    {
      kind: 'virtual-network',
      label: 'Virtual network',
      value: getNetworkOptionDetail(getCatalogVirtualNetworkOptions(), policy.virtualNetwork.id),
      locked: policy.virtualNetwork.locked,
      selectedId: policy.virtualNetwork.id,
    },
    {
      kind: 'subnet',
      label: 'Subnet',
      value: getNetworkOptionDetail(
        getCatalogSubnetOptions(policy.virtualNetwork.id),
        policy.subnet.id,
      ),
      locked: policy.subnet.locked,
      selectedId: policy.subnet.id,
    },
    {
      kind: 'security-group',
      label: 'Security group',
      value: getNetworkOptionDetail(getCatalogSecurityGroupOptions(), policy.securityGroup.id),
      locked: policy.securityGroup.locked,
      selectedId: policy.securityGroup.id,
    },
  ]
}

export {
  getCatalogNetworkLockSummary as getTenantNetworkLockSummary,
  type CatalogNetworkLockSummary as TenantNetworkLockSummary,
  type CatalogNetworkLockSummaryKind as TenantNetworkLockSummaryKind,
} from '../providerAdmin/catalogNetworkPolicy'
