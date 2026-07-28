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
      const overrides = getTenantNetworkOverrides(organization.slug)
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
  const policy = resolvePolicyForLaunch(
    organization,
    catalogDraft,
    preferCatalogDraft,
    catalogItemId,
  )

  if (!policy.enabled) {
    return {
      enabled: false,
      policy,
      fields: [],
      hasEditableFields: false,
      assignedNetworkSummary: '',
    }
  }

  const fields: LaunchNetworkFieldView[] = [
    {
      kind: 'virtual-network',
      label: 'Virtual network',
      value: getNetworkOptionDetail(getCatalogVirtualNetworkOptions(), policy.virtualNetwork.id),
      selectedId: policy.virtualNetwork.id,
      locked: policy.virtualNetwork.locked,
      options: getCatalogVirtualNetworkOptions(),
    },
    {
      kind: 'subnet',
      label: 'Subnet',
      value: getNetworkOptionDetail(
        getCatalogSubnetOptions(policy.virtualNetwork.id),
        policy.subnet.id,
      ),
      selectedId: policy.subnet.id,
      locked: policy.subnet.locked,
      options: getCatalogSubnetOptions(policy.virtualNetwork.id),
    },
    {
      kind: 'security-group',
      label: 'Security group',
      value: getNetworkOptionDetail(getCatalogSecurityGroupOptions(), policy.securityGroup.id),
      selectedId: policy.securityGroup.id,
      locked: policy.securityGroup.locked,
      options: getCatalogSecurityGroupOptions(),
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
