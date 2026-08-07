import type { ReactNode } from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  Content,
  Divider,
  Flex,
  FlexItem,
  Title,
} from '@patternfly/react-core'

export type EntityDetailsPageShellProps = {
  /** List page label shown in the breadcrumb. */
  parentLabel: string
  onBack: () => void
  title: string
  titleId?: string
  description?: ReactNode
  /** Optional leading icon beside the title. */
  icon?: ReactNode
  /** Primary / secondary actions aligned to the header. */
  actions?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Full-page entity details chrome shared across provider/tenant detail views.
 * Replaces the former end Drawer pattern.
 */
export function EntityDetailsPageShell({
  parentLabel,
  onBack,
  title,
  titleId = 'entity-details-title',
  description,
  icon,
  actions,
  children,
  className,
}: EntityDetailsPageShellProps) {
  return (
    <div
      className={['entity-details-page', className].filter(Boolean).join(' ')}
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

      <Flex
        className="entity-details-page__header"
        alignItems={{ default: 'alignItemsFlexStart' }}
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        gap={{ default: 'gapMd' }}
      >
        <FlexItem>
          <div className="entity-details-page__title-row">
            {icon ? (
              <span className="entity-details-page__icon-wrap" aria-hidden>
                {icon}
              </span>
            ) : null}
            <div>
              <Title
                headingLevel="h1"
                size="3xl"
                id={titleId}
                className="entity-details-page__title"
              >
                {title}
              </Title>
              {description ? (
                <Content component="p" className="entity-details-page__lede">
                  {description}
                </Content>
              ) : null}
            </div>
          </div>
        </FlexItem>
        {actions ? (
          <FlexItem alignSelf={{ default: 'alignSelfFlexStart' }}>
            <div className="entity-details-page__actions">{actions}</div>
          </FlexItem>
        ) : null}
      </Flex>

      <div className="entity-details-page__body">
        <Divider className="entity-details-page__band-divider" />
        {children}
      </div>
    </div>
  )
}
