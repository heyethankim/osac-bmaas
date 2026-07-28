import { Alert, Card, CardBody, Content, Grid, GridItem } from '@patternfly/react-core'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { ProviderAdminWorkspacePageHeader } from '../components/provider-admin/ProviderAdminWorkspacePageHeader'
import { buildBillingSummary, buildMeteringRecords } from '../providerAdmin/metering'
import {
  getProviderCatalogDraft,
  getProviderRegisteredOrganizations,
} from '../providerSetup/storage'
import { DEFAULT_RATE_CARD } from '../providerSetup/templateDemo'

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  })
}

export function ProviderAdminBillingMeteringPage() {
  const organizations = getProviderRegisteredOrganizations()
  const catalogDraft = getProviderCatalogDraft()
  const rateCard = catalogDraft?.rateCard ?? DEFAULT_RATE_CARD
  const meteringRecords = buildMeteringRecords(organizations, rateCard)

  const activeOrganizations = organizations.filter((organization) => organization.status === 'Active')
  const billingSummary = buildBillingSummary(meteringRecords, activeOrganizations.length)
  const billingPeriod = meteringRecords[0]?.period ?? 'Current period'

  return (
    <div className="provider-admin-workspace-page provider-admin-billing">
      <ProviderAdminWorkspacePageHeader
        kicker="Operations"
        title="Billing & metering"
        lede="Track usage metering, reconcile against template rate cards, and review estimated billing."
      />

      {meteringRecords.length === 0 ? (
        <Alert
          variant="info"
          isInline
          title="No metering data yet"
          className="provider-admin-billing__empty-alert"
        >
          <Content component="p">
            Metering appears after a registered organization activates and starts consuming assigned
            catalog items. Register an organization, then sign in as the invited tenant admin to
            begin usage tracking.
          </Content>
        </Alert>
      ) : (
        <>
          <Grid hasGutter className="provider-admin-billing__summary">
            <GridItem sm={6} md={3}>
              <Card className="provider-admin-billing__summary-card">
                <CardBody>
                  <Content component="p" className="provider-admin-billing__summary-value">
                    {billingSummary.meteredHours.toLocaleString()}
                  </Content>
                  <Content component="p" className="provider-admin-billing__summary-label">
                    Metered hours ({billingPeriod})
                  </Content>
                </CardBody>
              </Card>
            </GridItem>
            <GridItem sm={6} md={3}>
              <Card className="provider-admin-billing__summary-card">
                <CardBody>
                  <Content component="p" className="provider-admin-billing__summary-value">
                    {formatCurrency(billingSummary.estimatedRevenue)}
                  </Content>
                  <Content component="p" className="provider-admin-billing__summary-label">
                    Estimated revenue
                  </Content>
                </CardBody>
              </Card>
            </GridItem>
            <GridItem sm={6} md={3}>
              <Card className="provider-admin-billing__summary-card">
                <CardBody>
                  <Content component="p" className="provider-admin-billing__summary-value">
                    {billingSummary.activeAccounts}
                  </Content>
                  <Content component="p" className="provider-admin-billing__summary-label">
                    Billing accounts active
                  </Content>
                </CardBody>
              </Card>
            </GridItem>
            <GridItem sm={6} md={3}>
              <Card className="provider-admin-billing__summary-card">
                <CardBody>
                  <Content component="p" className="provider-admin-billing__summary-value">
                    {billingSummary.catalogItems}
                  </Content>
                  <Content component="p" className="provider-admin-billing__summary-label">
                    Metered catalog items
                  </Content>
                </CardBody>
              </Card>
            </GridItem>
          </Grid>

          <Content component="p" className="provider-admin-billing__section-lede">
            Usage is metered against rate cards defined on Bare metal templates at authoring time. Billing
            accounts are mapped per organization in Administration.
          </Content>

          <Table
            aria-label="Metering records"
            variant="compact"
            borders={false}
            className="provider-admin-billing__table"
          >
            <Thead>
              <Tr>
                <Th modifier="wrap">Organization</Th>
                <Th modifier="wrap">Catalog item</Th>
                <Th modifier="wrap">Period</Th>
                <Th modifier="wrap">Hours metered</Th>
                <Th modifier="wrap">Estimated cost</Th>
              </Tr>
            </Thead>
            <Tbody>
              {meteringRecords.map((record) => (
                <Tr key={record.id}>
                  <Td dataLabel="Organization">{record.orgName}</Td>
                  <Td dataLabel="Catalog item">{record.catalogItem}</Td>
                  <Td dataLabel="Period">{record.period}</Td>
                  <Td dataLabel="Hours metered">{record.hoursMetered.toLocaleString()}</Td>
                  <Td dataLabel="Estimated cost">{formatCurrency(record.estimatedCost)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </>
      )}
    </div>
  )
}
