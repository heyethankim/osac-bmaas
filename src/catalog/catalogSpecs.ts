import type { ProviderCatalogDraft } from '../providerSetup/storage'
import type { CatalogServiceId } from '../providerSetup/templateDemo'
import {
  CATALOG_INSTANCE_TYPE_OPTIONS,
  formatClusterHostTypeLabel,
  formatClusterNodeSetLabel,
  formatClusterPlatformLabel,
  getCatalogClusterNodeTopologyModeLabel,
  getCatalogClusterVersionModeLabel,
  normalizeCatalogDiskImageDisplayLabel,
  formatCatalogDiskImageLabel,
  resolveBaremetalInstanceTypeHardware,
  resolveCatalogClusterNodeTopologyMode,
  resolveCatalogClusterVersionMode,
  type CatalogClusterNodeTopologyMode,
  type CatalogClusterVersionMode,
} from './catalogPublishConfig'
import { resolveHardwareSpecsForCatalogItem } from './hardwareSpecs'

export type CatalogSpecRow = {
  label: string
  value: string
  /** Optional status chip (e.g. Locked / Editable for cluster version). */
  badge?: {
    text: string
    color: 'blue' | 'teal' | 'grey' | 'green' | 'orange' | 'purple'
  }
}

export function getCatalogSpecRowValue(rows: CatalogSpecRow[], label: string): string {
  return rows.find((row) => row.label === label)?.value ?? '—'
}

/** Demo offering: object-level validation on `node_sets.fc430`. */
export const CLUSTER_NODE_SETS_TEMPLATE_REF_ID = 'cl-node-sets-fc430'
export const CLUSTER_NODE_SETS_TEMPLATE_NAME = 'standard-cluster-template'
export const CLUSTER_NODE_SETS_DISPLAY_NAME = 'cluster-node-sets-object'
export const CLUSTER_NODE_SETS_CATALOG_ITEM_ID = 'cat-node-sets-fc430'
/** Pre-Kubernetes-convention identifiers — matched when migrating stored catalogs. */
export const LEGACY_CLUSTER_NODE_SETS_TEMPLATE_REF_ID = 'cl_node_sets_fc430'
export const LEGACY_CLUSTER_NODE_SETS_TEMPLATE_NAME = 'cluster-node-sets-object'
export const LEGACY_CLUSTER_NODE_SETS_DISPLAY_NAME = 'Cluster - Node Sets Object'
export const LEGACY_CLUSTER_NODE_SETS_CATALOG_ITEM_ID = 'cat_NODE_SETS_FC430'
export const CLUSTER_NODE_SETS_DESCRIPTION =
  'Demonstrates a validation_schema for a whole object-valued field (node_sets.fc430), not just a single scalar leaf like node_sets.fc430.size. The whole ClusterNodeSet object is validated as a unit: host_type is pinned, and size is bounded between 1 and 4.'

export const CLUSTER_NODE_SETS_TEMPLATE_DESCRIPTION =
  'Provisions OpenShift clusters using the Assisted Installer / Hive path, including control-plane bootstrap and worker join.'

export const CLUSTER_NODE_SETS_RATE_CARD = {
  hourlyRate: 22,
  monthlyRate: 14800,
  currency: 'USD',
  billingUnit: 'per-instance' as const,
}

/** Extra detail-page rows for Cluster offerings (tenant-facing). */
const CLUSTER_NODE_SETS_DETAIL_ROWS: CatalogSpecRow[] = [
  { label: 'Worker nodes', value: '1–4 nodes' },
]

/** Demo offering: whole-array validation on `network_attachments`. */
export const VM_NETWORK_ATTACHMENTS_TEMPLATE_REF_ID = 'vm-network-attachments'
export const VM_NETWORK_ATTACHMENTS_TEMPLATE_NAME = 'vm-configurable-network-attachments'
export const VM_NETWORK_ATTACHMENTS_DISPLAY_NAME = 'vm-configurable-network-attachments'
export const VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID = 'cat-vm-net-attach'
export const LEGACY_VM_NETWORK_ATTACHMENTS_TEMPLATE_REF_ID = 'vm_network_attachments'
export const LEGACY_VM_NETWORK_ATTACHMENTS_DISPLAY_NAME =
  'VM with Configurable Network Attachments'
export const LEGACY_VM_NETWORK_ATTACHMENTS_CATALOG_ITEM_ID = 'cat_VM_NET_ATTACH'
export const VM_NETWORK_ATTACHMENTS_DESCRIPTION =
  'Virtual machine offering with a whole-array field definition for `network_attachments`. Defaults to a single NIC on the shared subnet/security group; users may edit the array to add a second NIC, but the array as a whole is capped at 2 entries via validation_schema.'

export const VM_NETWORK_ATTACHMENTS_RATE_CARD = {
  hourlyRate: 1.25,
  monthlyRate: 850,
  currency: 'USD',
  billingUnit: 'per-instance' as const,
}

const VM_NETWORK_ATTACHMENTS_SPEC_ROWS: CatalogSpecRow[] = [
  { label: 'Instance type', value: 'Standard' },
  { label: 'Size', value: '4 vCPU · 16 GB RAM' },
  { label: 'OS image', value: 'RHEL 9.4' },
]

/** Extra drawer-only rows for Virtual Machine offerings. */
const VM_NETWORK_ATTACHMENTS_DETAIL_ROWS: CatalogSpecRow[] = [
  {
    label: 'Network attachments',
    value: '1 NIC default · shared subnet/SG (max 2)',
  },
  { label: 'Boot disk', value: '100 GB · virtio' },
  { label: 'Validation', value: 'network_attachments array schema (max 2)' },
]

export function getDraftServiceId(
  item: Pick<ProviderCatalogDraft, 'serviceId'>,
): CatalogServiceId {
  return item.serviceId ?? 'baremetal'
}

/** Parse `Medium (4 vCPU · 16 GB)` from publish wizard storage. */
export function parseCatalogInstanceTypeParts(instanceTypeLabel: string): {
  label: string
  size?: string
} {
  const match = instanceTypeLabel.trim().match(/^(.*?)\s*\((.+)\)\s*$/)
  if (match) {
    return { label: match[1].trim(), size: match[2].trim() }
  }
  return { label: instanceTypeLabel.trim() }
}

/** Small / Medium / Large preset label for bare metal catalog specifications. */
export function resolveBaremetalSizeLabel(
  instanceTypeId?: string,
  instanceTypeLabel?: string,
): string | undefined {
  if (instanceTypeId) {
    const byId = CATALOG_INSTANCE_TYPE_OPTIONS.find((option) => option.id === instanceTypeId)
    if (byId) {
      return byId.label
    }
  }

  if (instanceTypeLabel?.trim()) {
    const { label } = parseCatalogInstanceTypeParts(instanceTypeLabel.trim())
    if (CATALOG_INSTANCE_TYPE_OPTIONS.some((option) => option.label === label)) {
      return label
    }
  }

  return undefined
}

export function resolveCatalogOsImage(
  item: Pick<
    ProviderCatalogDraft,
    | 'serviceId'
    | 'templateRefId'
    | 'templateName'
    | 'instanceTypeLabel'
    | 'diskImageLabel'
    | 'diskImageId'
    | 'instanceTypeId'
  >,
): string {
  const rows = resolveCatalogSpecRows(item)
  const fromDiskImage = rows.find((row) => row.label === 'Disk image')?.value?.trim()
  if (fromDiskImage) {
    return fromDiskImage
  }

  const fromOsImage = rows.find((row) => row.label === 'OS image')?.value?.trim()
  if (fromOsImage) {
    return normalizeCatalogDiskImageDisplayLabel(fromOsImage)
  }

  const fromCatalog = formatCatalogDiskImageLabel(item.diskImageId, item.diskImageLabel)
  if (fromCatalog) {
    return fromCatalog
  }

  return '—'
}

const VM_CATALOG_HIGHLIGHT_LABELS = ['Instance type', 'Size', 'OS image'] as const

/** Instance type, Size, and OS image for Virtual Machine catalog drawers. */
export function resolveVmCatalogHighlightRows(
  item: Pick<
    ProviderCatalogDraft,
    | 'serviceId'
    | 'templateRefId'
    | 'templateName'
    | 'instanceTypeLabel'
    | 'diskImageLabel'
  >,
): CatalogSpecRow[] {
  const rows = resolveCatalogSpecRows(item)
  return VM_CATALOG_HIGHLIGHT_LABELS.map((label) => rows.find((row) => row.label === label)).filter(
    (row): row is CatalogSpecRow => Boolean(row),
  )
}

function getClusterVersionModeBadge(
  mode: CatalogClusterVersionMode | undefined | null,
): CatalogSpecRow['badge'] {
  const resolved = resolveCatalogClusterVersionMode(mode)
  return {
    text: getCatalogClusterVersionModeLabel(resolved),
    color: resolved === 'editable' ? 'purple' : 'grey',
  }
}

/** Prefer stored label; fall back to id → platform label (avoids "—" when only id is set). */
function resolveClusterVersionDisplayLabel(
  item: Pick<ProviderCatalogDraft, 'diskImageLabel' | 'diskImageId'>,
): string {
  const fromLabel = item.diskImageLabel?.trim()
  if (fromLabel) {
    return formatClusterPlatformLabel(fromLabel)
  }
  const fromId = item.diskImageId?.trim()
  if (fromId) {
    return formatClusterPlatformLabel(fromId)
  }
  return ''
}

function getClusterNodeTopologyModeBadge(
  mode: CatalogClusterNodeTopologyMode | undefined | null,
): CatalogSpecRow['badge'] {
  const resolved = resolveCatalogClusterNodeTopologyMode(mode)
  return {
    text: getCatalogClusterNodeTopologyModeLabel(resolved),
    color: resolved === 'editable' ? 'purple' : 'grey',
  }
}

function resolveClusterNodeSetDisplayLabel(
  item: Pick<ProviderCatalogDraft, 'nodeSetLabel' | 'nodeSetId'>,
): string {
  return formatClusterNodeSetLabel(item.nodeSetLabel?.trim() || item.nodeSetId)
}

function resolveClusterHostTypeDisplayLabel(
  item: Pick<ProviderCatalogDraft, 'hostTypeLabel' | 'hostTypeId'>,
): string {
  return formatClusterHostTypeLabel(item.hostTypeLabel?.trim() || item.hostTypeId)
}

function buildClusterCatalogSpecRows(
  item: Pick<
    ProviderCatalogDraft,
    | 'diskImageLabel'
    | 'diskImageId'
    | 'clusterVersionMode'
    | 'nodeSetId'
    | 'nodeSetLabel'
    | 'hostTypeId'
    | 'hostTypeLabel'
    | 'clusterNodeTopologyMode'
  >,
  options?: { includeDetails?: boolean },
): CatalogSpecRow[] {
  const versionLabel = resolveClusterVersionDisplayLabel(item)
  const topologyBadge = getClusterNodeTopologyModeBadge(item.clusterNodeTopologyMode)
  const rows: CatalogSpecRow[] = [
    {
      label: 'Cluster version',
      value: versionLabel || '—',
      badge: getClusterVersionModeBadge(item.clusterVersionMode),
    },
    {
      label: 'Node set',
      value: resolveClusterNodeSetDisplayLabel(item),
      badge: topologyBadge,
    },
    {
      label: 'Host type',
      value: resolveClusterHostTypeDisplayLabel(item),
      badge: topologyBadge,
    },
  ]

  return options?.includeDetails ? [...rows, ...CLUSTER_NODE_SETS_DETAIL_ROWS] : rows
}

/** Cluster version + node topology for Cluster catalog drawers. */
export function resolveClusterCatalogHighlightRows(
  item: Pick<
    ProviderCatalogDraft,
    | 'serviceId'
    | 'templateRefId'
    | 'templateName'
    | 'instanceTypeLabel'
    | 'diskImageLabel'
    | 'diskImageId'
    | 'clusterVersionMode'
    | 'nodeSetId'
    | 'nodeSetLabel'
    | 'hostTypeId'
    | 'hostTypeLabel'
    | 'clusterNodeTopologyMode'
  >,
): CatalogSpecRow[] {
  const rows = resolveCatalogSpecRows(item)
  const labels = ['Cluster version', 'Node set', 'Host type'] as const
  return labels
    .map((label) => rows.find((row) => row.label === label))
    .filter((row): row is CatalogSpecRow => Boolean(row))
}

function resolveBaremetalDiskImageLabel(
  item: Pick<
    ProviderCatalogDraft,
    'templateRefId' | 'templateName' | 'diskImageId' | 'diskImageLabel'
  >,
  hardwareOsImage: string,
): string {
  return (
    formatCatalogDiskImageLabel(item.diskImageId, item.diskImageLabel) ??
    normalizeCatalogDiskImageDisplayLabel(hardwareOsImage)
  )
}

function buildBaremetalCatalogSpecRows(
  item: Pick<
    ProviderCatalogDraft,
    | 'templateRefId'
    | 'templateName'
    | 'instanceTypeId'
    | 'instanceTypeLabel'
    | 'diskImageId'
    | 'diskImageLabel'
  >,
): CatalogSpecRow[] {
  const hardware = resolveHardwareSpecsForCatalogItem(item)
  const diskImage = resolveBaremetalDiskImageLabel(item, hardware.osImage)
  const typeHardware = resolveBaremetalInstanceTypeHardware(
    item.instanceTypeId,
    item.instanceTypeLabel,
  )

  if (typeHardware) {
    return [
      { label: 'Size', value: typeHardware.sizeLabel },
      { label: 'CPU', value: typeHardware.cpu },
      { label: 'RAM', value: typeHardware.ram },
      { label: 'GPU', value: typeHardware.gpu },
      { label: 'Disk image', value: diskImage },
    ]
  }

  const sizeLabel = resolveBaremetalSizeLabel(item.instanceTypeId, item.instanceTypeLabel)
  const rows: CatalogSpecRow[] = []

  if (sizeLabel) {
    rows.push({ label: 'Size', value: sizeLabel })
  }

  rows.push(
    { label: 'CPU', value: hardware.cpu },
    { label: 'RAM', value: hardware.ram },
    { label: 'GPU', value: hardware.gpu },
    { label: 'Disk image', value: diskImage },
  )

  return rows
}

/** Bare metal service cards show CPU/RAM/GPU/Disk image — not the Size preset label. */
export function resolveBaremetalCatalogCardSpecRows(
  item: Parameters<typeof buildBaremetalCatalogSpecRows>[0],
): CatalogSpecRow[] {
  return buildBaremetalCatalogSpecRows(item).filter((row) => row.label !== 'Size')
}

export function resolveCatalogSpecRows(
  item: Pick<
    ProviderCatalogDraft,
    | 'serviceId'
    | 'templateRefId'
    | 'templateName'
    | 'instanceTypeId'
    | 'instanceTypeLabel'
    | 'diskImageLabel'
    | 'diskImageId'
    | 'clusterVersionMode'
    | 'nodeSetId'
    | 'nodeSetLabel'
    | 'hostTypeId'
    | 'hostTypeLabel'
    | 'clusterNodeTopologyMode'
  >,
  options?: { includeDetails?: boolean },
): CatalogSpecRow[] {
  const serviceId = getDraftServiceId(item)

  if (serviceId === 'cluster') {
    return buildClusterCatalogSpecRows(item, options)
  }

  if (serviceId === 'baremetal') {
    return buildBaremetalCatalogSpecRows(item)
  }

  if (item.instanceTypeLabel || item.diskImageLabel) {
    const rows: CatalogSpecRow[] = []

    if (serviceId === 'virtual-machine') {
      if (item.instanceTypeLabel) {
        const { label, size } = parseCatalogInstanceTypeParts(item.instanceTypeLabel)
        rows.push({ label: 'Instance type', value: label })
        if (size) {
          rows.push({ label: 'Size', value: size })
        }
      }
      if (item.diskImageLabel) {
        rows.push({ label: 'OS image', value: item.diskImageLabel })
      }
    } else {
      if (item.instanceTypeLabel) {
        rows.push({ label: 'Instance type', value: item.instanceTypeLabel })
      }
      if (item.diskImageLabel) {
        rows.push({ label: 'Disk image', value: item.diskImageLabel })
      }
    }

    if (serviceId === 'virtual-machine' && options?.includeDetails) {
      return [...rows, ...VM_NETWORK_ATTACHMENTS_DETAIL_ROWS]
    }

    return rows
  }

  if (serviceId === 'virtual-machine') {
    return options?.includeDetails
      ? [...VM_NETWORK_ATTACHMENTS_SPEC_ROWS, ...VM_NETWORK_ATTACHMENTS_DETAIL_ROWS]
      : VM_NETWORK_ATTACHMENTS_SPEC_ROWS
  }

  const hardware = resolveHardwareSpecsForCatalogItem(item)
  return [
    { label: 'CPU', value: hardware.cpu },
    { label: 'RAM', value: hardware.ram },
    { label: 'GPU', value: hardware.gpu },
    { label: 'Disk image', value: hardware.osImage },
  ]
}

export function formatCatalogConfigurationSummary(
  item: Pick<
    ProviderCatalogDraft,
    | 'serviceId'
    | 'templateRefId'
    | 'templateName'
    | 'instanceTypeLabel'
    | 'diskImageLabel'
    | 'diskImageId'
    | 'clusterVersionMode'
    | 'nodeSetId'
    | 'nodeSetLabel'
    | 'hostTypeId'
    | 'hostTypeLabel'
    | 'clusterNodeTopologyMode'
  >,
): string {
  return resolveCatalogSpecRows(item)
    .map((row) => (row.badge ? `${row.value} (${row.badge.text})` : row.value))
    .join(' · ')
}

export function getCatalogSpecsSectionLabel(serviceId: CatalogServiceId): string {
  if (serviceId === 'cluster') {
    return 'Cluster configuration'
  }
  if (serviceId === 'models') {
    return 'Model configuration'
  }
  if (serviceId === 'virtual-machine') {
    return 'Instance configuration'
  }
  return 'Hardware specifications'
}

export function getCatalogProfileFieldLabel(serviceId: CatalogServiceId): string {
  if (serviceId === 'models') {
    return 'Model profile'
  }
  return 'Linked template'
}
