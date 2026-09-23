import { useMemo } from 'react'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import { SyncIcon } from '@patternfly/react-icons/dist/esm/icons/sync-icon'
import { RouterButton } from '../../components/RouterButton'
import {
  Button,
  Label,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr, type IAction } from '@patternfly/react-table'
import {
  formatM360OrganizationHierarchyLabel,
  formatM360PortalValue,
  getM360AccountStatusLabelColor,
  getM360AccountTenantName,
  getM360ApprovalStatusLabelColor,
  listM360PortalAccounts,
  type M360BillingAccount,
} from '../../billing/m360Accounts'
import { M360Shell } from '../../components/m360/M360Shell'

function getAccountActions(account: M360BillingAccount): IAction[] {
  return [
    {
      title: 'View account',
      onClick: () => {
        window.alert(`Account ${getM360AccountTenantName(account)}`)
      },
    },
    {
      title: 'Edit account',
      onClick: () => {
        window.alert('Edit account is not available in this prototype.')
      },
    },
  ]
}

export function M360AccountsPage() {
  const accounts = useMemo(() => listM360PortalAccounts(), [])

  return (
    <M360Shell title="Accounts">
      <Toolbar className="m360-portal__table-toolbar">
        <ToolbarContent alignItems="center">
          <ToolbarGroup gap={{ default: 'gapSm' }}>
            <ToolbarItem>
              <Button variant="secondary" icon={<SyncIcon aria-hidden />}>
                Refresh
              </Button>
            </ToolbarItem>
            <ToolbarItem>
              <Button variant="primary" icon={<PlusIcon aria-hidden />}>
                Create
              </Button>
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>

      <Table
        aria-label="M360 billing accounts"
        variant="compact"
        isStickyHeader
        className="m360-portal__accounts-table"
      >
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Organization</Th>
            <Th>Status</Th>
            <Th>Approval</Th>
            <Th>External ID</Th>
            <Th modifier="fitContent" screenReaderText="Row actions" />
          </Tr>
        </Thead>
        <Tbody>
          {accounts.map((account) => {
            const statusColor = getM360AccountStatusLabelColor(account.accountStatus)
            const approvalColor = getM360ApprovalStatusLabelColor(account.approvalStatus)

            return (
              <Tr key={account.accountId}>
                <Td dataLabel="Name" className="m360-portal__account-name">
                  <RouterButton
                    variant="link"
                    isInline
                    className="m360-portal__account-name-link"
                    to={`/m360/accounts/${encodeURIComponent(getM360AccountTenantName(account))}`}
                  >
                    {formatM360PortalValue(account.accountName)}
                  </RouterButton>
                </Td>
                <Td dataLabel="Organization" className="m360-portal__table-cell-text">
                  {formatM360OrganizationHierarchyLabel(account)}
                </Td>
                <Td dataLabel="Status">
                  {statusColor ? (
                    <Label color={statusColor} isCompact>
                      {account.accountStatus}
                    </Label>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td dataLabel="Approval">
                  <Label color={approvalColor} isCompact>{account.approvalStatus}</Label>
                </Td>
                <Td dataLabel="External ID" className="m360-portal__table-cell-text">
                  {formatM360PortalValue(account.externalId)}
                </Td>
                <Td isActionCell className="m360-portal__row-actions">
                  <ActionsColumn items={getAccountActions(account)} />
                </Td>
              </Tr>
            )
          })}
        </Tbody>
      </Table>

    </M360Shell>
  )
}
