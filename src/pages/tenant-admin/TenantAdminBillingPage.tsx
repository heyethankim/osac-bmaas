import { useMemo } from 'react'
import { CheckCircleIcon } from '@patternfly/react-icons/dist/esm/icons/check-circle-icon'
import { ClipboardCheckIcon } from '@patternfly/react-icons/dist/esm/icons/clipboard-check-icon'
import { ExternalLinkAltIcon } from '@patternfly/react-icons/dist/esm/icons/external-link-alt-icon'
import { MoneyBillAltIcon } from '@patternfly/react-icons/dist/esm/icons/money-bill-alt-icon'
import { OutlinedBuildingIcon } from '@patternfly/react-icons/dist/esm/icons/outlined-building-icon'
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  Label,
  Title,
} from '@patternfly/react-core'
import {
  buildM360AccountDetailPath,
  findM360AccountByReference,
  findM360AccountByTenantName,
  formatM360OrganizationHierarchyLabel,
  formatM360PortalValue,
  getM360AccountStatusLabelColor,
  getM360AccountTenantName,
  getM360ApprovalStatusLabelColor,
  listM360PortalAccounts,
  resolveM360AccountRateCard,
} from '../../billing/m360Accounts'
import {
  countM360RateLines,
  listM360RateLineHeadlines,
} from '../../billing/m360RateLines'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import { RouterButton } from '../../components/RouterButton'
import {
  getOrganizationBillingAccountDisplay,
  isOrganizationBillingPending,
  type RegisteredOrganization,
} from '../../providerAdmin/organizations'

const M360_ACCOUNTS_PATH = '/m360/accounts'

type TenantAdminBillingPageProps = {
  organization: RegisteredOrganization
}

export function TenantAdminBillingPage({ organization }: TenantAdminBillingPageProps) {
  const account = useMemo(() => {
    const accounts = listM360PortalAccounts()
    const reference =
      organization.m360AccountId?.trim() || organization.billingAccountId.trim() || ''
    return (
      (reference ? findM360AccountByReference(reference, accounts) : null) ??
      findM360AccountByTenantName(organization.name, accounts) ??
      findM360AccountByTenantName(organization.tenantId, accounts)
    )
  }, [organization])

  const rateCard = account ? resolveM360AccountRateCard(account) : null
  const rateLineCount = rateCard ? countM360RateLines(rateCard.id) : 0
  const rateHeadlines = rateCard ? listM360RateLineHeadlines(rateCard.id, 4) : []
  const isPending = isOrganizationBillingPending(organization)
  const accountDisplay = getOrganizationBillingAccountDisplay(organization)
  const m360DetailPath = account
    ? buildM360AccountDetailPath(getM360AccountTenantName(account))
    : M360_ACCOUNTS_PATH

  return (
    <div className="provider-admin-workspace-page tenant-admin-billing">
      <ProviderAdminWorkspacePageHeader
        kicker="Administration"
        title="Billing"
        lede="Your tenant’s M360 billing account, rate card, and link status. Balances and invoices stay in M360."
        action={
          <RouterButton
            to={m360DetailPath}
            variant="primary"
            icon={<ExternalLinkAltIcon aria-hidden />}
            iconPosition="end"
          >
            {account ? 'Open in M360' : 'Open M360 accounts'}
          </RouterButton>
        }
      />

      <Alert
        variant="info"
        isInline
        title="Account balances are not shown in OSAC"
        className="tenant-admin-billing__alert"
      >
        <Content component="p">
          OSAC shows M360 account status and linking for this tenant only.
        </Content>
      </Alert>

      {isPending || !account ? (
        <EmptyState
          className="tenant-admin-billing__empty-state"
          titleText="Billing not linked yet"
          headingLevel="h2"
          icon={MoneyBillAltIcon}
        >
          <EmptyStateBody>
            Ask your provider administrator to complete M360 billing setup for this tenant.
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <div className="tenant-admin-billing__layout">
          <Card className="tenant-admin-billing__summary-card">
            <CardBody>
              <div className="tenant-admin-billing__summary">
                <div className="tenant-admin-billing__summary-main">
                  <span className="tenant-admin-billing__summary-kicker">
                    Linked M360 billing account
                  </span>
                  <Title
                    headingLevel="h2"
                    size="xl"
                    className="tenant-admin-billing__summary-title"
                  >
                    {getM360AccountTenantName(account)}
                  </Title>
                  <Content component="p" className="tenant-admin-billing__summary-meta">
                    {formatM360OrganizationHierarchyLabel(account)}
                    {account.accountLabel?.trim()
                      ? ` · ${account.accountLabel.trim()}`
                      : null}
                  </Content>
                  <div className="tenant-admin-billing__summary-labels">
                    <Label
                      color={getM360AccountStatusLabelColor(account.accountStatus)}
                      isCompact
                    >
                      {account.accountStatus ?? 'Unknown'}
                    </Label>
                    <Label
                      color={getM360ApprovalStatusLabelColor(account.approvalStatus)}
                      isCompact
                    >
                      {account.approvalStatus}
                    </Label>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="tenant-admin-billing__kpi-grid">
            <Card isFullHeight className="tenant-admin-billing__kpi-card">
              <CardHeader>
                <CardTitle>
                  <CheckCircleIcon
                    className="tenant-admin-billing__kpi-icon"
                    aria-hidden
                  />
                  Account status
                </CardTitle>
              </CardHeader>
              <CardBody>
                <Title
                  headingLevel="h3"
                  size="2xl"
                  className="tenant-admin-billing__kpi-value"
                >
                  {account.accountStatus ?? 'Unknown'}
                </Title>
                <Content component="p" className="tenant-admin-billing__kpi-hint">
                  Lifecycle status from M360
                </Content>
              </CardBody>
            </Card>

            <Card isFullHeight className="tenant-admin-billing__kpi-card">
              <CardHeader>
                <CardTitle>
                  <ClipboardCheckIcon
                    className="tenant-admin-billing__kpi-icon"
                    aria-hidden
                  />
                  Approval
                </CardTitle>
              </CardHeader>
              <CardBody>
                <Title
                  headingLevel="h3"
                  size="2xl"
                  className="tenant-admin-billing__kpi-value"
                >
                  {account.approvalStatus}
                </Title>
                <Content component="p" className="tenant-admin-billing__kpi-hint">
                  M360 approval workflow state
                </Content>
              </CardBody>
            </Card>

            <Card isFullHeight className="tenant-admin-billing__kpi-card">
              <CardHeader>
                <CardTitle>
                  <MoneyBillAltIcon
                    className="tenant-admin-billing__kpi-icon"
                    aria-hidden
                  />
                  Rate card
                </CardTitle>
              </CardHeader>
              <CardBody>
                <Title
                  headingLevel="h3"
                  size="xl"
                  className="tenant-admin-billing__kpi-value tenant-admin-billing__kpi-value--compact"
                >
                  {rateCard?.name ?? organization.m360RateCardName ?? '—'}
                </Title>
                <Content component="p" className="tenant-admin-billing__kpi-hint">
                  {rateCard
                    ? `${rateCard.region} · ${rateLineCount} rate${rateLineCount === 1 ? '' : 's'}`
                    : 'Attached in M360'}
                </Content>
              </CardBody>
            </Card>
          </div>

          <div className="tenant-admin-billing__panels">
            <Card className="tenant-admin-billing__panel">
              <CardHeader>
                <CardTitle>
                  <OutlinedBuildingIcon
                    className="tenant-admin-billing__kpi-icon"
                    aria-hidden
                  />
                  Account details
                </CardTitle>
              </CardHeader>
              <CardBody>
                <DescriptionList isCompact className="tenant-admin-billing__details">
                  <DescriptionListGroup>
                    <DescriptionListTerm>Account ID</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code>
                        {formatM360PortalValue(account.accountNumber || account.accountId)}
                      </code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Account label</DescriptionListTerm>
                    <DescriptionListDescription>
                      {formatM360PortalValue(account.accountLabel)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Organization</DescriptionListTerm>
                    <DescriptionListDescription>
                      {formatM360OrganizationHierarchyLabel(account)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>OSAC link</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code>{accountDisplay}</code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>External ID</DescriptionListTerm>
                    <DescriptionListDescription>
                      {formatM360PortalValue(account.externalId)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </CardBody>
            </Card>

            <Card className="tenant-admin-billing__panel">
              <CardHeader>
                <CardTitle>Rates on this card</CardTitle>
              </CardHeader>
              <CardBody>
                {rateHeadlines.length === 0 ? (
                  <Content component="p" className="tenant-admin-billing__rates-empty">
                    No rate lines are available for this card yet.
                  </Content>
                ) : (
                  <>
                    <Content component="p" className="tenant-admin-billing__rates-lede">
                      Sample catalog rates from M360. Full pricing stays in M360.
                    </Content>
                    <ul className="tenant-admin-billing__rates-list">
                      {rateHeadlines.map((headline) => (
                        <li key={headline}>{headline}</li>
                      ))}
                    </ul>
                    {rateLineCount > rateHeadlines.length ? (
                      <Content component="p" className="tenant-admin-billing__rates-more">
                        +{rateLineCount - rateHeadlines.length} more in M360
                      </Content>
                    ) : null}
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
