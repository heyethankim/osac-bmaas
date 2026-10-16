import {
  DEFAULT_CLUSTER_HOST_TYPE_ID,
  DEFAULT_CLUSTER_NODE_SET_ID,
  getCatalogClusterHostTypeOptions,
  getCatalogClusterMachineTypeOptions,
  getCatalogDiskImageOptions,
  getCatalogInstanceTypeOptions,
  resolveCatalogClusterNodeTopologyMode,
  resolveCatalogClusterTopology,
  resolveCatalogHardwareOsMode,
  resolveCatalogOsImageMode,
} from '../catalog/catalogPublishConfig'
import type { CatalogServiceId, RateCard } from '../providerSetup/templateDemo'
import { DEFAULT_M360_RATE_CARD_ID } from './m360RateLines'
import {
  resolveBareMetalComposedRateEstimate,
  resolveClusterComposedRateEstimate,
  resolveClusterTopologyMachineRateEstimate,
} from './m360RateLines'

/** Fields needed to decide whether catalog browse should show a price range. */
export type CatalogItemPriceRangeInput = {
  serviceId?: CatalogServiceId | null
  instanceTypeId?: string
  diskImageId?: string
  hardwareOsMode?: 'locked' | 'editable'
  osImageMode?: 'locked' | 'editable'
  clusterNodeTopologyMode?: 'locked' | 'editable'
  clusterTopology?: Array<{
    name: string
    machineTypeId: string
    nodeCount: number
  }>
  nodeSetId?: string
  hostTypeId?: string
}

export type CatalogItemPriceRange = {
  minHourly: number
  maxHourly: number
  minMonthly: number
  maxMonthly: number
  currency: string
  isRange: boolean
}

type PointRate = {
  hourlyRate: number
  monthlyRate: number
  currency: string
}

function roundHourly(value: number): number {
  return Math.round(value * 100) / 100
}

function toPriceRange(points: PointRate[]): CatalogItemPriceRange | null {
  if (points.length === 0) {
    return null
  }

  let minHourly = points[0].hourlyRate
  let maxHourly = points[0].hourlyRate
  let minMonthly = points[0].monthlyRate
  let maxMonthly = points[0].monthlyRate

  for (const point of points) {
    minHourly = Math.min(minHourly, point.hourlyRate)
    maxHourly = Math.max(maxHourly, point.hourlyRate)
    minMonthly = Math.min(minMonthly, point.monthlyRate)
    maxMonthly = Math.max(maxMonthly, point.monthlyRate)
  }

  return {
    minHourly: roundHourly(minHourly),
    maxHourly: roundHourly(maxHourly),
    minMonthly: Math.round(minMonthly),
    maxMonthly: Math.round(maxMonthly),
    currency: points[0].currency,
    isRange: minHourly !== maxHourly || minMonthly !== maxMonthly,
  }
}

function resolveBareMetalPriceRange(
  item: CatalogItemPriceRangeInput,
  rateCardId: string,
): CatalogItemPriceRange | null {
  const hardwareEditable = resolveCatalogHardwareOsMode(item.hardwareOsMode) === 'editable'
  const osEditable =
    resolveCatalogOsImageMode(item.osImageMode, item.hardwareOsMode) === 'editable'

  if (!hardwareEditable && !osEditable) {
    return null
  }

  const hardwareIds = hardwareEditable
    ? getCatalogInstanceTypeOptions('baremetal').map((option) => option.id)
    : item.instanceTypeId?.trim()
      ? [item.instanceTypeId.trim()]
      : []

  const osIds = osEditable
    ? getCatalogDiskImageOptions().map((option) => option.id)
    : item.diskImageId?.trim()
      ? [item.diskImageId.trim()]
      : getCatalogDiskImageOptions().map((option) => option.id).slice(0, 1)

  if (hardwareIds.length === 0 || osIds.length === 0) {
    return null
  }

  const points: PointRate[] = []
  for (const instanceTypeId of hardwareIds) {
    for (const diskImageId of osIds) {
      const estimate = resolveBareMetalComposedRateEstimate(
        instanceTypeId,
        diskImageId,
        rateCardId,
      )
      if (estimate) {
        points.push({
          hourlyRate: estimate.hourlyRate,
          monthlyRate: estimate.monthlyRate,
          currency: estimate.currency,
        })
      }
    }
  }

  return toPriceRange(points)
}

function resolveClusterTopologyPriceRange(
  item: CatalogItemPriceRangeInput,
  rateCardId: string,
): CatalogItemPriceRange | null {
  const topology = resolveCatalogClusterTopology(item.clusterTopology)
  const machineTypes = getCatalogClusterMachineTypeOptions()
  if (topology.length === 0 || machineTypes.length === 0) {
    return null
  }

  const machineRates = machineTypes
    .map((option) => {
      const estimate = resolveClusterTopologyMachineRateEstimate(
        [{ machineTypeId: option.id, nodeCount: 1 }],
        rateCardId,
      )
      return estimate ? { id: option.id, hourlyRate: estimate.hourlyRate } : null
    })
    .filter((entry): entry is { id: string; hourlyRate: number } => Boolean(entry))

  if (machineRates.length === 0) {
    return null
  }

  const cheapestId = machineRates.reduce((best, entry) =>
    entry.hourlyRate < best.hourlyRate ? entry : best,
  ).id
  const dearestId = machineRates.reduce((best, entry) =>
    entry.hourlyRate > best.hourlyRate ? entry : best,
  ).id

  // Keep catalog default node counts; vary machine type preference only.
  const minEstimate = resolveClusterTopologyMachineRateEstimate(
    topology.map((row) => ({
      machineTypeId: cheapestId,
      nodeCount: row.nodeCount,
    })),
    rateCardId,
  )
  const maxEstimate = resolveClusterTopologyMachineRateEstimate(
    topology.map((row) => ({
      machineTypeId: dearestId,
      nodeCount: row.nodeCount,
    })),
    rateCardId,
  )

  if (!minEstimate || !maxEstimate) {
    return null
  }

  return toPriceRange([
    {
      hourlyRate: minEstimate.hourlyRate,
      monthlyRate: minEstimate.monthlyRate,
      currency: minEstimate.currency,
    },
    {
      hourlyRate: maxEstimate.hourlyRate,
      monthlyRate: maxEstimate.monthlyRate,
      currency: maxEstimate.currency,
    },
  ])
}

function resolveClusterHostTypePriceRange(
  item: CatalogItemPriceRangeInput,
  rateCardId: string,
): CatalogItemPriceRange | null {
  const nodeSetId = item.nodeSetId?.trim() || DEFAULT_CLUSTER_NODE_SET_ID
  const hostTypeIds = getCatalogClusterHostTypeOptions()
    .map((option) => option.id)
    .filter((id) => Boolean(mapHostTypeHasRate(id, nodeSetId, rateCardId)))

  const points = hostTypeIds
    .map((hostTypeId) =>
      resolveClusterComposedRateEstimate(nodeSetId, hostTypeId, rateCardId),
    )
    .filter((estimate): estimate is NonNullable<typeof estimate> => Boolean(estimate))
    .map((estimate) => ({
      hourlyRate: estimate.hourlyRate,
      monthlyRate: estimate.monthlyRate,
      currency: estimate.currency,
    }))

  if (points.length === 0) {
    const fallback = resolveClusterComposedRateEstimate(
      nodeSetId,
      item.hostTypeId?.trim() || DEFAULT_CLUSTER_HOST_TYPE_ID,
      rateCardId,
    )
    return fallback
      ? toPriceRange([
          {
            hourlyRate: fallback.hourlyRate,
            monthlyRate: fallback.monthlyRate,
            currency: fallback.currency,
          },
        ])
      : null
  }

  return toPriceRange(points)
}

function mapHostTypeHasRate(
  hostTypeId: string,
  nodeSetId: string,
  rateCardId: string,
): boolean {
  return Boolean(resolveClusterComposedRateEstimate(nodeSetId, hostTypeId, rateCardId))
}

/**
 * When price-affecting launch fields are editable, return lowest–highest composed rates.
 * Otherwise return null so callers keep showing the catalog's stored point rate.
 */
export function resolveCatalogItemPriceRange(
  item: CatalogItemPriceRangeInput,
  rateCardId = DEFAULT_M360_RATE_CARD_ID,
): CatalogItemPriceRange | null {
  const serviceId = item.serviceId ?? 'baremetal'

  if (serviceId === 'baremetal') {
    return resolveBareMetalPriceRange(item, rateCardId)
  }

  if (serviceId === 'cluster') {
    if (resolveCatalogClusterNodeTopologyMode(item.clusterNodeTopologyMode) !== 'editable') {
      return null
    }

    if (item.clusterTopology && item.clusterTopology.length > 0) {
      return resolveClusterTopologyPriceRange(item, rateCardId)
    }

    return resolveClusterHostTypePriceRange(item, rateCardId)
  }

  return null
}

export function formatCatalogPriceRangeLine(range: CatalogItemPriceRange): string {
  if (!range.isRange) {
    const hourly = range.minHourly.toFixed(2)
    const monthly = range.minMonthly.toLocaleString('en-US', { maximumFractionDigits: 0 })
    return `$${hourly}/hr · $${monthly}/mo`
  }

  const minHourly = range.minHourly.toFixed(2)
  const maxHourly = range.maxHourly.toFixed(2)
  const minMonthly = range.minMonthly.toLocaleString('en-US', { maximumFractionDigits: 0 })
  const maxMonthly = range.maxMonthly.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return `$${minHourly}–$${maxHourly}/hr · $${minMonthly}–$${maxMonthly}/mo`
}

export function formatCatalogPriceRangeSummary(range: CatalogItemPriceRange): string {
  return `${formatCatalogPriceRangeLine(range)} per instance`
}

/** Prefer a live price range when editable; otherwise the stored rate card summary. */
export function formatCatalogItemRateSummary(
  item: CatalogItemPriceRangeInput & { rateCard: RateCard },
): string {
  const range = resolveCatalogItemPriceRange(item)
  if (range?.isRange) {
    return formatCatalogPriceRangeSummary(range)
  }

  const hourly = item.rateCard.hourlyRate.toFixed(2)
  const monthly = item.rateCard.monthlyRate.toLocaleString('en-US', {
    maximumFractionDigits: 0,
  })
  return `$${hourly}/hr · $${monthly}/mo per instance`
}

export function getCatalogItemPriceRangeHint(
  item: CatalogItemPriceRangeInput,
): string | null {
  const range = resolveCatalogItemPriceRange(item)
  if (!range?.isRange) {
    return null
  }

  const serviceId = item.serviceId ?? 'baremetal'
  if (serviceId === 'cluster') {
    return 'Depends on node topology chosen at launch'
  }

  const hardwareEditable = resolveCatalogHardwareOsMode(item.hardwareOsMode) === 'editable'
  const osEditable =
    resolveCatalogOsImageMode(item.osImageMode, item.hardwareOsMode) === 'editable'

  if (hardwareEditable && osEditable) {
    return 'Depends on hardware and OS chosen at launch'
  }
  if (hardwareEditable) {
    return 'Depends on hardware chosen at launch'
  }
  if (osEditable) {
    return 'Depends on OS chosen at launch'
  }

  return 'Depends on configuration chosen at launch'
}
