import type { ReactNode } from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  Content,
  Title,
} from '@patternfly/react-core'

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
 * Full-page chrome for catalog create / launch wizards (PatternFly in-page wizard).
 * Title lives in the page header; breadcrumb Catalog returns to the landing list.
 */
export function CatalogWizardPageShell({
  title,
  titleId = 'catalog-wizard-page-title',
  description,
  onBackToCatalog,
  children,
  className,
}: CatalogWizardPageShellProps) {
  return (
    <div className={['catalog-wizard-page', className].filter(Boolean).join(' ')}>
      <Breadcrumb aria-label={`${title} breadcrumb`}>
        <BreadcrumbItem
          to="#"
          onClick={(event) => {
            event.preventDefault()
            onBackToCatalog()
          }}
        >
          Catalog
        </BreadcrumbItem>
        <BreadcrumbItem isActive>{title}</BreadcrumbItem>
      </Breadcrumb>

      <div className="catalog-wizard-page__header">
        <Title headingLevel="h1" size="3xl" id={titleId} className="catalog-wizard-page__title">
          {title}
        </Title>
        {description ? (
          <Content component="p" className="catalog-wizard-page__lede">
            {description}
          </Content>
        ) : null}
      </div>

      <div className="catalog-wizard-page__body">{children}</div>
    </div>
  )
}
