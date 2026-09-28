import type { ReactNode } from 'react'
import { Label } from '@patternfly/react-core'
import {
  CLUSTER_NODE_SETS_PARENT_LABEL,
  type CatalogSpecRow,
} from '../../catalog/catalogSpecs'
import { CatalogClusterVersionValue } from './CatalogClusterVersionValue'
import { CatalogDiskImageValue } from './CatalogDiskImageValue'

const DISK_IMAGE_SPEC_LABELS = new Set(['OS image', 'Disk image'])
const INSTANCE_TYPE_PARENT_LABELS = new Set(['Instance type', 'Size'])
const INSTANCE_TYPE_CHILD_LABELS = new Set(['CPU', 'RAM', 'GPU'])
const TOP_LEVEL_SPEC_LABELS = new Set([
  'Cluster version',
  'Platform',
  'OS image',
  'Disk image',
  'Instance type',
  'Size',
  CLUSTER_NODE_SETS_PARENT_LABEL,
  'Tenant access to node topology',
  'Network attachments',
  'Boot disk',
  'Validation',
  'Worker nodes',
])

type CatalogSpecRowsListProps = {
  rows: CatalogSpecRow[]
  className?: string
  rowClassName?: string
  labelClassName?: string
  valueClassName?: string
}

type SpecDisplayBlock =
  | { kind: 'row'; row: CatalogSpecRow }
  | {
      kind: 'nested-group'
      parent: CatalogSpecRow
      children: CatalogSpecRow[]
      ariaLabel: string
    }

function isInstanceTypeParentLabel(label: string): boolean {
  return INSTANCE_TYPE_PARENT_LABELS.has(label)
}

function isNodeSetsParentLabel(label: string): boolean {
  return label === CLUSTER_NODE_SETS_PARENT_LABEL
}

function collectNodeSetChildren(
  rows: CatalogSpecRow[],
  parentIndex: number,
): CatalogSpecRow[] {
  const children: CatalogSpecRow[] = []
  for (let index = parentIndex + 1; index < rows.length; index += 1) {
    const row = rows[index]
    if (TOP_LEVEL_SPEC_LABELS.has(row.label) || isInstanceTypeParentLabel(row.label)) {
      break
    }
    children.push(row)
  }
  return children
}

function buildSpecDisplayBlocks(rows: CatalogSpecRow[]): SpecDisplayBlock[] {
  const instanceParent = rows.find((row) => isInstanceTypeParentLabel(row.label)) ?? null
  const instanceChildren = rows.filter((row) => INSTANCE_TYPE_CHILD_LABELS.has(row.label))
  const nodeSetsParentIndex = rows.findIndex((row) => isNodeSetsParentLabel(row.label))
  const nodeSetsParent = nodeSetsParentIndex >= 0 ? rows[nodeSetsParentIndex] : null
  const nodeSetsChildren =
    nodeSetsParentIndex >= 0 ? collectNodeSetChildren(rows, nodeSetsParentIndex) : []
  const nodeSetChildLabels = new Set(nodeSetsChildren.map((row) => row.label))

  const blocks: SpecDisplayBlock[] = []
  let groupedInstanceType = false
  let groupedNodeSets = false

  for (const row of rows) {
    if (isInstanceTypeParentLabel(row.label)) {
      if (!groupedInstanceType && instanceParent && instanceChildren.length > 0) {
        blocks.push({
          kind: 'nested-group',
          parent: instanceParent,
          children: instanceChildren,
          ariaLabel: 'Instance type specifications',
        })
        groupedInstanceType = true
      } else if (!instanceParent || instanceChildren.length === 0) {
        blocks.push({ kind: 'row', row })
      }
      continue
    }

    if (INSTANCE_TYPE_CHILD_LABELS.has(row.label)) {
      if (!instanceParent || instanceChildren.length === 0) {
        blocks.push({ kind: 'row', row })
      }
      continue
    }

    if (isNodeSetsParentLabel(row.label)) {
      if (!groupedNodeSets && nodeSetsParent && nodeSetsChildren.length > 0) {
        blocks.push({
          kind: 'nested-group',
          parent: nodeSetsParent,
          children: nodeSetsChildren,
          ariaLabel: 'Node sets',
        })
        groupedNodeSets = true
      } else if (!nodeSetsParent || nodeSetsChildren.length === 0) {
        blocks.push({ kind: 'row', row })
      }
      continue
    }

    if (nodeSetChildLabels.has(row.label)) {
      if (!nodeSetsParent || nodeSetsChildren.length === 0) {
        blocks.push({ kind: 'row', row })
      }
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
  if (isNodeSetsParentLabel(row.label) && row.badge) {
    return (
      <Label color={row.badge.color} isCompact>
        {row.badge.text}
      </Label>
    )
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
              aria-label={block.ariaLabel}
            >
              {block.children.map((row) => renderRow(row))}
            </div>
          </div>
        )
      })}
    </dl>
  )
}
