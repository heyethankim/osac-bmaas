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
}

export function EntityDetailsActionsDropdown({
  onEdit,
  onRemove,
  removeLabel = 'Remove',
  editDisabled = false,
  removeDisabled = false,
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
          <DropdownItem value="edit" onClick={onEdit} isDisabled={editDisabled}>
            Edit
          </DropdownItem>
        ) : null}
        {onEdit && onRemove ? <Divider component="li" /> : null}
        {onRemove ? (
          <DropdownItem
            value="remove"
            onClick={onRemove}
            isDanger
            isDisabled={removeDisabled}
          >
            {removeLabel}
          </DropdownItem>
        ) : null}
      </DropdownList>
    </Dropdown>
  )
}
