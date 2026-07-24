import { ToggleGroup, ToggleGroupItem } from '@patternfly/react-core'
import {
  CATALOG_SERVICE_FILTERS,
  type CatalogServiceId,
} from '../../providerSetup/templateDemo'

type CatalogServiceFilterToggleProps = {
  selectedFilters: Set<CatalogServiceId>
  serviceCounts: Record<CatalogServiceId, number>
  onToggle: (serviceId: CatalogServiceId, isSelected: boolean) => void
  className?: string
}

export function CatalogServiceFilterToggle({
  selectedFilters,
  serviceCounts,
  onToggle,
  className,
}: CatalogServiceFilterToggleProps) {
  return (
    <ToggleGroup
      aria-label="Catalog service filters"
      className={['catalog-service-filter', className].filter(Boolean).join(' ')}
    >
      {CATALOG_SERVICE_FILTERS.map((filter) => (
        <ToggleGroupItem
          key={filter.id}
          text={`${filter.label} ${serviceCounts[filter.id]}`}
          buttonId={`catalog-filter-${filter.id}`}
          isSelected={selectedFilters.has(filter.id)}
          onChange={(event, isSelected) => {
            onToggle(filter.id, isSelected)
            // Clear focus so deselected items drop the selected-looking focus styles immediately.
            if (!isSelected && event.currentTarget instanceof HTMLElement) {
              event.currentTarget.blur()
            }
          }}
        />
      ))}
    </ToggleGroup>
  )
}

export function createEmptyCatalogServiceCounts(): Record<CatalogServiceId, number> {
  return {
    baremetal: 0,
    cluster: 0,
    models: 0,
    'virtual-machine': 0,
  }
}

export function countCatalogServices(
  serviceIds: readonly CatalogServiceId[],
): Record<CatalogServiceId, number> {
  const counts = createEmptyCatalogServiceCounts()
  for (const serviceId of serviceIds) {
    counts[serviceId] += 1
  }
  return counts
}

export function toggleCatalogServiceFilter(
  current: Set<CatalogServiceId>,
  serviceId: CatalogServiceId,
  isSelected: boolean,
): Set<CatalogServiceId> {
  const next = new Set(current)
  if (isSelected) {
    next.add(serviceId)
  } else {
    next.delete(serviceId)
  }
  return next
}
