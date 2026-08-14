import type { CatalogNetworkPolicy } from '../providerAdmin/catalogNetworkPolicy'
import {
  DEFAULT_CATALOG_NETWORK_POLICY,
  getCatalogNetworkOptionLabel,
  type CatalogNetworkResourceOption,
} from '../providerAdmin/catalogNetworkPolicy'
import type { RegisteredOrganization } from '../providerAdmin/organizations'
import type { ProviderCatalogDraft } from '../providerSetup/storage'
import { resolveNetworkInventoryScope } from '../shared/networkInventoryScope'
import { getNetworkOptionDetail } from '../tenantAdmin/networking'

export type LaunchNetworkFieldKind =
  | 'virtual-network'
  | 'subnet'
  | 'security-group'
  | 'external-ip-pool'

export type LaunchNetworkFieldView = {
  kind: LaunchNetworkFieldKind
  label: string
  value: string
  selectedId: string
  locked: boolean
  options: readonly CatalogNetworkResourceOption[]
}

export type LaunchNetworkSelections = {
  virtualNetworkId: string
  subnetId: string
  securityGroupId: string
  externalIpPoolId: string
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

export function resolveLaunchNetworkContext(
  organization: RegisteredOrganization | null,
  _catalogDraft: ProviderCatalogDraft | null = null,
  _preferCatalogDraft = false,
  _catalogItemId?: string,
): LaunchNetworkContext {
  const inventory = resolveNetworkInventoryScope(organization?.slug ?? null)

  const virtualNetworkOptions = inventory.getVirtualNetworkOptions()
  const preferredVirtualNetworkId =
    virtualNetworkOptions[0]?.id ?? DEFAULT_CATALOG_NETWORK_POLICY.virtualNetwork.id
  const subnetOptions = inventory.getSubnetOptions(preferredVirtualNetworkId)
  const preferredSubnetId = subnetOptions[0]?.id ?? DEFAULT_CATALOG_NETWORK_POLICY.subnet.id
  const securityGroupOptions = inventory.getSecurityGroupOptions()
  const preferredSecurityGroupId =
    securityGroupOptions[0]?.id ?? DEFAULT_CATALOG_NETWORK_POLICY.securityGroup.id
  const externalIpPoolOptions = inventory.getExternalIpPoolOptions()
  const preferredExternalIpPoolId =
    externalIpPoolOptions[0]?.id ?? DEFAULT_CATALOG_NETWORK_POLICY.externalIpPool.id

  const virtualNetworkName =
    virtualNetworkOptions.find((option) => option.id === preferredVirtualNetworkId)?.name ??
    DEFAULT_CATALOG_NETWORK_POLICY.virtualNetwork.name
  const subnetName =
    subnetOptions.find((option) => option.id === preferredSubnetId)?.name ??
    DEFAULT_CATALOG_NETWORK_POLICY.subnet.name
  const securityGroupName =
    securityGroupOptions.find((option) => option.id === preferredSecurityGroupId)?.name ??
    DEFAULT_CATALOG_NETWORK_POLICY.securityGroup.name
  const externalIpPoolName =
    externalIpPoolOptions.find((option) => option.id === preferredExternalIpPoolId)?.name ??
    DEFAULT_CATALOG_NETWORK_POLICY.externalIpPool.name

  const policy: CatalogNetworkPolicy = {
    enabled: true,
    virtualNetwork: {
      id: preferredVirtualNetworkId,
      name: virtualNetworkName,
      locked: false,
    },
    subnet: {
      id: preferredSubnetId,
      name: subnetName,
      locked: false,
    },
    securityGroup: {
      id: preferredSecurityGroupId,
      name: securityGroupName,
      locked: false,
    },
    externalIpPool: {
      id: preferredExternalIpPoolId,
      name: externalIpPoolName,
      locked: false,
    },
  }

  const fields: LaunchNetworkFieldView[] = [
    {
      kind: 'virtual-network',
      label: 'Virtual network',
      value: getNetworkOptionDetail(virtualNetworkOptions, policy.virtualNetwork.id),
      selectedId: policy.virtualNetwork.id,
      locked: false,
      options: virtualNetworkOptions,
    },
    {
      kind: 'subnet',
      label: 'Subnet',
      value: getNetworkOptionDetail(subnetOptions, policy.subnet.id),
      selectedId: policy.subnet.id,
      locked: false,
      options: subnetOptions,
    },
    {
      kind: 'security-group',
      label: 'Security group',
      value: getNetworkOptionDetail(securityGroupOptions, policy.securityGroup.id),
      selectedId: policy.securityGroup.id,
      locked: false,
      options: securityGroupOptions,
    },
    {
      kind: 'external-ip-pool',
      label: 'External IP pool',
      value: getNetworkOptionDetail(externalIpPoolOptions, policy.externalIpPool.id),
      selectedId: policy.externalIpPool.id,
      locked: false,
      options: externalIpPoolOptions,
    },
  ]

  return {
    enabled: true,
    policy,
    fields,
    hasEditableFields: true,
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
  selections: LaunchNetworkSelections,
): string {
  const details = resolveLaunchInstanceNetworking(context, selections)
  if (!details.enabled) {
    return 'Networking off'
  }

  const externalIpPool = details.externalIpPool ? ` · ${details.externalIpPool}` : ''
  return `${details.virtualNetwork} / ${details.subnet} · ${details.securityGroup}${externalIpPool}`
}

export function resolveLaunchInstanceNetworking(
  context: LaunchNetworkContext,
  selections: LaunchNetworkSelections,
): {
  enabled: boolean
  virtualNetwork: string
  subnet: string
  securityGroup: string
  externalIpPool: string
} {
  if (!context.enabled) {
    return {
      enabled: false,
      virtualNetwork: '',
      subnet: '',
      securityGroup: '',
      externalIpPool: '',
    }
  }

  const virtualNetworkField = context.fields.find((field) => field.kind === 'virtual-network')
  const subnetField = context.fields.find((field) => field.kind === 'subnet')
  const securityGroupField = context.fields.find((field) => field.kind === 'security-group')
  const externalIpPoolField = context.fields.find((field) => field.kind === 'external-ip-pool')

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
    externalIpPool: externalIpPoolField
      ? getLaunchNetworkFieldLabel(externalIpPoolField, selections.externalIpPoolId)
      : context.policy.externalIpPool.name,
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
  externalIpPool?: string
}): string {
  const externalIpPool = networking.externalIpPool?.trim()
    ? ` · ${networking.externalIpPool.trim()}`
    : ''
  return `${networking.virtualNetwork} / ${networking.subnet} · ${networking.securityGroup}${externalIpPool}`
}
