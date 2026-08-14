import { CATALOG_SERVICE_FILTER_LABELS, type CatalogServiceId } from '../providerSetup/templateDemo'

/** Result count copy, e.g. "3 of 12 catalog items" when filtered. */
export function formatFilteredResultCount(
  filteredCount: number,
  totalCount: number,
  singular: string,
  plural = `${singular}s`,
): string {
  const noun = filteredCount === 1 ? singular : plural
  if (filteredCount === totalCount) {
    return `${filteredCount} ${noun}`
  }
  return `${filteredCount} of ${totalCount} ${plural}`
}

export function buildFilterDescription(filterParts: string[]): string | null {
  if (filterParts.length === 0) {
    return null
  }

  const phrases = filterParts.map(humanizeFilterPart)
  return `Showing ${joinNaturalList(phrases)}.`
}

function humanizeFilterPart(part: string): string {
  const publishStatusMatch = part.match(/^publish status:\s*(.+)$/i)
  if (publishStatusMatch) {
    const status = publishStatusMatch[1].trim()
    if (status === 'Published') {
      return 'published items'
    }
    if (status === 'Unpublished') {
      return 'unpublished items'
    }
    return `items with ${status.toLowerCase()} publish status`
  }

  const serviceMatch = part.match(/^service:\s*(.+)$/i)
  if (serviceMatch) {
    return `${serviceMatch[1].trim()} services`
  }

  const searchMatch = part.match(/^search:\s*(.+)$/i)
  if (searchMatch) {
    return `results matching ${searchMatch[1].trim()}`
  }

  const organizationMatch = part.match(/^organization:\s*(.+)$/i)
  if (organizationMatch) {
    return `items for ${organizationMatch[1].trim()}`
  }

  const statusMatch = part.match(/^status:\s*(.+)$/i)
  if (statusMatch) {
    const status = statusMatch[1].trim()
    if (status === 'Active' || status === 'Pending activation') {
      return `organizations with ${status.toLowerCase()} status`
    }
    return `items with ${status.toLowerCase()} status`
  }

  const setupMatch = part.match(/^setup:\s*(.+)$/i)
  if (setupMatch) {
    const setup = setupMatch[1].trim()
    if (setup === 'Ready') {
      return 'ready organizations'
    }
    if (setup === 'Needs identity provider') {
      return 'organizations that need an identity provider'
    }
    if (setup === 'Waiting on IdP Manager') {
      return 'organizations waiting on IdP Manager'
    }
    if (setup === 'IdP invitation expired') {
      return 'organizations with an expired IdP invitation'
    }
    if (setup === 'Needs roles') {
      return 'organizations that need roles'
    }
    return `organizations with ${setup.toLowerCase()} setup`
  }

  const osImageMatch = part.match(/^OS image:\s*(.+)$/i)
  if (osImageMatch) {
    return `items using ${osImageMatch[1].trim()}`
  }

  const diskImageMatch = part.match(/^Disk image:\s*(.+)$/i)
  if (diskImageMatch) {
    return `items using ${diskImageMatch[1].trim()}`
  }

  const gpuMatch = part.match(/^GPU:\s*(.+)$/i)
  if (gpuMatch) {
    return `items with ${gpuMatch[1].trim()}`
  }

  const platformMatch = part.match(/^platform:\s*(.+)$/i)
  if (platformMatch) {
    return `clusters on ${platformMatch[1].trim()}`
  }

  const nodeSetMatch = part.match(/^node set:\s*(.+)$/i)
  if (nodeSetMatch) {
    return `clusters using ${nodeSetMatch[1].trim()}`
  }

  return part
}

function joinNaturalList(parts: string[]): string {
  if (parts.length === 1) {
    return parts[0]!
  }
  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`
  }
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`
}

export function isCatalogServiceFilterActive(
  selectedFilters: Set<CatalogServiceId>,
  availableServiceIds: readonly CatalogServiceId[],
): boolean {
  const available = [...new Set(availableServiceIds)]
  if (available.length === 0) {
    return selectedFilters.size === 0
  }

  return (
    selectedFilters.size === 0 ||
    available.some((serviceId) => !selectedFilters.has(serviceId))
  )
}

export function describeCatalogServiceFilter(
  selectedFilters: Set<CatalogServiceId>,
  availableServiceIds: readonly CatalogServiceId[],
): string | null {
  if (!isCatalogServiceFilterActive(selectedFilters, availableServiceIds)) {
    return null
  }

  const available = [...new Set(availableServiceIds)]
  const selected = available.filter((serviceId) => selectedFilters.has(serviceId))

  if (selected.length === 0) {
    return 'no services selected'
  }

  const labels = selected.map((serviceId) => CATALOG_SERVICE_FILTER_LABELS[serviceId])
  if (labels.length === 1) {
    return labels[0]!
  }
  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`
  }

  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`
}

export function createCatalogServiceFilterSet(
  availableServiceIds: readonly CatalogServiceId[],
): Set<CatalogServiceId> {
  const unique = [...new Set(availableServiceIds)]
  return new Set(unique.length > 0 ? unique : (['baremetal'] as const))
}

export function buildInventoryFilterParts(
  searchValue: string,
  selectedStatus: string,
  statusAllValue = 'all',
): string[] {
  const parts: string[] = []
  if (selectedStatus !== statusAllValue) {
    parts.push(`status: ${selectedStatus}`)
  }
  if (searchValue.trim()) {
    parts.push(`search: "${searchValue.trim()}"`)
  }
  return parts
}
