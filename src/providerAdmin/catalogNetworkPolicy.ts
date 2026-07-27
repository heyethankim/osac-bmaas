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

export type CatalogNetworkPolicy = {
  /** When false, network access is off and field controls are hidden. */
  enabled: boolean
  virtualNetwork: CatalogNetworkPolicyField
  subnet: CatalogNetworkPolicyField
  securityGroup: CatalogNetworkPolicyField
}

/** Fallback options from seed inventory (prefer live inventory via storage). */
export const CATALOG_VIRTUAL_NETWORK_OPTIONS: CatalogNetworkResourceOption[] =
  DEFAULT_PROVIDER_VIRTUAL_NETWORKS.map(toCatalogNetworkOption)

export const CATALOG_SUBNET_OPTIONS: CatalogNetworkResourceOption[] =
  DEFAULT_PROVIDER_SUBNETS.map(toCatalogNetworkOption)

export const CATALOG_SECURITY_GROUP_OPTIONS: CatalogNetworkResourceOption[] =
  DEFAULT_PROVIDER_SECURITY_GROUPS.map(toCatalogNetworkOption)

export const DEFAULT_CATALOG_NETWORK_POLICY: CatalogNetworkPolicy = {
  enabled: true,
  virtualNetwork: {
    id: CATALOG_VIRTUAL_NETWORK_OPTIONS[0]!.id,
    name: CATALOG_VIRTUAL_NETWORK_OPTIONS[0]!.name,
    locked: true,
  },
  subnet: {
    id: CATALOG_SUBNET_OPTIONS[0]!.id,
    name: CATALOG_SUBNET_OPTIONS[0]!.name,
    locked: true,
  },
  securityGroup: {
    id: CATALOG_SECURITY_GROUP_OPTIONS[0]!.id,
    name: CATALOG_SECURITY_GROUP_OPTIONS[0]!.name,
    locked: false,
  },
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

/** Normalize stored policies (including drafts created before `enabled` existed). */
export function normalizeCatalogNetworkPolicy(policy: CatalogNetworkPolicy): CatalogNetworkPolicy {
  return {
    enabled: typeof policy.enabled === 'boolean' ? policy.enabled : true,
    virtualNetwork: policy.virtualNetwork,
    subnet: policy.subnet,
    securityGroup: policy.securityGroup,
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
      label: 'All editable',
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
