import type { ExternalIpPool, ExternalIpPoolIpFamily } from '../providerAdmin/externalIpPools'
import { getExternalIpPoolCidrs } from '../providerAdmin/externalIpPools'
import type {
  NatGatewayProfile,
  ProviderSecurityGroup,
  ProviderSubnet,
  ProviderVirtualNetwork,
} from '../providerAdmin/networkInventory'
import type { IdentityProviderDraft } from '../idpManager/identityProviders'
import { identityProviderProtocolLabel } from '../providerAdmin/organizations'
import {
  editSnapshotValue,
  getEditChanges,
  getEditModifiedStepIds,
  type EditSnapshotValue,
} from '../shared/editDiff'

export type NetworkInventoryEditStepId =
  | 'virtual-network'
  | 'subnet'
  | 'security-group'
  | 'pool'
  | 'details'
  | 'addressing'
  | 'nat-gateway'
  | 'identity-provider'

type VirtualNetworkEditForm = {
  detail: string
  cidr: string
  ipv6Cidr: string
}

type VirtualNetworkEditSnapshot = Record<keyof VirtualNetworkEditForm, EditSnapshotValue>

type SubnetEditForm = {
  detail: string
  virtualNetworkId: string
  cidr: string
  vlan: string
}

type SubnetEditSnapshot = Record<keyof SubnetEditForm, EditSnapshotValue>

type SecurityGroupEditForm = {
  detail: string
  virtualNetworkId: string
  inboundRules: string
  outboundRules: string
}

type SecurityGroupEditSnapshot = Record<keyof SecurityGroupEditForm, EditSnapshotValue>

type ExternalIpPoolEditForm = {
  cidr: string
  dataCenter: string
  totalAddresses: string
}

type ProviderExternalIpPoolEditForm = {
  description: string
  ipFamily: ExternalIpPoolIpFamily
  cidrs: string[]
}

type ExternalIpPoolEditSnapshot = Record<keyof ExternalIpPoolEditForm, EditSnapshotValue>

type ProviderExternalIpPoolEditSnapshot = Record<
  keyof ProviderExternalIpPoolEditForm,
  EditSnapshotValue
>

type NatGatewayEditSnapshot = {
  profile: EditSnapshotValue
}

function formatVirtualNetworkLabel(
  networkId: string,
  virtualNetworks: readonly ProviderVirtualNetwork[],
): string {
  const network = virtualNetworks.find((entry) => entry.id === networkId)
  return network ? `${network.name} (${network.cidr})` : '—'
}

function formatNatGatewayProfileLabel(profile: NatGatewayProfile | null): string {
  return profile ? `${profile.name} · ${profile.publicIp}` : '—'
}

export function buildVirtualNetworkEditSnapshot(form: VirtualNetworkEditForm): VirtualNetworkEditSnapshot {
  return {
    detail: editSnapshotValue(form.detail, form.detail.trim() || '—'),
    cidr: editSnapshotValue(form.cidr, form.cidr.trim() || '—'),
    ipv6Cidr: editSnapshotValue(form.ipv6Cidr, form.ipv6Cidr.trim() || '—'),
  }
}

export function buildVirtualNetworkEditSnapshotFromNetwork(
  network: ProviderVirtualNetwork,
): VirtualNetworkEditSnapshot {
  return buildVirtualNetworkEditSnapshot({
    detail: network.detail,
    cidr: network.cidr,
    ipv6Cidr: network.ipv6Cidr ?? '',
  })
}

export function getVirtualNetworkEditChanges(
  baseline: VirtualNetworkEditSnapshot,
  current: VirtualNetworkEditSnapshot,
) {
  return getEditChanges(baseline, current, [
    { id: 'detail', stepId: 'virtual-network', label: 'Description' },
    { id: 'cidr', stepId: 'virtual-network', label: 'IPv4 CIDR' },
    { id: 'ipv6Cidr', stepId: 'virtual-network', label: 'IPv6 CIDR' },
  ])
}

export function buildSubnetEditSnapshot(
  form: SubnetEditForm,
  virtualNetworks: readonly ProviderVirtualNetwork[],
): SubnetEditSnapshot {
  return {
    detail: editSnapshotValue(form.detail, form.detail.trim() || '—'),
    virtualNetworkId: editSnapshotValue(
      form.virtualNetworkId,
      formatVirtualNetworkLabel(form.virtualNetworkId, virtualNetworks),
    ),
    cidr: editSnapshotValue(form.cidr, form.cidr.trim() || '—'),
    vlan: editSnapshotValue(form.vlan, form.vlan.trim() || '—'),
  }
}

export function buildSubnetEditSnapshotFromSubnet(
  subnet: ProviderSubnet,
  virtualNetworks: readonly ProviderVirtualNetwork[],
): SubnetEditSnapshot {
  return buildSubnetEditSnapshot(
    {
      detail: subnet.detail,
      virtualNetworkId: subnet.virtualNetworkId,
      cidr: subnet.cidr,
      vlan: subnet.vlan,
    },
    virtualNetworks,
  )
}

export function getSubnetEditChanges(
  baseline: SubnetEditSnapshot,
  current: SubnetEditSnapshot,
) {
  return getEditChanges(baseline, current, [
    { id: 'detail', stepId: 'subnet', label: 'Description' },
    { id: 'virtualNetworkId', stepId: 'subnet', label: 'Virtual network' },
    { id: 'cidr', stepId: 'subnet', label: 'CIDR' },
    { id: 'vlan', stepId: 'subnet', label: 'VLAN' },
  ])
}

export function buildSecurityGroupEditSnapshot(
  form: SecurityGroupEditForm,
  virtualNetworks: readonly ProviderVirtualNetwork[],
): SecurityGroupEditSnapshot {
  return {
    detail: editSnapshotValue(form.detail, form.detail.trim() || '—'),
    virtualNetworkId: editSnapshotValue(
      form.virtualNetworkId,
      formatVirtualNetworkLabel(form.virtualNetworkId, virtualNetworks),
    ),
    inboundRules: editSnapshotValue(form.inboundRules, form.inboundRules.trim() || 'None'),
    outboundRules: editSnapshotValue(form.outboundRules, form.outboundRules.trim() || 'Allow all'),
  }
}

export function buildSecurityGroupEditSnapshotFromGroup(
  group: ProviderSecurityGroup,
  virtualNetworks: readonly ProviderVirtualNetwork[],
): SecurityGroupEditSnapshot {
  return buildSecurityGroupEditSnapshot(
    {
      detail: group.detail,
      virtualNetworkId: group.virtualNetworkId,
      inboundRules: group.inboundRules,
      outboundRules: group.outboundRules,
    },
    virtualNetworks,
  )
}

export function getSecurityGroupEditChanges(
  baseline: SecurityGroupEditSnapshot,
  current: SecurityGroupEditSnapshot,
) {
  return getEditChanges(baseline, current, [
    { id: 'detail', stepId: 'security-group', label: 'Description' },
    { id: 'virtualNetworkId', stepId: 'security-group', label: 'Virtual network' },
    { id: 'inboundRules', stepId: 'security-group', label: 'Inbound rules' },
    { id: 'outboundRules', stepId: 'security-group', label: 'Outbound rules' },
  ])
}

export function buildExternalIpPoolEditSnapshot(form: ExternalIpPoolEditForm): ExternalIpPoolEditSnapshot {
  const totalAddresses = Number.parseInt(form.totalAddresses, 10)
  return {
    cidr: editSnapshotValue(form.cidr, form.cidr.trim() || '—'),
    dataCenter: editSnapshotValue(form.dataCenter, form.dataCenter.trim() || '—'),
    totalAddresses: editSnapshotValue(
      form.totalAddresses,
      Number.isFinite(totalAddresses) ? totalAddresses.toLocaleString() : '—',
    ),
  }
}

export function buildExternalIpPoolEditSnapshotFromPool(pool: ExternalIpPool): ExternalIpPoolEditSnapshot {
  return buildExternalIpPoolEditSnapshot({
    cidr: pool.cidr,
    dataCenter: pool.dataCenter,
    totalAddresses: String(pool.totalAddresses),
  })
}

export function getExternalIpPoolEditChanges(
  baseline: ExternalIpPoolEditSnapshot,
  current: ExternalIpPoolEditSnapshot,
) {
  return getEditChanges(baseline, current, [
    { id: 'cidr', stepId: 'pool', label: 'CIDR' },
    { id: 'dataCenter', stepId: 'pool', label: 'Data center' },
    { id: 'totalAddresses', stepId: 'pool', label: 'Total addresses' },
  ])
}

export function buildProviderExternalIpPoolEditSnapshot(
  form: ProviderExternalIpPoolEditForm,
): ProviderExternalIpPoolEditSnapshot {
  const normalizedCidrs = form.cidrs.map((cidr) => cidr.trim()).filter(Boolean)

  return {
    description: editSnapshotValue(form.description, form.description.trim() || '—'),
    ipFamily: editSnapshotValue(form.ipFamily, form.ipFamily),
    cidrs: editSnapshotValue(
      normalizedCidrs.join('\n'),
      normalizedCidrs.length > 0 ? normalizedCidrs.join(', ') : '—',
    ),
  }
}

export function buildProviderExternalIpPoolEditSnapshotFromPool(
  pool: ExternalIpPool,
): ProviderExternalIpPoolEditSnapshot {
  return buildProviderExternalIpPoolEditSnapshot({
    description: pool.description ?? '',
    ipFamily: pool.ipFamily ?? 'IPv4',
    cidrs: getExternalIpPoolCidrs(pool),
  })
}

export function getProviderExternalIpPoolEditChanges(
  baseline: ProviderExternalIpPoolEditSnapshot,
  current: ProviderExternalIpPoolEditSnapshot,
) {
  return getEditChanges(baseline, current, [
    { id: 'description', stepId: 'addressing', label: 'Description' },
    { id: 'ipFamily', stepId: 'addressing', label: 'IP family' },
    { id: 'cidrs', stepId: 'addressing', label: 'CIDR' },
  ])
}

export function buildNatGatewayEditSnapshot(profile: NatGatewayProfile | null): NatGatewayEditSnapshot {
  return {
    profile: editSnapshotValue(profile?.id ?? '', formatNatGatewayProfileLabel(profile)),
  }
}

export function getNatGatewayEditChanges(
  baseline: NatGatewayEditSnapshot,
  current: NatGatewayEditSnapshot,
) {
  return getEditChanges(baseline, current, [
    { id: 'profile', stepId: 'nat-gateway', label: 'NAT gateway' },
  ])
}

export function getNetworkInventoryEditModifiedStepIds(
  changes: ReadonlyArray<{ stepId: NetworkInventoryEditStepId }>,
) {
  return getEditModifiedStepIds(changes)
}

type IdentityProviderEditSnapshot = Record<
  keyof Pick<IdentityProviderDraft, 'protocol' | 'displayName' | 'issuerUrl' | 'clientId'>,
  EditSnapshotValue
>

export function buildIdentityProviderEditSnapshot(draft: IdentityProviderDraft): IdentityProviderEditSnapshot {
  return {
    protocol: editSnapshotValue(
      draft.protocol,
      identityProviderProtocolLabel(draft.protocol),
    ),
    displayName: editSnapshotValue(draft.displayName, draft.displayName.trim() || '—'),
    issuerUrl: editSnapshotValue(draft.issuerUrl, draft.issuerUrl.trim() || '—'),
    clientId: editSnapshotValue(draft.clientId, draft.clientId.trim() || '—'),
  }
}

export function getIdentityProviderEditChanges(
  baseline: IdentityProviderEditSnapshot,
  current: IdentityProviderEditSnapshot,
) {
  return getEditChanges(baseline, current, [
    { id: 'protocol', stepId: 'identity-provider', label: 'Protocol' },
    { id: 'displayName', stepId: 'identity-provider', label: 'Display name' },
    { id: 'issuerUrl', stepId: 'identity-provider', label: 'Issuer URL' },
    { id: 'clientId', stepId: 'identity-provider', label: 'Client ID' },
  ])
}

export function getIdentityProviderEditModifiedStepIds(
  changes: ReadonlyArray<{ stepId: 'identity-provider' }>,
) {
  return getEditModifiedStepIds(changes)
}
