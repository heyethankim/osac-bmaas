import type { ReactNode } from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  Content,
  Title,
} from '@patternfly/react-core'

export type ResourceCreatePageShellProps = {
  /** List page label in the breadcrumb (e.g. Catalog, Organizations). */
  parentLabel: string
  /** Current create title shown as the page H1 and active breadcrumb crumb. */
  title: string
  titleId?: string
  description?: ReactNode
  onBack: () => void
  children: ReactNode
  className?: string
  /**
   * `wizard` fills the viewport and pins the PatternFly wizard footer.
   * `form` is a normal scrolling create page for single-step forms.
   */
  layout?: 'wizard' | 'form'
}

/**
 * Full-page chrome for resource create / launch flows (PatternFly in-page).
 * Breadcrumb parent always returns to the resource landing list.
 */
export function ResourceCreatePageShell({
  parentLabel,
  title,
  titleId = 'resource-create-page-title',
  description,
  onBack,
  children,
  className,
  layout = 'wizard',
}: ResourceCreatePageShellProps) {
  return (
    <div
      className={[
        'catalog-wizard-page',
        layout === 'form' ? 'catalog-wizard-page--form' : undefined,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Breadcrumb aria-label={`${title} breadcrumb`}>
        <BreadcrumbItem
          to="#"
          onClick={(event) => {
            event.preventDefault()
            onBack()
          }}
        >
          {parentLabel}
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
