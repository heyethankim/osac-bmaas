import { useState } from 'react'
import {
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
} from '@patternfly/react-core'

type AdditionalAction = {
  label: string
  onClick: () => void
  disabled?: boolean
  disabledReason?: string
}

type EntityDetailsActionsDropdownProps = {
  onEdit?: () => void
  onRemove?: () => void
  /** Destructive action label — defaults to Remove. */
  removeLabel?: 'Remove' | 'Delete'
  editDisabled?: boolean
  removeDisabled?: boolean
  editDisabledReason?: string
  removeDisabledReason?: string
  additionalItems?: AdditionalAction[]
}

export function EntityDetailsActionsDropdown({
  onEdit,
  onRemove,
  removeLabel = 'Remove',
  editDisabled = false,
  removeDisabled = false,
  editDisabledReason,
  removeDisabledReason,
  additionalItems = [],
}: EntityDetailsActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!onEdit && !onRemove && additionalItems.length === 0) {
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
        {additionalItems.map((item) => (
          <DropdownItem
            key={item.label}
            value={item.label}
            onClick={item.onClick}
            isDisabled={item.disabled}
            description={item.disabled ? item.disabledReason : undefined}
            tooltipProps={
              item.disabled && item.disabledReason ? { content: item.disabledReason } : undefined
            }
          >
            {item.label}
          </DropdownItem>
        ))}
        {(onEdit || additionalItems.length > 0) && onRemove ? <Divider component="li" /> : null}
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
