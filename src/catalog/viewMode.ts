export type ViewMode = 'grid' | 'list'

/** @deprecated Prefer ViewMode */
export type CatalogViewMode = ViewMode

const CATALOG_VIEW_MODE_KEY = 'bmaas-catalog-view-mode'
const INSTANCES_VIEW_MODE_KEY = 'bmaas-instances-view-mode'
const ADMINISTRATION_VIEW_MODE_KEY = 'bmaas-administration-view-mode'
const NETWORKING_VIEW_MODE_KEY = 'bmaas-networking-view-mode'
const SECRETS_VIEW_MODE_KEY = 'bmaas-secrets-view-mode'

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

/** Administration pages default to list — dense operator tables. */
export function getAdministrationViewMode(fallback: ViewMode = 'list'): ViewMode {
  return getStoredViewMode(ADMINISTRATION_VIEW_MODE_KEY, fallback)
}

export function setAdministrationViewMode(viewMode: ViewMode): void {
  setStoredViewMode(ADMINISTRATION_VIEW_MODE_KEY, viewMode)
}

/** Networking inventory defaults to list. */
export function getNetworkingViewMode(fallback: ViewMode = 'list'): ViewMode {
  return getStoredViewMode(NETWORKING_VIEW_MODE_KEY, fallback)
}

export function setNetworkingViewMode(viewMode: ViewMode): void {
  setStoredViewMode(NETWORKING_VIEW_MODE_KEY, viewMode)
}

/** Secrets inventory defaults to list. */
export function getSecretsViewMode(fallback: ViewMode = 'list'): ViewMode {
  return getStoredViewMode(SECRETS_VIEW_MODE_KEY, fallback)
}

export function setSecretsViewMode(viewMode: ViewMode): void {
  setStoredViewMode(SECRETS_VIEW_MODE_KEY, viewMode)
}
