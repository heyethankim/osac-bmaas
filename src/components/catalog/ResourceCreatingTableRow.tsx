import { Spinner } from '@patternfly/react-core'
import { Td, Tr } from '@patternfly/react-table'

type ResourceCreatingTableRowProps = {
  itemId: string
  label: string
  colSpan: number
  className?: string
}

export function ResourceCreatingTableRow({
  itemId,
  label,
  colSpan,
  className = 'catalog-resource-creating-row',
}: ResourceCreatingTableRowProps) {
  return (
    <Tr key={itemId} className={className}>
      <Td colSpan={colSpan} dataLabel="Creating">
        <div className="catalog-resource-creating-row__content">
          <Spinner size="md" aria-label={label} />
          <span>{label}</span>
        </div>
      </Td>
    </Tr>
  )
}
