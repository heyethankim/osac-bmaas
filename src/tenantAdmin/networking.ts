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

export type TenantNetworkLockForUsers = {
  virtualNetwork?: boolean
  subnet?: boolean
  securityGroup?: boolean
}

export type TenantNetworkOverrides = {
  virtualNetworkId?: string
  subnetId?: string
  securityGroupId?: string
  /** Narrow Provider-editable fields so tenant users cannot change them at launch. */
  lockForUsers?: TenantNetworkLockForUsers
}

export type TenantNetworkValueOverrideKey =
  | 'virtualNetworkId'
  | 'subnetId'
  | 'securityGroupId'

const TENANT_NETWORK_OVERRIDES_KEY_PREFIX = 'bmaas-tenant-network-overrides-v2-'

function getOverridesKey(slug: string): string {
  return `${TENANT_NETWORK_OVERRIDES_KEY_PREFIX}${slug}`
}

function isTenantNetworkLockForUsers(value: unknown): value is TenantNetworkLockForUsers {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const locks = value as TenantNetworkLockForUsers
  return (
    (locks.virtualNetwork === undefined || typeof locks.virtualNetwork === 'boolean') &&
    (locks.subnet === undefined || typeof locks.subnet === 'boolean') &&
    (locks.securityGroup === undefined || typeof locks.securityGroup === 'boolean')
  )
}

function isTenantNetworkOverrides(value: unknown): value is TenantNetworkOverrides {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const overrides = value as TenantNetworkOverrides
  return (
    (overrides.virtualNetworkId === undefined || typeof overrides.virtualNetworkId === 'string') &&
    (overrides.subnetId === undefined || typeof overrides.subnetId === 'string') &&
    (overrides.securityGroupId === undefined || typeof overrides.securityGroupId === 'string') &&
    (overrides.lockForUsers === undefined || isTenantNetworkLockForUsers(overrides.lockForUsers))
  )
}

function isTenantNetworkOverridesByCatalogItem(
  value: unknown,
): value is Record<string, TenantNetworkOverrides> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  return Object.entries(value).every(
    ([catalogItemId, overrides]) =>
      typeof catalogItemId === 'string' &&
      catalogItemId.length > 0 &&
      isTenantNetworkOverrides(overrides),
  )
}

function readTenantNetworkOverridesByCatalogItem(
  slug: string,
): Record<string, TenantNetworkOverrides> {
  try {
    const raw = sessionStorage.getItem(getOverridesKey(slug))
    if (!raw) {
      return {}
    }
    const parsed: unknown = JSON.parse(raw)
    return isTenantNetworkOverridesByCatalogItem(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

/** Overrides are scoped per catalog item so cards reflect each offering’s networking. */
export function getTenantNetworkOverrides(
  slug: string,
  catalogItemId?: string | null,
): TenantNetworkOverrides {
  if (!catalogItemId) {
    return {}
  }

  return readTenantNetworkOverridesByCatalogItem(slug)[catalogItemId] ?? {}
}

export function setTenantNetworkOverrides(
  slug: string,
  catalogItemId: string,
  overrides: TenantNetworkOverrides,
): TenantNetworkOverrides {
  const next = {
    ...readTenantNetworkOverridesByCatalogItem(slug),
    [catalogItemId]: overrides,
  }

  try {
    sessionStorage.setItem(getOverridesKey(slug), JSON.stringify(next))
  } catch {
    /* demo storage unavailable */
  }
  return overrides
}

function lockForUsersKey(
  kind: TenantNetworkResourceKind,
): keyof TenantNetworkLockForUsers {
  switch (kind) {
    case 'virtual-network':
      return 'virtualNetwork'
    case 'subnet':
      return 'subnet'
    case 'security-group':
      return 'securityGroup'
  }
}

export function getTenantLockForUsers(
  overrides: TenantNetworkOverrides,
  kind: TenantNetworkResourceKind,
): boolean {
  return Boolean(overrides.lockForUsers?.[lockForUsersKey(kind)])
}

/** Apply value overrides only; preserve Provider lock flags for Tenant Admin editing. */
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

/**
 * Effective locks for Tenant Users: Provider lock OR Tenant Admin "Lock for users".
 * Does not unlock Provider-locked fields.
 */
export function applyTenantLocksForUsers(
  policy: CatalogNetworkPolicy,
  overrides: TenantNetworkOverrides,
): CatalogNetworkPolicy {
  if (!policy.enabled) {
    return policy
  }

  const locks = overrides.lockForUsers ?? {}

  return {
    ...policy,
    virtualNetwork: {
      ...policy.virtualNetwork,
      locked: policy.virtualNetwork.locked || Boolean(locks.virtualNetwork),
    },
    subnet: {
      ...policy.subnet,
      locked: policy.subnet.locked || Boolean(locks.subnet),
    },
    securityGroup: {
      ...policy.securityGroup,
      locked: policy.securityGroup.locked || Boolean(locks.securityGroup),
    },
  }
}

export function resolveProviderCatalogNetworkPolicy(
  organization: RegisteredOrganization,
  catalogDraft: ProviderCatalogDraft | null,
): CatalogNetworkPolicy {
  if (organization.catalogItemId) {
    const assigned = getProviderCatalogItems().find(
      (item) => item.catalogItemId === organization.catalogItemId,
    )
    if (assigned) {
      return getCatalogItemNetworkPolicy(assigned)
    }
    if (catalogDraft) {
      return getCatalogItemNetworkPolicy(catalogDraft)
    }
  } else if (catalogDraft) {
    return getCatalogItemNetworkPolicy(catalogDraft)
  }

  return DEFAULT_CATALOG_NETWORK_POLICY
}

/** Provider policy + Tenant Admin value overrides (Provider locks unchanged). */
export function resolveCatalogNetworkPolicyForOrganization(
  organization: RegisteredOrganization,
  catalogDraft: ProviderCatalogDraft | null,
): CatalogNetworkPolicy {
  const base = resolveProviderCatalogNetworkPolicy(organization, catalogDraft)
  const catalogItemId =
    catalogDraft?.catalogItemId ?? organization.catalogItemId ?? null
  return applyTenantNetworkOverrides(
    base,
    getTenantNetworkOverrides(organization.slug, catalogItemId),
  )
}

/** Policy Tenant Users see at launch (values + effective locks). */
export function resolveEffectiveNetworkPolicyForUsers(
  organization: RegisteredOrganization,
  catalogDraft: ProviderCatalogDraft | null,
): CatalogNetworkPolicy {
  const catalogItemId =
    catalogDraft?.catalogItemId ?? organization.catalogItemId ?? null
  const overrides = getTenantNetworkOverrides(organization.slug, catalogItemId)
  return applyTenantLocksForUsers(
    applyTenantNetworkOverrides(
      resolveProviderCatalogNetworkPolicy(organization, catalogDraft),
      overrides,
    ),
    overrides,
  )
}

export function getTenantNetworkResourceMeta(
  kind: TenantNetworkResourceKind,
  virtualNetworkId?: string,
): {
  title: string
  fieldLabel: string
  lede: string
  fieldKey: 'virtualNetwork' | 'subnet' | 'securityGroup'
  overrideKey: TenantNetworkValueOverrideKey
  options: readonly CatalogNetworkResourceOption[]
} {
  switch (kind) {
    case 'virtual-network':
      return {
        title: 'Virtual networks',
        fieldLabel: 'Virtual network',
        lede: 'Virtual networks available to your organization for project workloads and catalog networking.',
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
  /** Provider lock — Tenant Admin cannot change the value. */
  providerLocked: boolean
  /** Tenant Admin chose to lock this for Tenant Users (only when !providerLocked). */
  lockedForUsers: boolean
  selectedId: string
}

export function getTenantCatalogNetworkFieldSummaries(
  policy: CatalogNetworkPolicy,
  overrides: TenantNetworkOverrides = {},
): TenantCatalogNetworkFieldSummary[] {
  return [
    {
      kind: 'virtual-network',
      label: 'Virtual network',
      value: getNetworkOptionDetail(getCatalogVirtualNetworkOptions(), policy.virtualNetwork.id),
      providerLocked: policy.virtualNetwork.locked,
      lockedForUsers: getTenantLockForUsers(overrides, 'virtual-network'),
      selectedId: policy.virtualNetwork.id,
    },
    {
      kind: 'subnet',
      label: 'Subnet',
      value: getNetworkOptionDetail(
        getCatalogSubnetOptions(policy.virtualNetwork.id),
        policy.subnet.id,
      ),
      providerLocked: policy.subnet.locked,
      lockedForUsers: getTenantLockForUsers(overrides, 'subnet'),
      selectedId: policy.subnet.id,
    },
    {
      kind: 'security-group',
      label: 'Security group',
      value: getNetworkOptionDetail(getCatalogSecurityGroupOptions(), policy.securityGroup.id),
      providerLocked: policy.securityGroup.locked,
      lockedForUsers: getTenantLockForUsers(overrides, 'security-group'),
      selectedId: policy.securityGroup.id,
    },
  ]
}

export {
  getCatalogNetworkLockSummary as getTenantNetworkLockSummary,
  type CatalogNetworkLockSummary as TenantNetworkLockSummary,
  type CatalogNetworkLockSummaryKind as TenantNetworkLockSummaryKind,
} from '../providerAdmin/catalogNetworkPolicy'
