import { useState } from 'react'
import {
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
} from '@patternfly/react-core'
import { EllipsisVIcon } from '@patternfly/react-icons/dist/esm/icons/ellipsis-v-icon'

type RelatedResourceItemActionsProps = {
  resourceName: string
  onEdit?: () => void
  onDelete?: () => void
  deleteDisabled?: boolean
  deleteDisabledReason?: string
}

export function RelatedResourceItemActions({
  resourceName,
  onEdit,
  onDelete,
  deleteDisabled = false,
  deleteDisabledReason,
}: RelatedResourceItemActionsProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!onEdit && !onDelete) {
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
          variant="plain"
          isExpanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          icon={<EllipsisVIcon />}
          className="entity-details-page__section-actions-kebab"
          aria-label={`Actions for ${resourceName}`}
        />
      )}
    >
      <DropdownList>
        {onEdit ? (
          <DropdownItem value="edit" onClick={onEdit}>
            Edit
          </DropdownItem>
        ) : null}
        {onEdit && onDelete ? <Divider component="li" /> : null}
        {onDelete ? (
          <DropdownItem
            value="delete"
            isDanger={!deleteDisabled}
            isDisabled={deleteDisabled}
            description={deleteDisabled ? deleteDisabledReason : undefined}
            tooltipProps={
              deleteDisabled && deleteDisabledReason
                ? { content: deleteDisabledReason }
                : undefined
            }
            onClick={onDelete}
          >
            Delete
          </DropdownItem>
        ) : null}
      </DropdownList>
    </Dropdown>
  )
}
