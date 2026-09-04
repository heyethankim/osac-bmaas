import { useState } from 'react'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
} from '@patternfly/react-core'
import { TENANT_SECRET_TYPE_OPTIONS } from '../../../tenant/secrets'
import type { TenantSecretType } from '../../../tenant/secretTypes'

type CreateSecretDropdownProps = {
  buttonLabel?: string
  className?: string
  onSelectType: (type: TenantSecretType) => void
}

export function CreateSecretDropdown({
  buttonLabel = 'Create secret',
  className,
  onSelectType,
}: CreateSecretDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onSelect={(_event, value) => {
        if (!value) {
          return
        }

        onSelectType(String(value) as TenantSecretType)
        setIsOpen(false)
      }}
      popperProps={{ position: 'right' }}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          variant="primary"
          isExpanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          icon={<PlusIcon aria-hidden />}
          className={className}
          aria-label={buttonLabel}
        >
          {buttonLabel}
        </MenuToggle>
      )}
    >
      <DropdownList>
        {TENANT_SECRET_TYPE_OPTIONS.map((option) => (
          <DropdownItem key={option.id} value={option.id}>
            {option.label}
          </DropdownItem>
        ))}
      </DropdownList>
    </Dropdown>
  )
}
