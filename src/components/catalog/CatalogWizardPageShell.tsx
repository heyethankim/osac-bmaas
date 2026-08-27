import type { ReactNode } from 'react'
import {
  ResourceCreatePageShell,
  type ResourceCreateBreadcrumbAncestor,
} from '../shared/ResourceCreatePageShell'

type CatalogWizardPageShellProps = {
  /** Current wizard title shown as the page H1 and active breadcrumb crumb. */
  title: string
  titleId?: string
  description?: ReactNode
  onBackToCatalog: () => void
  /** Optional catalog item name between Catalog and the wizard title (e.g. launch flows). */
  catalogItemLabel?: string
  onBackToCatalogItem?: () => void
  children: ReactNode
  className?: string
}

/**
 * Catalog-scoped wrapper around the shared full-page create shell.
 * Breadcrumb Catalog returns to the catalog landing list.
 */
export function CatalogWizardPageShell({
  title,
  titleId,
  description,
  onBackToCatalog,
  catalogItemLabel,
  onBackToCatalogItem,
  children,
  className,
}: CatalogWizardPageShellProps) {
  const ancestors: ResourceCreateBreadcrumbAncestor[] = [
    { label: 'Catalog', onClick: onBackToCatalog },
  ]

  if (catalogItemLabel) {
    ancestors.push({
      label: catalogItemLabel,
      onClick: onBackToCatalogItem,
    })
  }

  return (
    <ResourceCreatePageShell
      ancestors={ancestors}
      title={title}
      titleId={titleId}
      description={description}
      onBack={onBackToCatalog}
      className={className}
    >
      {children}
    </ResourceCreatePageShell>
  )
}
