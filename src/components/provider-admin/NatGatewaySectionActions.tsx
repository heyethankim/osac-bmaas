import { useState } from 'react'
import {
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
} from '@patternfly/react-core'
import { EllipsisVIcon } from '@patternfly/react-icons/dist/esm/icons/ellipsis-v-icon'

type NatGatewaySectionActionsProps = {
  natGatewayName: string
  onEdit?: () => void
  onDetach?: () => void
}

export function NatGatewaySectionActions({
  natGatewayName,
  onEdit,
  onDetach,
}: NatGatewaySectionActionsProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!onEdit && !onDetach) {
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
          aria-label={`NAT gateway actions for ${natGatewayName}`}
        />
      )}
    >
      <DropdownList>
        {onEdit ? (
          <DropdownItem value="edit" onClick={onEdit}>
            Edit
          </DropdownItem>
        ) : null}
        {onEdit && onDetach ? <Divider component="li" /> : null}
        {onDetach ? (
          <DropdownItem value="detach" isDanger onClick={onDetach}>
            Detach
          </DropdownItem>
        ) : null}
      </DropdownList>
    </Dropdown>
  )
}
