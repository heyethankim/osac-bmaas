import type { RateCard } from '../providerSetup/templateDemo'
import { DEFAULT_RATE_CARD } from '../providerSetup/templateDemo'
import { TENANT_CATALOG_GOVERNANCE_ITEMS } from './catalogManager'
import type { TenantProjectCatalogItem } from './projects'

export type TenantCatalogItemSource = 'custom'

export type TenantCatalogItem = {
  id: string
  displayName: string
  source: TenantCatalogItemSource
  sourceCatalogItemId: string | null
  rateCard: RateCard
  createdAt: string
}

export type AttachableCatalogOption = {
  id: string
  displayName: string
  sourceLabel: string
  rateCard: RateCard
}

export function generateTenantCatalogItemId(): string {
  const suffix = Math.random().toString(36).slice(2, 8)
  return `tenant-catalog_${suffix}`
}

export function createTenantCatalogItem(input: {
  displayName: string
  sourceCatalogItemId: string | null
  rateCard?: RateCard
}): TenantCatalogItem {
  return {
    id: generateTenantCatalogItemId(),
    displayName: input.displayName.trim(),
    source: 'custom',
    sourceCatalogItemId: input.sourceCatalogItemId,
    rateCard: input.rateCard ?? DEFAULT_RATE_CARD,
    createdAt: new Date().toISOString(),
  }
}

export function getAttachableCatalogOptions(
  inheritedCatalog: {
    catalogItemId: string
    displayName: string
    rateCard: RateCard
  } | null,
  customItems: TenantCatalogItem[],
): AttachableCatalogOption[] {
  const options: AttachableCatalogOption[] = []

  if (inheritedCatalog) {
    options.push({
      id: inheritedCatalog.catalogItemId,
      displayName: inheritedCatalog.displayName,
      sourceLabel: 'Inherited from provider',
      rateCard: inheritedCatalog.rateCard,
    })
  }

  for (const item of customItems) {
    options.push({
      id: item.id,
      displayName: item.displayName,
      sourceLabel: 'Tenant-scoped catalog item',
      rateCard: item.rateCard,
    })
  }

  return options
}

export function getProjectCatalogOptions(
  inheritedCatalog: {
    catalogItemId: string
    displayName: string
    rateCard: RateCard
  } | null,
  customItems: TenantCatalogItem[],
): AttachableCatalogOption[] {
  const options: AttachableCatalogOption[] = TENANT_CATALOG_GOVERNANCE_ITEMS.filter(
    (item) => item.approved,
  ).map((item) => ({
    id: item.id,
    displayName: item.displayName,
    sourceLabel: item.categoryLabel,
    rateCard: DEFAULT_RATE_CARD,
  }))

  const seenIds = new Set(options.map((option) => option.id))

  for (const option of getAttachableCatalogOptions(inheritedCatalog, customItems)) {
    if (!seenIds.has(option.id)) {
      options.push(option)
      seenIds.add(option.id)
    }
  }

  return options
}

export function getWizardCatalogOptions(): AttachableCatalogOption[] {
  return TENANT_CATALOG_GOVERNANCE_ITEMS.filter((item) => item.approved).map((item) => ({
    id: item.id,
    displayName: item.displayName,
    sourceLabel: item.categoryLabel,
    rateCard: DEFAULT_RATE_CARD,
  }))
}

export function getTenantCatalogItemLabel(catalogItems: TenantProjectCatalogItem[]): string {
  if (catalogItems.length === 0) {
    return 'Not attached'
  }

  return catalogItems.map((item) => item.displayName).join(', ')
}

export function getProjectsWithAttachedCatalog<T extends { catalogItems: TenantProjectCatalogItem[] }>(
  projects: T[],
): T[] {
  return projects.filter((project) => project.catalogItems.length > 0)
}
