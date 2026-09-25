import type { ReactNode } from 'react'
import { Label } from '@patternfly/react-core'
import type { CatalogSpecRow } from '../../catalog/catalogSpecs'
import { CatalogClusterVersionValue } from './CatalogClusterVersionValue'
import { CatalogDiskImageValue } from './CatalogDiskImageValue'

const DISK_IMAGE_SPEC_LABELS = new Set(['OS image', 'Disk image'])
const INSTANCE_TYPE_PARENT_LABELS = new Set(['Instance type', 'Size'])
const INSTANCE_TYPE_CHILD_LABELS = new Set(['CPU', 'RAM', 'GPU'])

type CatalogSpecRowsListProps = {
  rows: CatalogSpecRow[]
  className?: string
  rowClassName?: string
  labelClassName?: string
  valueClassName?: string
}

type SpecDisplayBlock =
  | { kind: 'row'; row: CatalogSpecRow }
  | { kind: 'instance-type-group'; parent: CatalogSpecRow; children: CatalogSpecRow[] }

function isInstanceTypeParentLabel(label: string): boolean {
  return INSTANCE_TYPE_PARENT_LABELS.has(label)
}

function buildSpecDisplayBlocks(rows: CatalogSpecRow[]): SpecDisplayBlock[] {
  const parent = rows.find((row) => isInstanceTypeParentLabel(row.label)) ?? null
  const children = rows.filter((row) => INSTANCE_TYPE_CHILD_LABELS.has(row.label))

  if (!parent || children.length === 0) {
    return rows.map((row) => ({ kind: 'row', row }))
  }

  const blocks: SpecDisplayBlock[] = []
  let grouped = false

  for (const row of rows) {
    if (isInstanceTypeParentLabel(row.label)) {
      if (!grouped) {
        blocks.push({ kind: 'instance-type-group', parent, children })
        grouped = true
      }
      continue
    }
    if (INSTANCE_TYPE_CHILD_LABELS.has(row.label)) {
      continue
    }
    blocks.push({ kind: 'row', row })
  }

  return blocks
}

function renderSpecRowValue(row: CatalogSpecRow): ReactNode {
  if (row.label === 'Cluster version') {
    return <CatalogClusterVersionValue badge={row.badge}>{row.value}</CatalogClusterVersionValue>
  }
  if (DISK_IMAGE_SPEC_LABELS.has(row.label)) {
    return <CatalogDiskImageValue badge={row.badge}>{row.value}</CatalogDiskImageValue>
  }
  if (row.badge) {
    return (
      <span className="catalog-spec-row-value-with-badge">
        <span>{row.value}</span>
        <Label color={row.badge.color} isCompact>
          {row.badge.text}
        </Label>
      </span>
    )
  }
  return row.value
}

export function CatalogSpecRowsList({
  rows,
  className,
  rowClassName = 'provider-admin-catalog-items__spec-row',
  labelClassName = 'provider-admin-catalog-items__spec-label',
  valueClassName = 'provider-admin-catalog-items__spec-value',
}: CatalogSpecRowsListProps) {
  const blocks = buildSpecDisplayBlocks(rows)

  const renderRow = (row: CatalogSpecRow) => (
    <div key={row.label} className={rowClassName}>
      <dt className={labelClassName}>{row.label}</dt>
      <dd className={valueClassName}>{renderSpecRowValue(row)}</dd>
    </div>
  )

  return (
    <dl className={className}>
      {blocks.map((block) => {
        if (block.kind === 'row') {
          return renderRow(block.row)
        }

        return (
          <div key={block.parent.label} className="catalog-spec-instance-type-group">
            {renderRow(block.parent)}
            <div
              className="catalog-spec-instance-type-group__children"
              role="group"
              aria-label="Instance type specifications"
            >
              {block.children.map((row) => renderRow(row))}
            </div>
          </div>
        )
      })}
    </dl>
  )
}
