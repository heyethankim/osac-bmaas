import { Button, Tooltip } from '@patternfly/react-core'
import { LockIcon } from '@patternfly/react-icons/dist/esm/icons/lock-icon'
import { LockOpenIcon } from '@patternfly/react-icons/dist/esm/icons/lock-open-icon'

type NetworkFieldLockButtonProps = {
  isLocked: boolean
  /** Accessible name for the control (static). Prefer “Lock … for …”. */
  'aria-label': string
  lockTooltip: string
  unlockTooltip: string
  onToggle: (locked: boolean) => void
}

/** Field-level lock control — distinct from section Networking Switch. */
export function NetworkFieldLockButton({
  isLocked,
  'aria-label': ariaLabel,
  lockTooltip,
  unlockTooltip,
  onToggle,
}: NetworkFieldLockButtonProps) {
  return (
    <Tooltip content={isLocked ? unlockTooltip : lockTooltip}>
      <span className="catalog-network-field-lock-wrap">
        <Button
          type="button"
          variant="plain"
          className="catalog-network-field-lock"
          icon={isLocked ? <LockIcon /> : <LockOpenIcon />}
          aria-label={ariaLabel}
          aria-pressed={isLocked}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onToggle(!isLocked)
          }}
        />
      </span>
    </Tooltip>
  )
}
