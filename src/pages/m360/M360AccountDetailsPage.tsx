import { Label } from '@patternfly/react-core'
import { Navigate, useParams } from 'react-router-dom'
import {
  findM360AccountByReference,
  formatM360OrganizationHierarchyLabel,
  formatM360PortalValue,
  getM360AccountStatusLabelColor,
  getM360AccountTenantName,
  getM360ApprovalStatusLabelColor,
  resolveM360AccountRateCard,
} from '../../billing/m360Accounts'
import { M360Shell } from '../../components/m360/M360Shell'

export function M360AccountDetailsPage() {
  const { accountName } = useParams()
  const account = findM360AccountByReference(decodeURIComponent(accountName ?? ''))

  if (!account) {
    return <Navigate to="/m360/accounts" replace />
  }

  const statusColor = getM360AccountStatusLabelColor(account.accountStatus)
  const approvalColor = getM360ApprovalStatusLabelColor(account.approvalStatus)

  return (
    <M360Shell title={formatM360PortalValue(getM360AccountTenantName(account))}>
      <dl className="m360-portal__account-details">
        <div>
          <dt>Organization</dt>
          <dd>{formatM360OrganizationHierarchyLabel(account)}</dd>
        </div>
        <div>
          <dt>Account label</dt>
          <dd>{formatM360PortalValue(account.accountLabel)}</dd>
        </div>
        <div>
          <dt>Rate card</dt>
          <dd>{formatM360PortalValue(resolveM360AccountRateCard(account)?.name)}</dd>
        </div>
        <div>
          <dt>Account status</dt>
          <dd>
            {statusColor ? (
              <Label color={statusColor} isCompact>{account.accountStatus}</Label>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div>
          <dt>Approval status</dt>
          <dd>
            <Label color={approvalColor} isCompact>{account.approvalStatus}</Label>
          </dd>
        </div>
        <div>
          <dt>External ID</dt>
          <dd>{formatM360PortalValue(account.externalId)}</dd>
        </div>
      </dl>
    </M360Shell>
  )
}
