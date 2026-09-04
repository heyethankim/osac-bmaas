import { useMemo, useState, type ReactNode } from 'react'
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  Icon,
  MenuToggle,
} from '@patternfly/react-core'

export type PillFilterOption = {
  value: string
  label: string
}

type PillFilterSelectProps = {
  id: string
  className?: string
  value: string
  options: readonly PillFilterOption[]
  onChange: (value: string) => void
  ariaLabel: string
  /** Overrides the computed toggle label. */
  toggleLabel?: string
  /** Prepended to the selected option label, e.g. "Project: ". */
  prefix?: string
  icon?: ReactNode
  iconClassName?: string
}

export function PillFilterSelect({
  id,
  className,
  value,
  options,
  onChange,
  ariaLabel,
  toggleLabel,
  prefix,
  icon,
  iconClassName = 'pill-filter-select__icon',
}: PillFilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  )

  const resolvedToggleLabel =
    toggleLabel ??
    (prefix
      ? `${prefix}${selectedOption?.label ?? ''}`
      : (selectedOption?.label ?? ''))

  return (
    <div className={['pill-filter-select', className].filter(Boolean).join(' ')}>
      <Dropdown
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        onSelect={(_event, selectedValue) => {
          if (selectedValue == null) {
            return
          }
          onChange(String(selectedValue))
          setIsOpen(false)
        }}
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            id={id}
            isExpanded={isOpen}
            onClick={() => setIsOpen((open) => !open)}
            aria-label={ariaLabel}
            className="pill-filter-select__toggle"
            icon={
              icon ? (
                <Icon className={iconClassName}>
                  {icon}
                </Icon>
              ) : undefined
            }
          >
            {resolvedToggleLabel}
          </MenuToggle>
        )}
      >
        <DropdownList>
          {options.map((option) => (
            <DropdownItem
              key={option.value || '__all__'}
              value={option.value}
              isSelected={value === option.value}
            >
              {option.label}
            </DropdownItem>
          ))}
        </DropdownList>
      </Dropdown>
    </div>
  )
}
