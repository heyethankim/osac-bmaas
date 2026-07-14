import { useState } from 'react'
import { Content, Label, Progress, ProgressSize, ToggleGroup, ToggleGroupItem } from '@patternfly/react-core'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { ProviderAdminWorkspacePageHeader } from '../components/provider-admin/ProviderAdminWorkspacePageHeader'
import { buildTenantQuotaAllocations } from '../providerAdmin/metering'
import { PLATFORM_QUOTA_LIMITS } from '../providerAdmin/demoData'
import { getProviderRegisteredOrganizations } from '../providerSetup/storage'

type QuotaTab = 'platform' | 'tenant'

function getUtilizationPct(used: number, total: number): number {
  if (total <= 0) {
    return 0
  }

  return Math.min(100, Math.round((used / total) * 100))
}

export function ProviderAdminQuotasPage() {
  const [activeTab, setActiveTab] = useState<QuotaTab>('platform')
  const tenantQuotaAllocations = buildTenantQuotaAllocations(getProviderRegisteredOrganizations())

  return (
    <div className="provider-admin-workspace-page provider-admin-quotas">
      <ProviderAdminWorkspacePageHeader
        kicker="Administration"
        title="Quotas"
        lede="Set platform-wide resource ceilings and per-tenant allocation limits before commercialization."
      />

      <ToggleGroup aria-label="Quota views" className="provider-admin-quotas__toggle-group">
        <ToggleGroupItem
          text="Platform limits"
          buttonId="quota-view-platform"
          isSelected={activeTab === 'platform'}
          onChange={() => setActiveTab('platform')}
        />
        <ToggleGroupItem
          text="Tenant allocation"
          buttonId="quota-view-tenant"
          isSelected={activeTab === 'tenant'}
          onChange={() => setActiveTab('tenant')}
        />
      </ToggleGroup>

      {activeTab === 'platform' ? (
        <>
          <Content component="p" className="provider-admin-quotas__section-lede">
            Day-0 ceilings for allocatable vCPUs, memory, GPU units, and BMaaS instances across
            the platform.
          </Content>
          <Table
            aria-label="Platform quota limits"
            variant="compact"
            borders={false}
            className="provider-admin-quotas__table"
          >
            <Thead>
              <Tr>
                <Th modifier="wrap">Resource</Th>
                <Th modifier="wrap">Allocated</Th>
                <Th modifier="wrap">Platform ceiling</Th>
                <Th modifier="wrap">Headroom</Th>
                <Th modifier="wrap">Utilization</Th>
              </Tr>
            </Thead>
            <Tbody>
              {PLATFORM_QUOTA_LIMITS.map((limit) => {
                const headroom = limit.ceiling - limit.allocated
                const utilizationPct = getUtilizationPct(limit.allocated, limit.ceiling)

                return (
                  <Tr key={limit.id}>
                    <Td dataLabel="Resource">
                      <Content component="p" className="provider-admin-quotas__primary-cell">
                        {limit.label}
                      </Content>
                      <Content component="p" className="provider-admin-quotas__secondary-cell">
                        {limit.unit}
                      </Content>
                    </Td>
                    <Td dataLabel="Allocated">
                      {limit.allocated.toLocaleString()} {limit.unit}
                    </Td>
                    <Td dataLabel="Platform ceiling">
                      {limit.ceiling.toLocaleString()} {limit.unit}
                    </Td>
                    <Td dataLabel="Headroom">
                      <Label color={headroom > 0 ? 'green' : 'red'} isCompact>
                        {headroom.toLocaleString()} {limit.unit}
                      </Label>
                    </Td>
                    <Td dataLabel="Utilization">
                      <Progress
                        value={utilizationPct}
                        title={`${utilizationPct}% utilized`}
                        size={ProgressSize.sm}
                        className="provider-admin-quotas__progress"
                      />
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
        </>
      ) : (
        <>
          <Content component="p" className="provider-admin-quotas__section-lede">
            Day-1 purchase limits assigned to tenant organizations during packaging and allocation.
          </Content>
          {tenantQuotaAllocations.length === 0 ? (
            <Content component="p" className="provider-admin-quotas__section-lede">
              Tenant allocation limits appear after you register organizations in Administration.
            </Content>
          ) : (
            <Table
              aria-label="Tenant quota allocations"
              variant="compact"
              borders={false}
              className="provider-admin-quotas__table"
            >
              <Thead>
                <Tr>
                  <Th modifier="wrap">Organization</Th>
                  <Th modifier="wrap">External IP pool</Th>
                  <Th modifier="wrap">Instance quota</Th>
                  <Th modifier="wrap">vCPU quota</Th>
                  <Th modifier="wrap">Instance utilization</Th>
                </Tr>
              </Thead>
              <Tbody>
                {tenantQuotaAllocations.map((allocation) => {
                  const instanceUtilization = getUtilizationPct(
                    allocation.usedInstances,
                    allocation.maxInstances,
                  )

                  return (
                    <Tr key={allocation.orgId}>
                      <Td dataLabel="Organization">{allocation.orgName}</Td>
                      <Td dataLabel="External IP pool">
                        {allocation.externalIpPoolName ? (
                          <>
                            <Content component="p" className="provider-admin-quotas__primary-cell">
                              {allocation.externalIpPoolName}
                            </Content>
                            {allocation.externalIpPoolCidr ? (
                              <Content component="p" className="provider-admin-quotas__secondary-cell">
                                <code>{allocation.externalIpPoolCidr}</code>
                              </Content>
                            ) : null}
                          </>
                        ) : (
                          'Not assigned'
                        )}
                      </Td>
                      <Td dataLabel="Instance quota">
                        {allocation.usedInstances} / {allocation.maxInstances}
                      </Td>
                      <Td dataLabel="vCPU quota">
                        {allocation.usedVcpus} / {allocation.maxVcpus}
                      </Td>
                      <Td dataLabel="Instance utilization">
                        <Progress
                          value={instanceUtilization}
                          title={`${instanceUtilization}% of instance quota used`}
                          size={ProgressSize.sm}
                          className="provider-admin-quotas__progress"
                        />
                      </Td>
                    </Tr>
                  )
                })}
              </Tbody>
            </Table>
          )}
        </>
      )}
    </div>
  )
}
