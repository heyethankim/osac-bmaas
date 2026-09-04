import { useState } from 'react'
import {
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownList,
  MenuToggle,
} from '@patternfly/react-core'
import type { InstanceSpecFilterGroup } from '../../tenantUser/instanceSpecFilters'

type InstanceSpecMultiFilterProps = {
  id: string
  groups: readonly InstanceSpecFilterGroup[]
  selectedOptionIds: ReadonlySet<string>
  onChange: (nextSelected: Set<string>) => void
  allLabel?: string
  toggleLabel: string
  ariaLabel: string
}

export function InstanceSpecMultiFilter({
  id,
  groups,
  selectedOptionIds,
  onChange,
  toggleLabel,
  ariaLabel,
}: InstanceSpecMultiFilterProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (groups.length === 0) {
    return null
  }

  const toggleSelection = (optionId: string) => {
    onChange(
      (() => {
        const next = new Set(selectedOptionIds)
        if (next.has(optionId)) {
          next.delete(optionId)
        } else {
          next.add(optionId)
        }
        return next
      })(),
    )
  }

  return (
    <Dropdown
      className="pill-filter-select pill-filter-select--narrow"
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          id={id}
          isExpanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          aria-label={ariaLabel}
          className="bmaas-dropdown-toggle pill-filter-select__toggle"
        >
          {toggleLabel}
        </MenuToggle>
      )}
    >
      <DropdownList className="instance-spec-filter__menu">
        {groups.map((group) => (
          <DropdownGroup key={group.dimension} label={group.dimension}>
            {group.options.map((option) => (
              <DropdownItem
                key={option.id}
                value={option.id}
                hasCheckbox
                isSelected={selectedOptionIds.has(option.id)}
                onClick={() => toggleSelection(option.id)}
              >
                {option.label}
              </DropdownItem>
            ))}
          </DropdownGroup>
        ))}
      </DropdownList>
    </Dropdown>
  )
}
