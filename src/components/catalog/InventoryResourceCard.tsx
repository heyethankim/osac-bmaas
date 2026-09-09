import type { ReactNode } from 'react'
import { Button, Card, CardBody, Content } from '@patternfly/react-core'
import { ActionsColumn, type IAction } from '@patternfly/react-table'
import type { CatalogSpecRow } from '../../catalog/catalogSpecs'
import { CatalogSpecRowsList } from './CatalogSpecRowsList'

type InventoryResourceCardProps = {
  title: string
  subtitle?: ReactNode
  onTitleClick?: () => void
  headerEnd?: ReactNode
  actions?: IAction[]
  specRows: CatalogSpecRow[]
  children?: ReactNode
  className?: string
}

export function InventoryResourceCard({
  title,
  subtitle,
  onTitleClick,
  headerEnd,
  actions,
  specRows,
  children,
  className,
}: InventoryResourceCardProps) {
  return (
    <Card
      isCompact={false}
      className={['inventory-resource-card', className].filter(Boolean).join(' ')}
    >
      <CardBody>
        <div className="inventory-resource-card__header">
          <div className="inventory-resource-card__title-block">
            <Content component="p" className="inventory-resource-card__title">
              {onTitleClick ? (
                <Button
                  variant="link"
                  isInline
                  className="catalog-table-name-link"
                  onClick={onTitleClick}
                >
                  {title}
                </Button>
              ) : (
                title
              )}
            </Content>
            {subtitle ? (
              <Content component="p" className="inventory-resource-card__subtitle">
                {subtitle}
              </Content>
            ) : null}
          </div>
          <div className="inventory-resource-card__header-actions">
            {headerEnd}
            {actions && actions.length > 0 ? <ActionsColumn items={actions} /> : null}
          </div>
        </div>

        {specRows.length > 0 ? (
          <CatalogSpecRowsList
            rows={specRows}
            className="inventory-resource-card__specs"
            rowClassName="inventory-resource-card__spec-row"
            labelClassName="inventory-resource-card__spec-label"
            valueClassName="inventory-resource-card__spec-value"
          />
        ) : null}

        {children}
      </CardBody>
    </Card>
  )
}
