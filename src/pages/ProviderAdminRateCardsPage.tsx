import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { M360_RATE_CARD_PORTAL_URL } from '../billing/m360'
import {
  DEFAULT_M360_RATE_CARD_ID,
  listM360RatesPageServiceGroups,
  type M360BillableService,
  type M360RatesPageServiceGroup,
} from '../billing/m360RateLines'
import { ProviderAdminWorkspacePageHeader } from '../components/provider-admin/ProviderAdminWorkspacePageHeader'
import { ExternalLinkButton } from '../components/shared/ExternalLinkButton'
import { getProviderCatalogItems } from '../providerSetup/storage'
import { buildProviderCatalogItemWorkspacePath } from '../shared/workspaceNavUrl'

function RateLinesTable({ group }: { group: M360RatesPageServiceGroup }) {
  return (
    <Table
      aria-label={`${group.label} rate lines`}
      className="provider-admin-billing__table catalog-data-table"
    >
      <Thead>
        <Tr>
          <Th>Resource</Th>
          <Th>Rate</Th>
          <Th>Catalog item</Th>
        </Tr>
      </Thead>
      <Tbody>
        {group.rows.length > 0 ? (
          group.rows.map((row) => (
            <Tr key={row.id}>
              <Td dataLabel="Resource">
                <div className="provider-admin-rate-cards__resource">
                  <span>{row.resourceLabel}</span>
                  {row.rateDetail ? (
                    <span className="provider-admin-rate-cards__resource-detail">
                      {row.rateDetail}
                    </span>
                  ) : null}
                </div>
              </Td>
              <Td dataLabel="Rate">
                <span className="provider-admin-rate-cards__rate">{row.rateSummary}</span>
              </Td>
              <Td dataLabel="Catalog item">
                {row.catalogItemId && row.catalogDisplayName ? (
                  <Link
                    to={buildProviderCatalogItemWorkspacePath(row.catalogItemId)}
                    className="provider-admin-rate-cards__catalog-link"
                  >
                    {row.catalogDisplayName}
                  </Link>
                ) : (
                  <span className="provider-admin-rate-cards__catalog-unmapped">
                    Not in catalog
                  </span>
                )}
              </Td>
            </Tr>
          ))
        ) : (
          <Tr>
            <Td colSpan={3}>No rate lines for this service.</Td>
          </Tr>
        )}
      </Tbody>
    </Table>
  )
}

export function ProviderAdminRateCardsPage() {
  const catalogItems = useMemo(() => getProviderCatalogItems(), [])
  const serviceGroups = useMemo(
    () => listM360RatesPageServiceGroups(catalogItems, DEFAULT_M360_RATE_CARD_ID),
    [catalogItems],
  )
  const [activeServiceId, setActiveServiceId] = useState<M360BillableService>(
    () => serviceGroups[0]?.serviceId ?? 'baremetal',
  )
  const activeGroup =
    serviceGroups.find((group) => group.serviceId === activeServiceId) ?? serviceGroups[0]

  return (
    <div className="provider-admin-workspace-page provider-admin-billing provider-admin-rate-cards">
      <ProviderAdminWorkspacePageHeader
        kicker="Administration"
        title="Rates"
        lede="Browse M360 billable rates by service."
        action={
          <ExternalLinkButton href={M360_RATE_CARD_PORTAL_URL} variant="primary">
            Open M360 rates
          </ExternalLinkButton>
        }
      />

      <Alert variant="info" isInline title="Synced from M360">
        Edit rates in M360 — OSAC is read-only.
      </Alert>

      <Card className="provider-admin-billing__table-card">
        <CardHeader>
          <CardTitle>Rate lines</CardTitle>
        </CardHeader>
        <CardBody>
          {serviceGroups.length === 0 ? (
            <Content component="p">No rate lines configured in M360 yet.</Content>
          ) : (
            <Tabs
              activeKey={activeGroup?.serviceId}
              onSelect={(_event, eventKey) => {
                setActiveServiceId(String(eventKey) as M360BillableService)
              }}
              aria-label="Rate line services"
              className="provider-admin-rate-cards__service-tabs"
            >
              {serviceGroups.map((group) => (
                <Tab
                  key={group.serviceId}
                  eventKey={group.serviceId}
                  title={
                    <TabTitleText>
                      {group.label}
                      <span className="provider-admin-rate-cards__tab-count">
                        {group.rows.length}
                      </span>
                    </TabTitleText>
                  }
                >
                  <RateLinesTable group={group} />
                </Tab>
              ))}
            </Tabs>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
