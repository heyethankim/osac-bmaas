import { FormHelperText, HelperText, HelperTextItem, Label } from '@patternfly/react-core'
import {
  formatM360ConnectionStatusLabel,
  getM360ConnectionStatusColor,
  type M360ConnectionStatus,
} from '../../billing/m360'

type M360ConnectionStatusFieldProps = {
  accountId: string
  status: M360ConnectionStatus
  lastSyncedLabel?: string
}

export function M360ConnectionStatusField({
  accountId,
  status,
  lastSyncedLabel = 'just now',
}: M360ConnectionStatusFieldProps) {
  const normalizedAccountId = accountId.trim()

  return (
    <div className="billing-m360-connection">
      <Label color={getM360ConnectionStatusColor(status)} isCompact>
        {formatM360ConnectionStatusLabel(status)}
      </Label>
      {normalizedAccountId ? (
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              M360 account <code>{normalizedAccountId}</code>
              {status === 'connected' ? ` · Last synced ${lastSyncedLabel}` : null}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      ) : (
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              Enter the M360 tenant / account ID to validate the connection.
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </div>
  )
}
