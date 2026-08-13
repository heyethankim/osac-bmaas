import type { ReactNode } from 'react'
import { ResourceCreatePageShell } from '../shared/ResourceCreatePageShell'

type CatalogWizardPageShellProps = {
  /** Current wizard title shown as the page H1 and active breadcrumb crumb. */
  title: string
  titleId?: string
  description?: ReactNode
  onBackToCatalog: () => void
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
  children,
  className,
}: CatalogWizardPageShellProps) {
  return (
    <ResourceCreatePageShell
      parentLabel="Catalog"
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
