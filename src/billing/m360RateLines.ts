import type { CatalogServiceId } from '../providerSetup/templateDemo'
import type { RateCard } from '../providerSetup/templateDemo'
import type { ProviderCatalogDraft } from '../providerSetup/storage'
import { DEFAULT_ONBOARDING_RATE_CARD_ID, findM360RateCard } from './m360Accounts'

export type M360BillableService = CatalogServiceId

export type M360RateLineBillingUnit = 'per-instance' | 'per-endpoint'

export type M360RateLine = {
  id: string
  rateCardId: string
  serviceId: M360BillableService
  resourceLabel: string
  resourceShortLabel: string
  hourlyRate: number
  monthlyRate: number
  currency: string
  billingUnit: M360RateLineBillingUnit
  catalogItemId?: string
  instanceTypeId?: string
}

export const DEFAULT_M360_RATE_CARD_ID = DEFAULT_ONBOARDING_RATE_CARD_ID

/** Management-plane fee SKU used when composing cluster catalog rates. */
export const CLUSTER_CONTROL_PLANE_INSTANCE_TYPE_ID = 'cluster-control-plane'

/** Host type → bare-metal flavor used for per-worker inheritance. */
export const CLUSTER_HOST_TYPE_TO_BARE_METAL_INSTANCE_TYPE: Record<string, string> = {
  'standard-host': 'small',
  'gpu-host': 'medium',
  'storage-host': 'large',
}

/** Default worker count used for estimated totals in the publish wizard. */
export const CLUSTER_NODE_SET_DEFAULT_WORKER_COUNT: Record<string, number> = {
  'fc430-worker': 3,
  'fc430-infra': 2,
  'fc430-gpu': 2,
}

const DEMO_CATALOG_ITEM_IDS = {
  bareMetalGpuTraining: 'cat-bm-gpu-training',
  bareMetalDenseGpu: 'cat-bm-dense-gpu',
  clusterNodeSets: 'cat-node-sets-fc430',
  vmNetworkAttachments: 'cat-vm-net-attach',
} as const

function line(
  partial: Omit<M360RateLine, 'currency'> & { currency?: string },
): M360RateLine {
  return {
    currency: 'USD',
    ...partial,
  }
}

/** Billable SKU lines seeded per M360 rate card profile. */
export const DEMO_M360_RATE_LINES: M360RateLine[] = [
  // Enterprise — US
  line({
    id: 'line-enterprise-us-bm-small',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'baremetal',
    resourceLabel: 'Small · 16 vCPU · 128 GB · CPU-only',
    resourceShortLabel: 'Bare metal — Small',
    hourlyRate: 3.2,
    monthlyRate: 2150,
    billingUnit: 'per-instance',
    instanceTypeId: 'small',
  }),
  line({
    id: 'line-enterprise-us-bm-medium',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'baremetal',
    resourceLabel: 'Medium · 32 vCPU · 256 GB · A100 40 GB',
    resourceShortLabel: 'Bare metal — Medium',
    hourlyRate: 8.5,
    monthlyRate: 5200,
    billingUnit: 'per-instance',
    catalogItemId: DEMO_CATALOG_ITEM_IDS.bareMetalDenseGpu,
    instanceTypeId: 'medium',
  }),
  line({
    id: 'line-enterprise-us-bm-large',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'baremetal',
    resourceLabel: 'Large · 64 vCPU · 512 GB · A100 80 GB',
    resourceShortLabel: 'Bare metal — Large',
    hourlyRate: 4.25,
    monthlyRate: 2850,
    billingUnit: 'per-instance',
    catalogItemId: DEMO_CATALOG_ITEM_IDS.bareMetalGpuTraining,
    instanceTypeId: 'large',
  }),
  line({
    id: 'line-enterprise-us-cluster-control-plane',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'cluster',
    resourceLabel: 'Control plane · management plane fee',
    resourceShortLabel: 'Cluster — Control plane',
    hourlyRate: 6.75,
    monthlyRate: 4536,
    billingUnit: 'per-instance',
    instanceTypeId: CLUSTER_CONTROL_PLANE_INSTANCE_TYPE_ID,
  }),
  // Package SKUs: Rates page shows composed totals (control plane + workers).
  // Control-plane line stays in data for composition lookups, not as a standalone package.
  line({
    id: 'line-enterprise-us-cluster-small',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'cluster',
    resourceLabel: 'OpenShift small · 3 control plane · 3 workers',
    resourceShortLabel: 'Cluster — OpenShift small',
    hourlyRate: 16.35,
    monthlyRate: 10986,
    billingUnit: 'per-instance',
    catalogItemId: DEMO_CATALOG_ITEM_IDS.clusterNodeSets,
    instanceTypeId: 'ocp-small',
  }),
  line({
    id: 'line-enterprise-us-cluster-medium',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'cluster',
    resourceLabel: 'OpenShift medium · 3 control plane · 6 workers',
    resourceShortLabel: 'Cluster — OpenShift medium',
    hourlyRate: 25.95,
    monthlyRate: 17436,
    billingUnit: 'per-instance',
    instanceTypeId: 'ocp-medium',
  }),
  line({
    id: 'line-enterprise-us-cluster-gpu',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'cluster',
    resourceLabel: 'OpenShift GPU · 3 control plane · 2 GPU workers',
    resourceShortLabel: 'Cluster — OpenShift GPU',
    hourlyRate: 23.75,
    monthlyRate: 14936,
    billingUnit: 'per-instance',
    instanceTypeId: 'ocp-gpu',
  }),
  line({
    id: 'line-enterprise-us-vm-small',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'virtual-machine',
    resourceLabel: 'Small · 4 vCPU · 16 GB',
    resourceShortLabel: 'Virtual machine — Small',
    hourlyRate: 0.48,
    monthlyRate: 320,
    billingUnit: 'per-instance',
    instanceTypeId: 'small',
  }),
  line({
    id: 'line-enterprise-us-vm-medium',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'virtual-machine',
    resourceLabel: 'Medium · 8 vCPU · 32 GB',
    resourceShortLabel: 'Virtual machine — Medium',
    hourlyRate: 0.96,
    monthlyRate: 640,
    billingUnit: 'per-instance',
    instanceTypeId: 'medium',
  }),
  line({
    id: 'line-enterprise-us-vm-large',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'virtual-machine',
    resourceLabel: 'Large · 16 vCPU · 64 GB',
    resourceShortLabel: 'Virtual machine — Large',
    hourlyRate: 1.92,
    monthlyRate: 1280,
    billingUnit: 'per-instance',
    instanceTypeId: 'large',
  }),
  line({
    id: 'line-enterprise-us-vm-net',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'virtual-machine',
    resourceLabel: 'Multi-NIC · 4 vCPU · 16 GB',
    resourceShortLabel: 'Virtual machine — Multi-NIC',
    hourlyRate: 1.25,
    monthlyRate: 850,
    billingUnit: 'per-instance',
    catalogItemId: DEMO_CATALOG_ITEM_IDS.vmNetworkAttachments,
    instanceTypeId: 'small',
  }),
  line({
    id: 'line-enterprise-us-model-small',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'models',
    resourceLabel: 'Inference small · 2 vCPU · 8 GiB · 1 replica',
    resourceShortLabel: 'Models — Inference small',
    hourlyRate: 0.18,
    monthlyRate: 120,
    billingUnit: 'per-endpoint',
    instanceTypeId: 'model-small',
  }),
  line({
    id: 'line-enterprise-us-model-medium',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'models',
    resourceLabel: 'Inference medium · 4 vCPU · 16 GiB · 2 replicas',
    resourceShortLabel: 'Models — Inference medium',
    hourlyRate: 0.42,
    monthlyRate: 280,
    billingUnit: 'per-endpoint',
    instanceTypeId: 'model-medium',
  }),
  line({
    id: 'line-enterprise-us-model-gpu',
    rateCardId: 'rate-enterprise-us',
    serviceId: 'models',
    resourceLabel: 'GPU model serving · A100-backed runtime',
    resourceShortLabel: 'Models — GPU serving',
    hourlyRate: 2.4,
    monthlyRate: 1600,
    billingUnit: 'per-endpoint',
    instanceTypeId: 'model-gpu',
  }),

  // Enterprise — EU (higher regional multiplier on key lines)
  line({
    id: 'line-enterprise-eu-bm-large',
    rateCardId: 'rate-enterprise-eu',
    serviceId: 'baremetal',
    resourceLabel: 'Large · 64 vCPU · 512 GB · A100 80 GB',
    resourceShortLabel: 'Bare metal — Large',
    hourlyRate: 4.68,
    monthlyRate: 3135,
    billingUnit: 'per-instance',
    catalogItemId: DEMO_CATALOG_ITEM_IDS.bareMetalGpuTraining,
    instanceTypeId: 'large',
  }),
  line({
    id: 'line-enterprise-eu-cluster-control-plane',
    rateCardId: 'rate-enterprise-eu',
    serviceId: 'cluster',
    resourceLabel: 'Control plane · management plane fee',
    resourceShortLabel: 'Cluster — Control plane',
    hourlyRate: 7.43,
    monthlyRate: 4993,
    billingUnit: 'per-instance',
    instanceTypeId: CLUSTER_CONTROL_PLANE_INSTANCE_TYPE_ID,
  }),
  line({
    id: 'line-enterprise-eu-bm-small',
    rateCardId: 'rate-enterprise-eu',
    serviceId: 'baremetal',
    resourceLabel: 'Small · 16 vCPU · 128 GB · CPU-only',
    resourceShortLabel: 'Bare metal — Small',
    hourlyRate: 3.52,
    monthlyRate: 2365,
    billingUnit: 'per-instance',
    instanceTypeId: 'small',
  }),
  line({
    id: 'line-enterprise-eu-bm-medium',
    rateCardId: 'rate-enterprise-eu',
    serviceId: 'baremetal',
    resourceLabel: 'Medium · 32 vCPU · 256 GB · A100 40 GB',
    resourceShortLabel: 'Bare metal — Medium',
    hourlyRate: 9.35,
    monthlyRate: 5720,
    billingUnit: 'per-instance',
    instanceTypeId: 'medium',
  }),
  line({
    id: 'line-enterprise-eu-cluster-small',
    rateCardId: 'rate-enterprise-eu',
    serviceId: 'cluster',
    resourceLabel: 'OpenShift small · 3 control plane · 3 workers',
    resourceShortLabel: 'Cluster — OpenShift small',
    hourlyRate: 24.2,
    monthlyRate: 16280,
    billingUnit: 'per-instance',
    instanceTypeId: 'ocp-small',
  }),

  // Standard — US (subset)
  line({
    id: 'line-standard-us-bm-small',
    rateCardId: 'rate-standard-us',
    serviceId: 'baremetal',
    resourceLabel: 'Small · 16 vCPU · 128 GB · CPU-only',
    resourceShortLabel: 'Bare metal — Small',
    hourlyRate: 3.84,
    monthlyRate: 2580,
    billingUnit: 'per-instance',
    instanceTypeId: 'small',
  }),
  line({
    id: 'line-standard-us-bm-medium',
    rateCardId: 'rate-standard-us',
    serviceId: 'baremetal',
    resourceLabel: 'Medium · 32 vCPU · 256 GB · A100 40 GB',
    resourceShortLabel: 'Bare metal — Medium',
    hourlyRate: 10.2,
    monthlyRate: 6240,
    billingUnit: 'per-instance',
    instanceTypeId: 'medium',
  }),
  line({
    id: 'line-standard-us-bm-large',
    rateCardId: 'rate-standard-us',
    serviceId: 'baremetal',
    resourceLabel: 'Large · 64 vCPU · 512 GB · A100 80 GB',
    resourceShortLabel: 'Bare metal — Large',
    hourlyRate: 5.1,
    monthlyRate: 3420,
    billingUnit: 'per-instance',
    catalogItemId: DEMO_CATALOG_ITEM_IDS.bareMetalGpuTraining,
    instanceTypeId: 'large',
  }),
  line({
    id: 'line-standard-us-cluster-control-plane',
    rateCardId: 'rate-standard-us',
    serviceId: 'cluster',
    resourceLabel: 'Control plane · management plane fee',
    resourceShortLabel: 'Cluster — Control plane',
    hourlyRate: 8.1,
    monthlyRate: 5443,
    billingUnit: 'per-instance',
    instanceTypeId: CLUSTER_CONTROL_PLANE_INSTANCE_TYPE_ID,
  }),
  line({
    id: 'line-standard-us-cluster-small',
    rateCardId: 'rate-standard-us',
    serviceId: 'cluster',
    resourceLabel: 'OpenShift small · 3 control plane · 3 workers',
    resourceShortLabel: 'Cluster — OpenShift small',
    hourlyRate: 26,
    monthlyRate: 17480,
    billingUnit: 'per-instance',
    instanceTypeId: 'ocp-small',
  }),

  // Government — US
  line({
    id: 'line-gov-us-bm-large',
    rateCardId: 'rate-gov-us',
    serviceId: 'baremetal',
    resourceLabel: 'Large · 64 vCPU · 512 GB · A100 80 GB',
    resourceShortLabel: 'Bare metal — Large',
    hourlyRate: 4.85,
    monthlyRate: 3250,
    billingUnit: 'per-instance',
    catalogItemId: DEMO_CATALOG_ITEM_IDS.bareMetalGpuTraining,
    instanceTypeId: 'large',
  }),
]

const SERVICE_LABELS: Record<M360BillableService, string> = {
  baremetal: 'Bare metal',
  cluster: 'Cluster',
  'virtual-machine': 'Virtual machine',
  models: 'Models',
}

export function getM360RateLineServiceLabel(serviceId: M360BillableService): string {
  return SERVICE_LABELS[serviceId]
}

export type M360RateLineServiceGroup = {
  serviceId: M360BillableService
  label: string
  lines: M360RateLine[]
}

/** Group rate lines by service, with services and resources sorted A–Z. */
export function groupM360RateLinesByService(
  lines: readonly M360RateLine[],
): M360RateLineServiceGroup[] {
  const byService = new Map<M360BillableService, M360RateLine[]>()

  for (const line of lines) {
    const existing = byService.get(line.serviceId)
    if (existing) {
      existing.push(line)
    } else {
      byService.set(line.serviceId, [line])
    }
  }

  return [...byService.entries()]
    .map(([serviceId, serviceLines]) => ({
      serviceId,
      label: getM360RateLineServiceLabel(serviceId),
      lines: [...serviceLines].sort((left, right) =>
        left.resourceLabel.localeCompare(right.resourceLabel, undefined, {
          sensitivity: 'base',
        }),
      ),
    }))
    .sort((left, right) =>
      left.label.localeCompare(right.label, undefined, { sensitivity: 'base' }),
    )
}

export function listM360RateLines(rateCardId?: string): M360RateLine[] {
  if (!rateCardId?.trim()) {
    return [...DEMO_M360_RATE_LINES]
  }

  const normalized = rateCardId.trim()
  return DEMO_M360_RATE_LINES.filter((entry) => entry.rateCardId === normalized)
}

export function m360RateLineToRateCard(line: M360RateLine): RateCard {
  return {
    hourlyRate: line.hourlyRate,
    monthlyRate: line.monthlyRate,
    currency: line.currency,
    billingUnit: line.billingUnit === 'per-endpoint' ? 'per-instance' : 'per-instance',
  }
}

export function formatM360RateLineSummary(line: M360RateLine): string {
  const hourly = line.hourlyRate.toFixed(2)
  const monthly = line.monthlyRate.toLocaleString('en-US', { maximumFractionDigits: 0 })
  const unit = line.billingUnit === 'per-endpoint' ? 'per endpoint' : 'per instance'
  return `$${hourly}/hr · $${monthly}/mo ${unit}`
}

export function formatM360RateLineCatalogSummary(line: M360RateLine): string {
  return `${formatM360RateLineSummary(line)} for ${line.resourceShortLabel}`
}

type CatalogRateLineMatchInput = Pick<
  ProviderCatalogDraft,
  'catalogItemId' | 'serviceId' | 'instanceTypeId'
>

export function findM360RateLineForCatalogItem(
  item: CatalogRateLineMatchInput,
  rateCardId: string,
): M360RateLine | null {
  const lines = listM360RateLines(rateCardId)
  const byCatalogId = lines.find((line) => line.catalogItemId === item.catalogItemId)
  if (byCatalogId) {
    return byCatalogId
  }

  const serviceId = item.serviceId ?? 'baremetal'
  const instanceTypeId = item.instanceTypeId?.trim()
  if (!instanceTypeId) {
    return null
  }

  return (
    lines.find(
      (line) => line.serviceId === serviceId && line.instanceTypeId === instanceTypeId,
    ) ?? null
  )
}

export function resolveCatalogItemMappedCatalogName(
  line: M360RateLine,
  catalogItems: readonly ProviderCatalogDraft[],
): string | null {
  if (!line.catalogItemId) {
    return null
  }

  return (
    catalogItems.find((item) => item.catalogItemId === line.catalogItemId)?.displayName ?? null
  )
}

export function countM360RateLines(rateCardId: string): number {
  return listM360RateLines(rateCardId).length
}

export function listM360RateLineHeadlines(rateCardId: string, limit = 3): string[] {
  return listM360RateLines(rateCardId)
    .slice(0, limit)
    .map((entry) => formatM360RateLineCatalogSummary(entry))
}

export function getM360RateCardDisplayName(rateCardId: string): string {
  return findM360RateCard(rateCardId)?.name ?? rateCardId
}

export function findM360RateLineForPublishSelection(
  serviceId: CatalogServiceId,
  instanceTypeId: string,
  rateCardId = DEFAULT_M360_RATE_CARD_ID,
): M360RateLine | null {
  const normalizedInstanceTypeId = instanceTypeId.trim()
  if (!normalizedInstanceTypeId) {
    return null
  }

  return findM360RateLineForCatalogItem(
    {
      catalogItemId: '',
      serviceId,
      instanceTypeId: normalizedInstanceTypeId,
    },
    rateCardId,
  )
}

export type ClusterComposedRateEstimate = {
  controlPlane: M360RateLine
  worker: M360RateLine
  workerCount: number
  nodeSetId: string
  hostTypeId: string
  hourlyRate: number
  monthlyRate: number
  currency: string
  rateCardId: string
}

export function mapClusterHostTypeToBareMetalInstanceType(
  hostTypeId: string | undefined | null,
): string | null {
  const normalized = hostTypeId?.trim()
  if (!normalized) {
    return null
  }
  return CLUSTER_HOST_TYPE_TO_BARE_METAL_INSTANCE_TYPE[normalized] ?? null
}

export function getDefaultClusterWorkerCount(nodeSetId: string | undefined | null): number {
  const normalized = nodeSetId?.trim()
  if (!normalized) {
    return CLUSTER_NODE_SET_DEFAULT_WORKER_COUNT['fc430-worker']
  }
  return CLUSTER_NODE_SET_DEFAULT_WORKER_COUNT[normalized] ?? 3
}

/** Derive legacy ocp-* id for storage/compat from topology defaults. */
export function deriveClusterInstanceTypeId(
  nodeSetId: string | undefined | null,
  hostTypeId: string | undefined | null,
): string {
  const normalizedHost = hostTypeId?.trim()
  const normalizedNodeSet = nodeSetId?.trim()
  if (normalizedHost === 'gpu-host' || normalizedNodeSet === 'fc430-gpu') {
    return 'ocp-gpu'
  }
  if (getDefaultClusterWorkerCount(normalizedNodeSet) >= 6) {
    return 'ocp-medium'
  }
  return 'ocp-small'
}

export function resolveClusterComposedRateEstimate(
  nodeSetId: string,
  hostTypeId: string,
  rateCardId = DEFAULT_M360_RATE_CARD_ID,
  options?: { workerCount?: number },
): ClusterComposedRateEstimate | null {
  const controlPlane = findM360RateLineForPublishSelection(
    'cluster',
    CLUSTER_CONTROL_PLANE_INSTANCE_TYPE_ID,
    rateCardId,
  )
  const workerInstanceTypeId = mapClusterHostTypeToBareMetalInstanceType(hostTypeId)
  if (!controlPlane || !workerInstanceTypeId) {
    return null
  }

  const worker = findM360RateLineForPublishSelection(
    'baremetal',
    workerInstanceTypeId,
    rateCardId,
  )
  if (!worker) {
    return null
  }

  const workerCount = options?.workerCount ?? getDefaultClusterWorkerCount(nodeSetId)
  const hourlyRate =
    Math.round((controlPlane.hourlyRate + workerCount * worker.hourlyRate) * 100) / 100
  const monthlyRate = Math.round(
    controlPlane.monthlyRate + workerCount * worker.monthlyRate,
  )

  return {
    controlPlane,
    worker,
    workerCount,
    nodeSetId,
    hostTypeId,
    hourlyRate,
    monthlyRate,
    currency: controlPlane.currency,
    rateCardId,
  }
}

/** Topology used to compose the OpenShift package SKUs on the Rates page. */
const CLUSTER_PACKAGE_COMPOSE: Record<
  string,
  { nodeSetId: string; hostTypeId: string; workerCount?: number }
> = {
  'ocp-small': { nodeSetId: 'fc430-worker', hostTypeId: 'standard-host' },
  'ocp-medium': { nodeSetId: 'fc430-worker', hostTypeId: 'standard-host', workerCount: 6 },
  'ocp-gpu': { nodeSetId: 'fc430-gpu', hostTypeId: 'gpu-host' },
}

export function resolveClusterPackageComposedEstimate(
  instanceTypeId: string | undefined | null,
  rateCardId = DEFAULT_M360_RATE_CARD_ID,
): ClusterComposedRateEstimate | null {
  const normalized = instanceTypeId?.trim()
  if (!normalized) {
    return null
  }
  const topology = CLUSTER_PACKAGE_COMPOSE[normalized]
  if (!topology) {
    return null
  }
  return resolveClusterComposedRateEstimate(
    topology.nodeSetId,
    topology.hostTypeId,
    rateCardId,
    topology.workerCount !== undefined ? { workerCount: topology.workerCount } : undefined,
  )
}

export type M360RatesPageRow = {
  id: string
  resourceLabel: string
  rateSummary: string
  rateDetail?: string
  catalogItemId: string | null
  catalogDisplayName: string | null
}

export type M360RatesPageServiceGroup = {
  serviceId: M360BillableService
  label: string
  rows: M360RatesPageRow[]
}

/**
 * Rates page groups: control-plane fee is baked into OpenShift package rows
 * (not listed as its own package).
 */
export function listM360RatesPageServiceGroups(
  catalogItems: readonly ProviderCatalogDraft[],
  rateCardId = DEFAULT_M360_RATE_CARD_ID,
): M360RatesPageServiceGroup[] {
  const lines = listM360RateLines(rateCardId).filter(
    (line) => line.instanceTypeId !== CLUSTER_CONTROL_PLANE_INSTANCE_TYPE_ID,
  )

  return groupM360RateLinesByService(lines).map((group) => ({
    serviceId: group.serviceId,
    label: group.label,
    rows: group.lines.map((line) => {
      const estimate =
        group.serviceId === 'cluster'
          ? resolveClusterPackageComposedEstimate(line.instanceTypeId, rateCardId)
          : null

      return {
        id: line.id,
        resourceLabel: line.resourceLabel,
        rateSummary: estimate
          ? `${formatClusterComposedRateSummary(estimate)} per instance`
          : formatM360RateLineSummary(line),
        rateDetail: estimate ? formatClusterComposedRateBreakdown(estimate) : undefined,
        catalogItemId: line.catalogItemId?.trim() || null,
        catalogDisplayName: resolveCatalogItemMappedCatalogName(line, catalogItems),
      }
    }),
  }))
}

export function clusterComposedRateToRateCard(
  estimate: ClusterComposedRateEstimate,
): RateCard {
  return {
    hourlyRate: estimate.hourlyRate,
    monthlyRate: estimate.monthlyRate,
    currency: estimate.currency,
    billingUnit: 'per-instance',
  }
}

export function formatClusterComposedRateSummary(
  estimate: ClusterComposedRateEstimate,
): string {
  const hourly = estimate.hourlyRate.toFixed(2)
  const monthly = estimate.monthlyRate.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return `$${hourly}/hr · $${monthly}/mo`
}

export function formatClusterComposedRateBreakdown(
  estimate: ClusterComposedRateEstimate,
): string {
  const cp = estimate.controlPlane.hourlyRate.toFixed(2)
  const workerSubtotal = (estimate.workerCount * estimate.worker.hourlyRate).toFixed(2)
  return `Control plane $${cp}/hr · Workers $${workerSubtotal}/hr`
}

export function formatClusterComposedWorkerLineLabel(
  estimate: ClusterComposedRateEstimate,
): string {
  const flavor =
    estimate.worker.resourceShortLabel.replace(/^Bare metal —\s*/i, '').trim() ||
    estimate.worker.resourceShortLabel
  return `${estimate.workerCount} × ${flavor}`
}
