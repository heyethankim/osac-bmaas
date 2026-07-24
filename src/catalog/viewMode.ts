export type ViewMode = 'grid' | 'list'

/** @deprecated Prefer ViewMode */
export type CatalogViewMode = ViewMode

const CATALOG_VIEW_MODE_KEY = 'bmaas-catalog-view-mode'
const INSTANCES_VIEW_MODE_KEY = 'bmaas-instances-view-mode'

function isViewMode(value: string | null): value is ViewMode {
  return value === 'grid' || value === 'list'
}

function getStoredViewMode(key: string, fallback: ViewMode): ViewMode {
  try {
    const stored = sessionStorage.getItem(key)
    if (isViewMode(stored)) {
      return stored
    }
  } catch {
    /* demo storage unavailable */
  }

  return fallback
}

function setStoredViewMode(key: string, viewMode: ViewMode): void {
  try {
    sessionStorage.setItem(key, viewMode)
  } catch {
    /* demo storage unavailable */
  }
}

/** Catalog defaults to grid — browse/storefront. */
export function getCatalogViewMode(fallback: ViewMode = 'grid'): ViewMode {
  return getStoredViewMode(CATALOG_VIEW_MODE_KEY, fallback)
}

export function setCatalogViewMode(viewMode: ViewMode): void {
  setStoredViewMode(CATALOG_VIEW_MODE_KEY, viewMode)
}

/** My instances defaults to grid — browse provisioned servers. */
export function getInstancesViewMode(fallback: ViewMode = 'grid'): ViewMode {
  return getStoredViewMode(INSTANCES_VIEW_MODE_KEY, fallback)
}

export function setInstancesViewMode(viewMode: ViewMode): void {
  setStoredViewMode(INSTANCES_VIEW_MODE_KEY, viewMode)
}
