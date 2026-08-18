import { ToggleGroup, ToggleGroupItem } from '@patternfly/react-core'
import { ListIcon } from '@patternfly/react-icons/dist/esm/icons/list-icon'
import { ThIcon } from '@patternfly/react-icons/dist/esm/icons/th-icon'
import type { ViewMode } from '../../catalog/viewMode'

type ViewModeToggleProps = {
  viewMode: ViewMode
  onChange: (viewMode: ViewMode) => void
  ariaLabel?: string
  idPrefix?: string
  className?: string
}

export function ViewModeToggle({
  viewMode,
  onChange,
  ariaLabel = 'View',
  idPrefix = 'view',
  className,
}: ViewModeToggleProps) {
  return (
    <ToggleGroup
      aria-label={ariaLabel}
      className={['catalog-view-toggle', className].filter(Boolean).join(' ')}
    >
      <ToggleGroupItem
        icon={<ThIcon />}
        aria-label="Grid view"
        buttonId={`${idPrefix}-grid`}
        isSelected={viewMode === 'grid'}
        onChange={() => onChange('grid')}
      />
      <ToggleGroupItem
        icon={<ListIcon />}
        aria-label="List view"
        buttonId={`${idPrefix}-list`}
        isSelected={viewMode === 'list'}
        onChange={() => onChange('list')}
      />
    </ToggleGroup>
  )
}

/** @deprecated Prefer ViewModeToggle */
export function CatalogViewToggle(props: ViewModeToggleProps) {
  return (
    <ViewModeToggle
      ariaLabel="Catalog view"
      idPrefix="catalog-view"
      {...props}
    />
  )
}
