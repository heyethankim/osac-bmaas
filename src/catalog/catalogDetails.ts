export function formatCatalogItemCreatedAt(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Compact date for catalog list/grid sublines (e.g. "Added by you · Sep 3, 2026"). */
export function formatCatalogItemAddedDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
