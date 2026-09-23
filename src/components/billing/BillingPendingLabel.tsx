import { Icon, Tooltip } from '@patternfly/react-core'
import { WarningTriangleIcon } from '@patternfly/react-icons/dist/esm/icons/warning-triangle-icon'

type BillingPendingLabelProps = {
  tooltip?: string
  label?: string
}

export function BillingPendingLabel({
  tooltip = 'Finish tenant billing setup to publish.',
  label = 'Billing pending',
}: BillingPendingLabelProps) {
  return (
    <Tooltip content={tooltip} position="top">
      <span className="billing-m360-rate-status" role="status">
        <Icon size="sm" status="warning" aria-hidden>
          <WarningTriangleIcon />
        </Icon>
        <span>{label}</span>
      </span>
    </Tooltip>
  )
}
