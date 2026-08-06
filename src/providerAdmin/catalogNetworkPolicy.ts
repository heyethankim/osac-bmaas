/** Catalog network policy: defaults + locks over provider network inventory. */

import {
  DEFAULT_PROVIDER_SECURITY_GROUPS,
  DEFAULT_PROVIDER_SUBNETS,
  DEFAULT_PROVIDER_VIRTUAL_NETWORKS,
  toCatalogNetworkOption,
} from './networkInventory'
import {
  DEFAULT_EXTERNAL_IP_POOLS,
  type ExternalIpPool,
} from './externalIpPools'

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

/** @deprecated Legacy allowlist shape — migrated to CatalogNetworkPolicyField on read. */
export type CatalogExternalIpPoolPolicy = {
  enabled: boolean
  poolIds: string[]
}

export type CatalogNetworkPolicy = {
  /** When false, network access is off and field controls are hidden. */
  enabled: boolean
  virtualNetwork: CatalogNetworkPolicyField
  subnet: CatalogNetworkPolicyField
  securityGroup: CatalogNetworkPolicyField
  externalIpPool: CatalogNetworkPolicyField
}

export function toExternalIpPoolCatalogOption(pool: ExternalIpPool): CatalogNetworkResourceOption {
  return {
    id: pool.id,
    name: pool.name,
    detail: `${pool.cidr} · ${pool.dataCenter}`,
  }
}

/** Fallback options from seed inventory (prefer live inventory via storage). */
export const CATALOG_VIRTUAL_NETWORK_OPTIONS: CatalogNetworkResourceOption[] =
  DEFAULT_PROVIDER_VIRTUAL_NETWORKS.map(toCatalogNetworkOption)

export const CATALOG_SUBNET_OPTIONS: CatalogNetworkResourceOption[] =
  DEFAULT_PROVIDER_SUBNETS.map(toCatalogNetworkOption)

export const CATALOG_SECURITY_GROUP_OPTIONS: CatalogNetworkResourceOption[] =
  DEFAULT_PROVIDER_SECURITY_GROUPS.map(toCatalogNetworkOption)

export const CATALOG_EXTERNAL_IP_POOL_OPTIONS: CatalogNetworkResourceOption[] =
  DEFAULT_EXTERNAL_IP_POOLS.map(toExternalIpPoolCatalogOption)

const DEFAULT_EXTERNAL_IP_POOL_FIELD: CatalogNetworkPolicyField = {
  id: CATALOG_EXTERNAL_IP_POOL_OPTIONS[0]!.id,
  name: CATALOG_EXTERNAL_IP_POOL_OPTIONS[0]!.name,
  locked: false,
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
  externalIpPool: { ...DEFAULT_EXTERNAL_IP_POOL_FIELD },
}

/** Same placement defaults as the seed policy, with networking turned off. */
export const DISABLED_CATALOG_NETWORK_POLICY: CatalogNetworkPolicy = {
  ...DEFAULT_CATALOG_NETWORK_POLICY,
  enabled: false,
}

export type CatalogNetworkEditableField =
  | 'virtualNetwork'
  | 'subnet'
  | 'securityGroup'
  | 'externalIpPool'

export type CatalogNetworkLockPattern =
  | 'all-editable'
  | 'all-locked'
  | 'two-locked-one-editable'
  | 'vnet-locked'

/** Core lock-pattern fields (demo seeding); External IP pools follows unlocked by default. */
const CATALOG_NETWORK_LOCK_PATTERN_FIELDS: Array<
  Exclude<CatalogNetworkEditableField, 'externalIpPool'>
> = ['virtualNetwork', 'subnet', 'securityGroup']

function withFieldLocks(
  locks: Record<Exclude<CatalogNetworkEditableField, 'externalIpPool'>, boolean>,
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
    externalIpPool: { ...DEFAULT_EXTERNAL_IP_POOL_FIELD, locked: false },
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

export function createVirtualNetworkLockedCatalogNetworkPolicy(): CatalogNetworkPolicy {
  return withFieldLocks({
    virtualNetwork: true,
    subnet: false,
    securityGroup: false,
  })
}

/** Exactly two fields locked; `editableField` stays tenant-editable. */
export function createTwoLockedOneEditableCatalogNetworkPolicy(
  editableField: Exclude<CatalogNetworkEditableField, 'externalIpPool'> = 'securityGroup',
): CatalogNetworkPolicy {
  return withFieldLocks({
    virtualNetwork: editableField !== 'virtualNetwork',
    subnet: editableField !== 'subnet',
    securityGroup: editableField !== 'securityGroup',
  })
}

function pickStableCatalogEditableField(
  seed: string,
): Exclude<CatalogNetworkEditableField, 'externalIpPool'> {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % CATALOG_NETWORK_LOCK_PATTERN_FIELDS.length
  }
  return CATALOG_NETWORK_LOCK_PATTERN_FIELDS[hash]!
}

export function createCatalogNetworkPolicyForLockPattern(
  pattern: CatalogNetworkLockPattern,
  seed: string,
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

function isCatalogNetworkPolicyField(field: unknown): field is CatalogNetworkPolicyField {
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

export function isCatalogNetworkPolicy(value: unknown): value is CatalogNetworkPolicy {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const policy = value as CatalogNetworkPolicy

  return (
    (typeof policy.enabled === 'boolean' || policy.enabled === undefined) &&
    isCatalogNetworkPolicyField(policy.virtualNetwork) &&
    isCatalogNetworkPolicyField(policy.subnet) &&
    isCatalogNetworkPolicyField(policy.securityGroup)
  )
}

function normalizeExternalIpPoolField(value: unknown): CatalogNetworkPolicyField {
  if (isCatalogNetworkPolicyField(value)) {
    return value
  }

  // Legacy allowlist shape: { enabled, poolIds }
  if (typeof value === 'object' && value !== null && 'poolIds' in value) {
    const legacy = value as CatalogExternalIpPoolPolicy
    const poolIds = Array.isArray(legacy.poolIds)
      ? legacy.poolIds.filter((id): id is string => typeof id === 'string')
      : []
    const preferredId = poolIds[0] ?? CATALOG_EXTERNAL_IP_POOL_OPTIONS[0]!.id
    return resolveCatalogNetworkPolicyField(
      CATALOG_EXTERNAL_IP_POOL_OPTIONS,
      preferredId,
      false,
    )
  }

  return { ...DEFAULT_EXTERNAL_IP_POOL_FIELD }
}

/** Normalize stored policies (including drafts created before `enabled` existed). */
export function normalizeCatalogNetworkPolicy(policy: CatalogNetworkPolicy): CatalogNetworkPolicy {
  return {
    enabled: typeof policy.enabled === 'boolean' ? policy.enabled : true,
    virtualNetwork: policy.virtualNetwork,
    subnet: policy.subnet,
    securityGroup: policy.securityGroup,
    externalIpPool: normalizeExternalIpPoolField(policy.externalIpPool),
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

  const fields = [
    policy.virtualNetwork,
    policy.subnet,
    policy.securityGroup,
    policy.externalIpPool,
  ]
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
    label: `${lockedCount} locked · ${editableCount} editable`,
    lockedCount,
    editableCount,
  }
}
