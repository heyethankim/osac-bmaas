/** Catalog network policy: defaults + locks over provider network inventory. */

import {
  DEFAULT_PROVIDER_SECURITY_GROUPS,
  DEFAULT_PROVIDER_SUBNETS,
  DEFAULT_PROVIDER_VIRTUAL_NETWORKS,
  toCatalogNetworkOption,
} from './networkInventory'

export type CatalogNetworkResourceOption = {
  id: string
  name: string
  detail: string
}

export type CatalogNetworkPolicyField = {
  id: string
  name: string
  /** When true, tenant admins cannot change this field. */
  locked: boolean
}

/** Optional external IP pools exposed by this catalog offering. */
export type CatalogExternalIpPoolPolicy = {
  enabled: boolean
  /** Pool IDs tenants may use when the feature is on. */
  poolIds: string[]
}

export type CatalogNetworkPolicy = {
  /** When false, network access is off and field controls are hidden. */
  enabled: boolean
  virtualNetwork: CatalogNetworkPolicyField
  subnet: CatalogNetworkPolicyField
  securityGroup: CatalogNetworkPolicyField
  externalIpPool: CatalogExternalIpPoolPolicy
}

/** Fallback options from seed inventory (prefer live inventory via storage). */
export const CATALOG_VIRTUAL_NETWORK_OPTIONS: CatalogNetworkResourceOption[] =
  DEFAULT_PROVIDER_VIRTUAL_NETWORKS.map(toCatalogNetworkOption)

export const CATALOG_SUBNET_OPTIONS: CatalogNetworkResourceOption[] =
  DEFAULT_PROVIDER_SUBNETS.map(toCatalogNetworkOption)

export const CATALOG_SECURITY_GROUP_OPTIONS: CatalogNetworkResourceOption[] =
  DEFAULT_PROVIDER_SECURITY_GROUPS.map(toCatalogNetworkOption)

export const DEFAULT_CATALOG_EXTERNAL_IP_POOL_POLICY: CatalogExternalIpPoolPolicy = {
  enabled: false,
  poolIds: [],
}

export const DEFAULT_CATALOG_NETWORK_POLICY: CatalogNetworkPolicy = {
  enabled: true,
  virtualNetwork: {
    id: CATALOG_VIRTUAL_NETWORK_OPTIONS[0]!.id,
    name: CATALOG_VIRTUAL_NETWORK_OPTIONS[0]!.name,
    locked: false,
  },
  subnet: {
    id: CATALOG_SUBNET_OPTIONS[0]!.id,
    name: CATALOG_SUBNET_OPTIONS[0]!.name,
    locked: false,
  },
  securityGroup: {
    id: CATALOG_SECURITY_GROUP_OPTIONS[0]!.id,
    name: CATALOG_SECURITY_GROUP_OPTIONS[0]!.name,
    locked: false,
  },
  externalIpPool: { ...DEFAULT_CATALOG_EXTERNAL_IP_POOL_POLICY },
}

/** Same placement defaults as the seed policy, with networking turned off. */
export const DISABLED_CATALOG_NETWORK_POLICY: CatalogNetworkPolicy = {
  ...DEFAULT_CATALOG_NETWORK_POLICY,
  enabled: false,
}

export type CatalogNetworkEditableField = 'virtualNetwork' | 'subnet' | 'securityGroup'

export type CatalogNetworkLockPattern =
  | 'all-editable'
  | 'all-locked'
  | 'two-locked-one-editable'
  | 'vnet-locked'

const CATALOG_NETWORK_EDITABLE_FIELDS: CatalogNetworkEditableField[] = [
  'virtualNetwork',
  'subnet',
  'securityGroup',
]

function withFieldLocks(
  locks: Record<CatalogNetworkEditableField, boolean>,
): CatalogNetworkPolicy {
  return {
    enabled: true,
    virtualNetwork: {
      id: CATALOG_VIRTUAL_NETWORK_OPTIONS[0]!.id,
      name: CATALOG_VIRTUAL_NETWORK_OPTIONS[0]!.name,
      locked: locks.virtualNetwork,
    },
    subnet: {
      id: CATALOG_SUBNET_OPTIONS[0]!.id,
      name: CATALOG_SUBNET_OPTIONS[0]!.name,
      locked: locks.subnet,
    },
    securityGroup: {
      id: CATALOG_SECURITY_GROUP_OPTIONS[0]!.id,
      name: CATALOG_SECURITY_GROUP_OPTIONS[0]!.name,
      locked: locks.securityGroup,
    },
    externalIpPool: { ...DEFAULT_CATALOG_EXTERNAL_IP_POOL_POLICY },
  }
}

export function createAllEditableCatalogNetworkPolicy(): CatalogNetworkPolicy {
  return withFieldLocks({
    virtualNetwork: false,
    subnet: false,
    securityGroup: false,
  })
}

export function createAllLockedCatalogNetworkPolicy(): CatalogNetworkPolicy {
  return withFieldLocks({
    virtualNetwork: true,
    subnet: true,
    securityGroup: true,
  })
}

/** Virtual network locked; subnet and security group remain editable. */
export function createVirtualNetworkLockedCatalogNetworkPolicy(): CatalogNetworkPolicy {
  return withFieldLocks({
    virtualNetwork: true,
    subnet: false,
    securityGroup: false,
  })
}

/** Exactly two fields locked; `editableField` stays tenant-editable. */
export function createTwoLockedOneEditableCatalogNetworkPolicy(
  editableField: CatalogNetworkEditableField = 'securityGroup',
): CatalogNetworkPolicy {
  return withFieldLocks({
    virtualNetwork: editableField !== 'virtualNetwork',
    subnet: editableField !== 'subnet',
    securityGroup: editableField !== 'securityGroup',
  })
}

/** Stable pick so demo seeds stay consistent across reloads. */
export function pickStableCatalogEditableField(seed: string): CatalogNetworkEditableField {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash + seed.charCodeAt(index) * (index + 1)) % CATALOG_NETWORK_EDITABLE_FIELDS.length
  }
  return CATALOG_NETWORK_EDITABLE_FIELDS[hash]!
}

export function createCatalogNetworkPolicyForLockPattern(
  pattern: CatalogNetworkLockPattern,
  seed = 'default',
): CatalogNetworkPolicy {
  switch (pattern) {
    case 'all-editable':
      return createAllEditableCatalogNetworkPolicy()
    case 'all-locked':
      return createAllLockedCatalogNetworkPolicy()
    case 'vnet-locked':
      return createVirtualNetworkLockedCatalogNetworkPolicy()
    case 'two-locked-one-editable':
      return createTwoLockedOneEditableCatalogNetworkPolicy(pickStableCatalogEditableField(seed))
  }
}

function getCatalogNetworkFieldLocks(policy: CatalogNetworkPolicy): {
  virtualNetwork: boolean
  subnet: boolean
  securityGroup: boolean
} {
  return {
    virtualNetwork: policy.virtualNetwork.locked,
    subnet: policy.subnet.locked,
    securityGroup: policy.securityGroup.locked,
  }
}

export function catalogNetworkPolicyMatchesLockPattern(
  policy: CatalogNetworkPolicy,
  pattern: CatalogNetworkLockPattern,
): boolean {
  if (!policy.enabled) {
    return false
  }

  const locks = getCatalogNetworkFieldLocks(policy)
  const lockedCount = Object.values(locks).filter(Boolean).length

  if (pattern === 'all-editable') {
    return lockedCount === 0
  }
  if (pattern === 'all-locked') {
    return lockedCount === 3
  }
  if (pattern === 'vnet-locked') {
    return locks.virtualNetwork && !locks.subnet && !locks.securityGroup
  }
  return lockedCount === 2
}

/** Previous seed default (off + all unlocked) — migrate to current defaults on read. */
function isLegacyDefaultNetworkPolicy(policy: CatalogNetworkPolicy): boolean {
  return (
    policy.enabled === false &&
    !policy.virtualNetwork.locked &&
    !policy.subnet.locked &&
    !policy.securityGroup.locked
  )
}

export function getCatalogNetworkOptionLabel(option: CatalogNetworkResourceOption): string {
  return `${option.name} · ${option.detail}`
}

export function resolveCatalogNetworkPolicyField(
  options: readonly CatalogNetworkResourceOption[],
  id: string,
  locked: boolean,
): CatalogNetworkPolicyField {
  const option = options.find((item) => item.id === id) ?? options[0]!
  return {
    id: option.id,
    name: option.name,
    locked,
  }
}

export function formatCatalogNetworkPolicyField(field: CatalogNetworkPolicyField): string {
  return `${field.name} · ${field.locked ? 'Locked' : 'Tenant editable'}`
}

export function isCatalogNetworkPolicy(value: unknown): value is CatalogNetworkPolicy {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const policy = value as CatalogNetworkPolicy
  const isField = (field: unknown): field is CatalogNetworkPolicyField => {
    if (typeof field !== 'object' || field === null) {
      return false
    }
    const candidate = field as CatalogNetworkPolicyField
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.name === 'string' &&
      typeof candidate.locked === 'boolean'
    )
  }

  return (
    (typeof policy.enabled === 'boolean' || policy.enabled === undefined) &&
    isField(policy.virtualNetwork) &&
    isField(policy.subnet) &&
    isField(policy.securityGroup)
  )
}

function normalizeExternalIpPoolPolicy(
  value: CatalogExternalIpPoolPolicy | undefined,
): CatalogExternalIpPoolPolicy {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_CATALOG_EXTERNAL_IP_POOL_POLICY }
  }

  return {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : false,
    poolIds: Array.isArray(value.poolIds)
      ? value.poolIds.filter((id): id is string => typeof id === 'string')
      : [],
  }
}

/** Normalize stored policies (including drafts created before `enabled` existed). */
export function normalizeCatalogNetworkPolicy(policy: CatalogNetworkPolicy): CatalogNetworkPolicy {
  return {
    enabled: typeof policy.enabled === 'boolean' ? policy.enabled : true,
    virtualNetwork: policy.virtualNetwork,
    subnet: policy.subnet,
    securityGroup: policy.securityGroup,
    externalIpPool: normalizeExternalIpPoolPolicy(policy.externalIpPool),
  }
}

export function resolveCatalogNetworkPolicy(
  policy: CatalogNetworkPolicy | undefined,
): CatalogNetworkPolicy {
  if (!policy || !isCatalogNetworkPolicy(policy)) {
    return DEFAULT_CATALOG_NETWORK_POLICY
  }

  const normalized = normalizeCatalogNetworkPolicy(policy)
  return isLegacyDefaultNetworkPolicy(normalized)
    ? DEFAULT_CATALOG_NETWORK_POLICY
    : normalized
}

export type CatalogNetworkLockSummaryKind = 'all-locked' | 'all-editable' | 'partial'

export type CatalogNetworkLockSummary = {
  kind: CatalogNetworkLockSummaryKind
  label: string
  lockedCount: number
  editableCount: number
}

/** Glanceable lock state for catalog cards/tables. Null when networking is off. */
export function getCatalogNetworkLockSummary(
  policy: CatalogNetworkPolicy,
): CatalogNetworkLockSummary | null {
  if (!policy.enabled) {
    return null
  }

  const fields = [policy.virtualNetwork, policy.subnet, policy.securityGroup]
  const lockedCount = fields.filter((field) => field.locked).length
  const editableCount = fields.length - lockedCount

  if (lockedCount === fields.length) {
    return {
      kind: 'all-locked',
      label: 'All locked',
      lockedCount,
      editableCount,
    }
  }

  if (editableCount === fields.length) {
    return {
      kind: 'all-editable',
      label: 'All unlocked',
      lockedCount,
      editableCount,
    }
  }

  return {
    kind: 'partial',
    label:
      lockedCount === 2 && editableCount === 1
        ? '2 locked · 1 editable'
        : `${lockedCount} locked · ${editableCount} editable`,
    lockedCount,
    editableCount,
  }
}
