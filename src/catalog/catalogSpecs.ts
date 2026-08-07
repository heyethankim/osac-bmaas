import type { ProviderCatalogDraft } from '../providerSetup/storage'
import type { CatalogServiceId } from '../providerSetup/templateDemo'
import { resolveHardwareSpecsForCatalogItem } from './hardwareSpecs'

export type CatalogSpecRow = {
  label: string
  value: string
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

const CLUSTER_NODE_SETS_SPEC_ROWS: CatalogSpecRow[] = [
  { label: 'Cluster version', value: 'Red Hat OpenShift 4.16' },
  { label: 'Control plane', value: '3× master · highly available' },
  { label: 'Node set', value: 'fc430 · worker (pinned)' },
]

/** Extra drawer-only rows for Cluster offerings. */
const CLUSTER_NODE_SETS_DETAIL_ROWS: CatalogSpecRow[] = [
  { label: 'Size range', value: '1–4 nodes' },
  { label: 'CNI', value: 'OVN-Kubernetes' },
  { label: 'Validation', value: 'ClusterNodeSet object schema' },
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

export function resolveCatalogOsImage(
  item: Pick<
    ProviderCatalogDraft,
    | 'serviceId'
    | 'templateRefId'
    | 'templateName'
    | 'instanceTypeLabel'
    | 'diskImageLabel'
  >,
): string {
  const fromRows = resolveCatalogSpecRows(item).find((row) => row.label === 'OS image')?.value
  if (fromRows) {
    return fromRows
  }
  if (item.diskImageLabel?.trim()) {
    return item.diskImageLabel.trim()
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

/** Cluster version for Cluster catalog drawers (shown above Control plane). */
export function resolveClusterCatalogHighlightRows(
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
  const clusterVersion =
    rows.find((row) => row.label === 'Cluster version') ??
    (item.diskImageLabel?.trim()
      ? { label: 'Cluster version', value: item.diskImageLabel.trim() }
      : undefined)

  return clusterVersion ? [clusterVersion] : []
}

export function resolveCatalogSpecRows(
  item: Pick<
    ProviderCatalogDraft,
    | 'serviceId'
    | 'templateRefId'
    | 'templateName'
    | 'instanceTypeLabel'
    | 'diskImageLabel'
  >,
  options?: { includeDetails?: boolean },
): CatalogSpecRow[] {
  const serviceId = getDraftServiceId(item)

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
    } else if (serviceId === 'cluster') {
      if (item.diskImageLabel) {
        rows.push({ label: 'Cluster version', value: item.diskImageLabel })
      }
      if (
        item.templateRefId === CLUSTER_NODE_SETS_TEMPLATE_REF_ID ||
        item.templateRefId === LEGACY_CLUSTER_NODE_SETS_TEMPLATE_REF_ID
      ) {
        for (const row of CLUSTER_NODE_SETS_SPEC_ROWS) {
          if (row.label === 'Cluster version') {
            continue
          }
          if (!rows.some((existing) => existing.label === row.label)) {
            rows.push(row)
          }
        }
      }
    } else {
      if (item.instanceTypeLabel) {
        rows.push({ label: 'Instance type', value: item.instanceTypeLabel })
      }
      if (item.diskImageLabel) {
        rows.push({ label: 'Disk image', value: item.diskImageLabel })
      }
    }

    if (serviceId === 'cluster' && options?.includeDetails) {
      return [...rows, ...CLUSTER_NODE_SETS_DETAIL_ROWS]
    }
    if (serviceId === 'virtual-machine' && options?.includeDetails) {
      return [...rows, ...VM_NETWORK_ATTACHMENTS_DETAIL_ROWS]
    }

    return rows
  }

  if (serviceId === 'cluster') {
    return options?.includeDetails
      ? [...CLUSTER_NODE_SETS_SPEC_ROWS, ...CLUSTER_NODE_SETS_DETAIL_ROWS]
      : CLUSTER_NODE_SETS_SPEC_ROWS
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
    { label: 'OS image', value: hardware.osImage },
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
  >,
): string {
  return resolveCatalogSpecRows(item)
    .map((row) => row.value)
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
  if (serviceId === 'cluster') {
    return 'Cluster profile'
  }
  if (serviceId === 'virtual-machine') {
    return 'VM profile'
  }
  if (serviceId === 'models') {
    return 'Model profile'
  }
  return 'Linked template'
}
