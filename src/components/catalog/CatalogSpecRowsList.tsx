import { Label } from '@patternfly/react-core'
import type { CatalogSpecRow } from '../../catalog/catalogSpecs'
import { CatalogClusterVersionValue } from './CatalogClusterVersionValue'

type CatalogSpecRowsListProps = {
  rows: CatalogSpecRow[]
  className?: string
  rowClassName?: string
  labelClassName?: string
  valueClassName?: string
}

export function CatalogSpecRowsList({
  rows,
  className,
  rowClassName = 'provider-admin-catalog-items__spec-row',
  labelClassName = 'provider-admin-catalog-items__spec-label',
  valueClassName = 'provider-admin-catalog-items__spec-value',
}: CatalogSpecRowsListProps) {
  return (
    <dl className={className}>
      {rows.map((row) => (
        <div key={row.label} className={rowClassName}>
          <dt className={labelClassName}>{row.label}</dt>
          <dd className={valueClassName}>
            {row.label === 'Cluster version' ? (
              <CatalogClusterVersionValue badge={row.badge}>{row.value}</CatalogClusterVersionValue>
            ) : row.badge ? (
              <span className="catalog-spec-row-value-with-badge">
                <span>{row.value}</span>
                <Label color={row.badge.color} isCompact>
                  {row.badge.text}
                </Label>
              </span>
            ) : (
              row.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
