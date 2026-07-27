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
  getNetworkOptionDetail,
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
): CatalogNetworkPolicy {
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
): LaunchNetworkContext {
  const policy = resolvePolicyForLaunch(organization, catalogDraft, preferCatalogDraft)

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
  if (!context.enabled) {
    return 'Networking off'
  }

  const virtualNetwork =
    context.fields.find((field) => field.kind === 'virtual-network')?.options.find(
      (option) => option.id === selections.virtualNetworkId,
    )?.name ?? context.policy.virtualNetwork.name
  const subnet =
    context.fields.find((field) => field.kind === 'subnet')?.options.find(
      (option) => option.id === selections.subnetId,
    )?.name ?? context.policy.subnet.name
  const securityGroup =
    context.fields.find((field) => field.kind === 'security-group')?.options.find(
      (option) => option.id === selections.securityGroupId,
    )?.name ?? context.policy.securityGroup.name

  return `${virtualNetwork} / ${subnet} · ${securityGroup}`
}
