import { useState } from 'react'
import {
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
} from '@patternfly/react-core'

type EntityDetailsActionsDropdownProps = {
  onEdit?: () => void
  onRemove?: () => void
  /** Destructive action label — defaults to Remove. */
  removeLabel?: 'Remove' | 'Delete'
  editDisabled?: boolean
  removeDisabled?: boolean
  editDisabledReason?: string
  removeDisabledReason?: string
}

export function EntityDetailsActionsDropdown({
  onEdit,
  onRemove,
  removeLabel = 'Remove',
  editDisabled = false,
  removeDisabled = false,
  editDisabledReason,
  removeDisabledReason,
}: EntityDetailsActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!onEdit && !onRemove) {
    return null
  }

  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onSelect={() => setIsOpen(false)}
      popperProps={{ position: 'right' }}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          variant="secondary"
          isExpanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          aria-label="Actions"
        >
          Actions
        </MenuToggle>
      )}
    >
      <DropdownList>
        {onEdit ? (
          <DropdownItem
            value="edit"
            onClick={onEdit}
            isDisabled={editDisabled}
            description={editDisabled ? editDisabledReason : undefined}
            tooltipProps={
              editDisabled && editDisabledReason ? { content: editDisabledReason } : undefined
            }
          >
            Edit
          </DropdownItem>
        ) : null}
        {onEdit && onRemove ? <Divider component="li" /> : null}
        {onRemove ? (
          <DropdownItem
            value="remove"
            onClick={onRemove}
            isDanger={!removeDisabled}
            isDisabled={removeDisabled}
            description={removeDisabled ? removeDisabledReason : undefined}
            tooltipProps={
              removeDisabled && removeDisabledReason ? { content: removeDisabledReason } : undefined
            }
          >
            {removeLabel}
          </DropdownItem>
        ) : null}
      </DropdownList>
    </Dropdown>
  )
}
