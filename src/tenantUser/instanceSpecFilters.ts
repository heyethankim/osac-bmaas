import type { CatalogSpecRow } from '../catalog/catalogSpecs'
import type { CatalogServiceId } from '../providerSetup/templateDemo'
import {
  getBareMetalInstanceDiskImageFilterLabel,
  getClusterNodeSetTypeLabel,
  getClusterPlatformLabel,
  getTenantInstanceCardSpecRows,
  getTenantInstanceGpuLabel,
  getTenantInstanceServiceId,
  getTenantInstanceSpecRows,
  type TenantInstance,
} from './instances'

export type InstanceSpecFilterGroup = {
  dimension: string
  options: Array<{
    id: string
    dimension: string
    value: string
    label: string
  }>
}

const INSTANCE_SPEC_FILTER_DIMENSIONS: Partial<Record<CatalogServiceId, string[]>> = {
  baremetal: ['Disk image', 'GPU', 'RAM', 'CPU'],
  cluster: ['Cluster version', 'Node set', 'Host type'],
  'virtual-machine': ['Instance type', 'Size', 'OS image', 'CPU', 'RAM', 'GPU'],
  models: ['Model profile', 'Runtime', 'Size', 'Replicas'],
}

const SPEC_FILTER_OPTION_SEPARATOR = '__'

function isPopulatedSpecValue(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed !== '—' && trimmed !== '-'
}

export function buildInstanceSpecFilterOptionId(dimension: string, value: string): string {
  return `${dimension}${SPEC_FILTER_OPTION_SEPARATOR}${value}`
}

export function parseInstanceSpecFilterOptionId(
  optionId: string,
): { dimension: string; value: string } | null {
  const separatorIndex = optionId.indexOf(SPEC_FILTER_OPTION_SEPARATOR)
  if (separatorIndex === -1) {
    return null
  }

  return {
    dimension: optionId.slice(0, separatorIndex),
    value: optionId.slice(separatorIndex + SPEC_FILTER_OPTION_SEPARATOR.length),
  }
}

function findSpecRowValue(rows: readonly CatalogSpecRow[], dimension: string): string | null {
  const value = rows.find((row) => row.label === dimension)?.value?.trim()
  return value && isPopulatedSpecValue(value) ? value : null
}

export function getInstanceSpecDimensionValue(
  instance: TenantInstance,
  dimension: string,
): string | null {
  const cardRows = getTenantInstanceCardSpecRows(instance)
  const specRows = getTenantInstanceSpecRows(instance)

  if (dimension === 'GPU') {
    const gpu = getTenantInstanceGpuLabel(instance)
    return isPopulatedSpecValue(gpu) ? gpu : null
  }

  if (dimension === 'Disk image') {
    const fromFilter = getBareMetalInstanceDiskImageFilterLabel(instance)
    if (fromFilter) {
      return fromFilter
    }
  }

  if (dimension === 'Cluster version') {
    const platform = getClusterPlatformLabel(instance)
    return isPopulatedSpecValue(platform) ? platform : null
  }

  if (dimension === 'Host type') {
    const hostType = findSpecRowValue(cardRows, 'Host type') ?? findSpecRowValue(specRows, 'Host type')
    if (hostType) {
      return hostType
    }
    const nodeSetType = getClusterNodeSetTypeLabel(instance)
    return isPopulatedSpecValue(nodeSetType) ? nodeSetType : null
  }

  if (dimension === 'OS image') {
    const osFromCard = findSpecRowValue(cardRows, 'OS image')
    if (osFromCard) {
      return osFromCard
    }
    const osImage = instance.osImage.trim()
    return isPopulatedSpecValue(osImage) ? osImage : null
  }

  return findSpecRowValue(cardRows, dimension) ?? findSpecRowValue(specRows, dimension)
}

export function buildInstanceSpecFilterGroups(
  instances: readonly TenantInstance[],
  serviceId: CatalogServiceId,
): InstanceSpecFilterGroup[] {
  const configuredDimensions = INSTANCE_SPEC_FILTER_DIMENSIONS[serviceId]
  if (!configuredDimensions?.length) {
    return []
  }

  const dimensions =
    serviceId === 'models'
      ? [
          ...new Set([
            ...configuredDimensions,
            ...instances.flatMap((instance) =>
              getTenantInstanceSpecRows(instance).map((row) => row.label),
            ),
          ]),
        ]
      : configuredDimensions

  const valuesByDimension = new Map<string, Set<string>>()

  for (const instance of instances) {
    if (getTenantInstanceServiceId(instance) !== serviceId) {
      continue
    }

    for (const dimension of dimensions) {
      const value = getInstanceSpecDimensionValue(instance, dimension)
      if (!value) {
        continue
      }

      const values = valuesByDimension.get(dimension) ?? new Set<string>()
      values.add(value)
      valuesByDimension.set(dimension, values)
    }
  }

  return dimensions
    .map((dimension) => {
      const values = [...(valuesByDimension.get(dimension) ?? [])].sort((left, right) =>
        left.localeCompare(right, undefined, { sensitivity: 'base' }),
      )

      if (values.length === 0) {
        return null
      }

      return {
        dimension,
        options: values.map((value) => ({
          id: buildInstanceSpecFilterOptionId(dimension, value),
          dimension,
          value,
          label: value,
        })),
      }
    })
    .filter((group): group is InstanceSpecFilterGroup => group !== null)
}

export function instanceMatchesSpecFilter(
  instance: TenantInstance,
  selectedOptionIds: ReadonlySet<string>,
  serviceId: CatalogServiceId,
): boolean {
  if (getTenantInstanceServiceId(instance) !== serviceId) {
    return false
  }
  if (selectedOptionIds.size === 0) {
    return true
  }

  const selectionsByDimension = new Map<string, Set<string>>()
  for (const optionId of selectedOptionIds) {
    const parsed = parseInstanceSpecFilterOptionId(optionId)
    if (!parsed) {
      continue
    }
    const values = selectionsByDimension.get(parsed.dimension) ?? new Set<string>()
    values.add(parsed.value)
    selectionsByDimension.set(parsed.dimension, values)
  }

  for (const [dimension, values] of selectionsByDimension) {
    const instanceValue = getInstanceSpecDimensionValue(instance, dimension)
    if (!instanceValue || !values.has(instanceValue)) {
      return false
    }
  }

  return true
}

export function describeInstanceSpecFilterSelections(
  selectedOptionIds: ReadonlySet<string>,
): string[] {
  const descriptions: string[] = []

  for (const optionId of selectedOptionIds) {
    const parsed = parseInstanceSpecFilterOptionId(optionId)
    if (!parsed) {
      continue
    }
    descriptions.push(`${parsed.dimension}: ${parsed.value}`)
  }

  return descriptions.sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }))
}

export function getInstanceSpecFilterToggleLabel(
  selectedOptionIds: ReadonlySet<string>,
  allLabel = 'All specs',
): string {
  if (selectedOptionIds.size === 0) {
    return allLabel
  }

  if (selectedOptionIds.size === 1) {
    const parsed = parseInstanceSpecFilterOptionId([...selectedOptionIds][0]!)
    return parsed ? `${parsed.dimension}: ${parsed.value}` : allLabel
  }

  return `${selectedOptionIds.size} specs`
}
