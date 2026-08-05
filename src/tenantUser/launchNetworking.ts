import type { CatalogNetworkPolicy } from '../providerAdmin/catalogNetworkPolicy'
import {
  DEFAULT_CATALOG_NETWORK_POLICY,
  getCatalogNetworkOptionLabel,
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
import {
  applyTenantLocksForUsers,
  applyTenantNetworkOverrides,
  getNetworkOptionDetail,
  getTenantNetworkOverrides,
  resolveEffectiveNetworkPolicyForUsers,
} from '../tenantAdmin/networking'

export type LaunchNetworkFieldKind = 'virtual-network' | 'subnet' | 'security-group'

export type LaunchNetworkFieldView = {
  kind: LaunchNetworkFieldKind
  label: string
  value: string
  selectedId: string
  locked: boolean
  options: readonly CatalogNetworkResourceOption[]
}

export type LaunchNetworkContext = {
  enabled: boolean
  policy: CatalogNetworkPolicy
  fields: LaunchNetworkFieldView[]
  /** True when networking is on and at least one field is editable at launch. */
  hasEditableFields: boolean
  /** Combined VNet / subnet line for summaries. */
  assignedNetworkSummary: string
}

function resolvePolicyForLaunch(
  organization: RegisteredOrganization | null,
  catalogDraft: ProviderCatalogDraft | null,
  preferCatalogDraft: boolean,
  catalogItemId?: string,
): CatalogNetworkPolicy {
  const specificItem = catalogItemId
    ? getProviderCatalogItems().find((item) => item.catalogItemId === catalogItemId)
    : null

  if (specificItem) {
    const base = getCatalogItemNetworkPolicy(specificItem)
    if (organization) {
      const overrides = getTenantNetworkOverrides(
        organization.slug,
        specificItem.catalogItemId,
      )
      return applyTenantLocksForUsers(applyTenantNetworkOverrides(base, overrides), overrides)
    }
    return base
  }

  if (preferCatalogDraft && catalogDraft) {
    return getCatalogItemNetworkPolicy(catalogDraft)
  }

  if (organization) {
    return resolveEffectiveNetworkPolicyForUsers(organization, catalogDraft)
  }

  if (catalogDraft) {
    return getCatalogItemNetworkPolicy(catalogDraft)
  }

  const latest = getProviderCatalogItems()[0]
  return latest ? getCatalogItemNetworkPolicy(latest) : DEFAULT_CATALOG_NETWORK_POLICY
}

export function resolveLaunchNetworkContext(
  organization: RegisteredOrganization | null,
  catalogDraft: ProviderCatalogDraft | null,
  preferCatalogDraft = false,
  catalogItemId?: string,
): LaunchNetworkContext {
  const basePolicy = resolvePolicyForLaunch(
    organization,
    catalogDraft,
    preferCatalogDraft,
    catalogItemId,
  )

  if (!basePolicy.enabled) {
    return {
      enabled: false,
      policy: basePolicy,
      fields: [],
      hasEditableFields: false,
      assignedNetworkSummary: '',
    }
  }

  const virtualNetworkOptions = getCatalogVirtualNetworkOptions()
  const preferredVirtualNetworkId =
    virtualNetworkOptions.find((option) => option.id === basePolicy.virtualNetwork.id)?.id ??
    virtualNetworkOptions[0]?.id ??
    DEFAULT_CATALOG_NETWORK_POLICY.virtualNetwork.id
  const subnetOptions = getCatalogSubnetOptions(preferredVirtualNetworkId)
  const preferredSubnetId =
    subnetOptions.find((option) => option.id === basePolicy.subnet.id)?.id ??
    subnetOptions[0]?.id ??
    DEFAULT_CATALOG_NETWORK_POLICY.subnet.id
  const securityGroupOptions = getCatalogSecurityGroupOptions()
  const preferredSecurityGroupId =
    securityGroupOptions.find((option) => option.id === basePolicy.securityGroup.id)?.id ??
    securityGroupOptions[0]?.id ??
    DEFAULT_CATALOG_NETWORK_POLICY.securityGroup.id

  const virtualNetworkName =
    virtualNetworkOptions.find((option) => option.id === preferredVirtualNetworkId)?.name ??
    basePolicy.virtualNetwork.name
  const subnetName =
    subnetOptions.find((option) => option.id === preferredSubnetId)?.name ?? basePolicy.subnet.name
  const securityGroupName =
    securityGroupOptions.find((option) => option.id === preferredSecurityGroupId)?.name ??
    basePolicy.securityGroup.name

  const policy: CatalogNetworkPolicy = {
    enabled: true,
    virtualNetwork: {
      id: preferredVirtualNetworkId,
      name: virtualNetworkName,
      locked: basePolicy.virtualNetwork.locked,
    },
    subnet: {
      id: preferredSubnetId,
      name: subnetName,
      locked: basePolicy.subnet.locked,
    },
    securityGroup: {
      id: preferredSecurityGroupId,
      name: securityGroupName,
      locked: basePolicy.securityGroup.locked,
    },
    externalIpPool: basePolicy.externalIpPool ?? {
      ...DEFAULT_CATALOG_NETWORK_POLICY.externalIpPool,
    },
  }

  const fields: LaunchNetworkFieldView[] = [
    {
      kind: 'virtual-network',
      label: 'Virtual network',
      value: getNetworkOptionDetail(virtualNetworkOptions, policy.virtualNetwork.id),
      selectedId: policy.virtualNetwork.id,
      locked: policy.virtualNetwork.locked,
      options: virtualNetworkOptions,
    },
    {
      kind: 'subnet',
      label: 'Subnet',
      value: getNetworkOptionDetail(subnetOptions, policy.subnet.id),
      selectedId: policy.subnet.id,
      locked: policy.subnet.locked,
      options: subnetOptions,
    },
    {
      kind: 'security-group',
      label: 'Security group',
      value: getNetworkOptionDetail(securityGroupOptions, policy.securityGroup.id),
      selectedId: policy.securityGroup.id,
      locked: policy.securityGroup.locked,
      options: securityGroupOptions,
    },
  ]

  return {
    enabled: true,
    policy,
    fields,
    hasEditableFields: fields.some((field) => !field.locked),
    assignedNetworkSummary: `${policy.virtualNetwork.name} / ${policy.subnet.name}`,
  }
}

export function getLaunchNetworkFieldLabel(
  field: LaunchNetworkFieldView,
  selectedId: string,
): string {
  const option = field.options.find((item) => item.id === selectedId)
  return option ? getCatalogNetworkOptionLabel(option) : field.value
}

export function formatLaunchInstanceNetworkLabel(
  context: LaunchNetworkContext,
  selections: {
    virtualNetworkId: string
    subnetId: string
    securityGroupId: string
  },
): string {
  const details = resolveLaunchInstanceNetworking(context, selections)
  if (!details.enabled) {
    return 'Networking off'
  }

  return `${details.virtualNetwork} / ${details.subnet} · ${details.securityGroup}`
}

export function resolveLaunchInstanceNetworking(
  context: LaunchNetworkContext,
  selections: {
    virtualNetworkId: string
    subnetId: string
    securityGroupId: string
  },
): {
  enabled: boolean
  virtualNetwork: string
  subnet: string
  securityGroup: string
} {
  if (!context.enabled) {
    return {
      enabled: false,
      virtualNetwork: '',
      subnet: '',
      securityGroup: '',
    }
  }

  const virtualNetworkField = context.fields.find((field) => field.kind === 'virtual-network')
  const subnetField = context.fields.find((field) => field.kind === 'subnet')
  const securityGroupField = context.fields.find((field) => field.kind === 'security-group')

  return {
    enabled: true,
    virtualNetwork: virtualNetworkField
      ? getLaunchNetworkFieldLabel(virtualNetworkField, selections.virtualNetworkId)
      : context.policy.virtualNetwork.name,
    subnet: subnetField
      ? getLaunchNetworkFieldLabel(subnetField, selections.subnetId)
      : context.policy.subnet.name,
    securityGroup: securityGroupField
      ? getLaunchNetworkFieldLabel(securityGroupField, selections.securityGroupId)
      : context.policy.securityGroup.name,
  }
}

/** Match a stored display label (or name) back to an inventory option id. */
export function matchNetworkOptionId(
  options: readonly CatalogNetworkResourceOption[],
  labelOrName: string,
): string {
  const trimmed = labelOrName.trim()
  if (!trimmed) {
    return options[0]?.id ?? ''
  }

  const byFullLabel = options.find((option) => getCatalogNetworkOptionLabel(option) === trimmed)
  if (byFullLabel) {
    return byFullLabel.id
  }

  const byName = options.find(
    (option) => option.name === trimmed || trimmed.startsWith(`${option.name} ·`),
  )
  return byName?.id ?? options[0]?.id ?? ''
}

export function formatInstanceNetworkLabel(networking: {
  virtualNetwork: string
  subnet: string
  securityGroup: string
}): string {
  return `${networking.virtualNetwork} / ${networking.subnet} · ${networking.securityGroup}`
}
