import type { NavigateOptions, SetURLSearchParams } from 'react-router-dom'

/** Query key for an open catalog item detail page (display name or catalog item id). */
export const WORKSPACE_CATALOG_ITEM_PARAM = 'item'

export type SyncWorkspaceNavOptions = NavigateOptions & {
  /**
   * Left-nav landing navigation: always clear `?item=` so re-selecting Catalog
   * (or any section) returns to the list view instead of keeping a detail open.
   */
  showLanding?: boolean
}

export function getWorkspaceCatalogItemParam(searchParams: URLSearchParams): string | null {
  const value = searchParams.get(WORKSPACE_CATALOG_ITEM_PARAM)?.trim()
  return value || null
}

/**
 * Keep `?nav=` in sync with the active workspace page so every view is URL-addressable.
 * Clears `?item=` when leaving Catalog, or whenever `showLanding` is set (left-nav clicks).
 */
export function syncWorkspaceNavParam(
  setSearchParams: SetURLSearchParams,
  navId: string,
  options?: SyncWorkspaceNavOptions,
): void {
  const showLanding = options?.showLanding === true
  const { showLanding: _showLanding, ...navigateOptions } = options ?? {}

  setSearchParams((current) => {
    const navMatches = current.get('nav') === navId
    const hasItem = current.has(WORKSPACE_CATALOG_ITEM_PARAM)
    const shouldClearItem = showLanding || navId !== 'catalog'

    if (navMatches && !(shouldClearItem && hasItem)) {
      return current
    }

    const next = new URLSearchParams(current)
    next.set('nav', navId)
    if (shouldClearItem) {
      next.delete(WORKSPACE_CATALOG_ITEM_PARAM)
    }
    return next
  }, navigateOptions)
}

/** Open or close a catalog item detail via `?item=`. */
export function syncWorkspaceCatalogItemParam(
  setSearchParams: SetURLSearchParams,
  item: string | null,
  options?: NavigateOptions,
): void {
  setSearchParams((current) => {
    const currentItem = current.get(WORKSPACE_CATALOG_ITEM_PARAM)
    if (!item) {
      if (!currentItem) {
        return current
      }
      const next = new URLSearchParams(current)
      next.delete(WORKSPACE_CATALOG_ITEM_PARAM)
      return next
    }

    if (currentItem === item) {
      return current
    }

    const next = new URLSearchParams(current)
    next.set('nav', 'catalog')
    next.set(WORKSPACE_CATALOG_ITEM_PARAM, item)
    return next
  }, options)
}

export function findCatalogItemByWorkspaceParam<
  T extends { catalogItemId?: string; displayName: string },
>(items: readonly T[], itemParam: string | null | undefined): T | null {
  if (!itemParam) {
    return null
  }

  const key = itemParam.trim().toLowerCase()
  if (!key) {
    return null
  }

  return (
    items.find((item) => item.catalogItemId?.toLowerCase() === key) ??
    items.find((item) => item.displayName.toLowerCase() === key) ??
    items.find((item) => item.displayName.toLowerCase().includes(key)) ??
    null
  )
}
