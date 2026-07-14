import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  FormSelect,
  FormSelectOption,
  Label,
  Progress,
  ProgressSize,
  Title,
} from '@patternfly/react-core'
import { BoltIcon } from '@patternfly/react-icons/dist/esm/icons/bolt-icon'
import { CatalogIcon } from '@patternfly/react-icons/dist/esm/icons/catalog-icon'
import { ClusterIcon } from '@patternfly/react-icons/dist/esm/icons/cluster-icon'
import { InfrastructureIcon } from '@patternfly/react-icons/dist/esm/icons/infrastructure-icon'
import { ModuleIcon } from '@patternfly/react-icons/dist/esm/icons/module-icon'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import { PROVIDER_RECENT_ACTIVITIES, PROVIDER_TENANT_ORGS } from '../providerAdmin/demoData'

type ProviderAdminDashboardPageProps = {
  actionsDisabled?: boolean
}

function ResourceRow({
  label,
  used,
  total,
}: {
  label: string
  used: number
  total: number
}) {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0
  return (
    <div className="provider-admin-dashboard__resource-row">
      <span>{label}</span>
      <Progress value={pct} size={ProgressSize.sm} aria-label={`${label} utilization`} />
      <span>
        {used}/{total} ({pct}%)
      </span>
    </div>
  )
}

export function ProviderAdminDashboardPage({ actionsDisabled = false }: ProviderAdminDashboardPageProps) {
  const activeOrganizations = PROVIDER_TENANT_ORGS.filter((org) => org.status === 'Active').length

  return (
    <div className="provider-admin-dashboard">
      <div className="provider-admin-dashboard__header">
        <Title headingLevel="h1" size="3xl">
          Dashboard
        </Title>
        <Content component="p" className="provider-admin-dashboard__header-lede">
          Manage and monitor all tenant organizations.
        </Content>
      </div>

      <div className="provider-admin-dashboard__kpi-grid">
        <Card isFullHeight>
          <CardHeader>
            <CardTitle>Active organization</CardTitle>
          </CardHeader>
          <CardBody>
            <Title headingLevel="h2" size="4xl" className="provider-admin-dashboard__kpi-value">
              {activeOrganizations}
            </Title>
            <Content component="p" className="provider-admin-dashboard__kpi-hint">
              Tenants currently consuming capacity on this control plane.
            </Content>
          </CardBody>
        </Card>

        <Card isFullHeight>
          <CardHeader>
            <CardTitle>
              <BoltIcon style={{ marginInlineEnd: '0.5rem' }} />
              GPU Utilization
            </CardTitle>
          </CardHeader>
          <CardBody>
            <Title headingLevel="h2" size="4xl" className="provider-admin-dashboard__kpi-value">
              46.2%
            </Title>
            <Content component="p" className="provider-admin-dashboard__kpi-hint">
              24 / 52 GPUs
            </Content>
            <div className="provider-admin-dashboard__kpi-bar" aria-hidden>
              <div className="provider-admin-dashboard__kpi-bar-fill" style={{ width: '46.2%' }} />
            </div>
          </CardBody>
        </Card>

        <Card isFullHeight>
          <CardHeader>
            <CardTitle>
              <ModuleIcon style={{ marginInlineEnd: '0.5rem' }} />
              AI Instances
            </CardTitle>
          </CardHeader>
          <CardBody>
            <Title headingLevel="h2" size="4xl" className="provider-admin-dashboard__kpi-value">
              11 / 26
            </Title>
            <Content component="p" className="provider-admin-dashboard__kpi-hint">
              42% allocated
            </Content>
            <div className="provider-admin-dashboard__kpi-bar" aria-hidden>
              <div className="provider-admin-dashboard__kpi-bar-fill" style={{ width: '42%' }} />
            </div>
          </CardBody>
        </Card>

        <Card isFullHeight>
          <CardHeader>
            <CardTitle>
              <ClusterIcon style={{ marginInlineEnd: '0.5rem' }} />
              NVLink Clusters
            </CardTitle>
          </CardHeader>
          <CardBody>
            <Title headingLevel="h2" size="4xl" className="provider-admin-dashboard__kpi-value">
              1 / 2
            </Title>
            <Content component="p" className="provider-admin-dashboard__kpi-hint">
              72 GPUs per cluster
            </Content>
            <div className="provider-admin-dashboard__kpi-bar" aria-hidden>
              <div className="provider-admin-dashboard__kpi-bar-fill" style={{ width: '50%' }} />
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="provider-admin-dashboard__layout">
        <div>
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <CardTitle>Tenant organizations</CardTitle>
                <FormSelect
                  aria-label="Filter tenant organizations"
                  value="recent"
                  isDisabled={actionsDisabled}
                  style={{ width: 'auto', minWidth: '12rem' }}
                >
                  <FormSelectOption value="recent" label="Most recent changes" />
                </FormSelect>
              </div>
            </CardHeader>
            <CardBody>
              <div className="provider-admin-dashboard__tenant-grid">
                {PROVIDER_TENANT_ORGS.map((org) => (
                  <Card key={org.id} isCompact isFullHeight>
                    <CardBody>
                      <div className="provider-admin-dashboard__tenant-card-header">
                        <div>
                          <Title headingLevel="h3" size="md">
                            {org.name}
                          </Title>
                          <Content component="small">{org.tenantId}</Content>
                        </div>
                        <Label color="green" isCompact>
                          {org.status}
                        </Label>
                      </div>
                      <dl className="provider-admin-dashboard__tenant-meta">
                        <div>
                          <dt>Used VMs</dt>
                          <dd>{org.usedVms}</dd>
                        </div>
                        <div>
                          <dt>Users</dt>
                          <dd>{org.users}</dd>
                        </div>
                        <div>
                          <dt>Utilization</dt>
                          <dd>{org.utilizationPct}%</dd>
                        </div>
                      </dl>
                      <ResourceRow label="vCPU" used={org.vcpu.used} total={org.vcpu.total} />
                      <ResourceRow
                        label="Memory"
                        used={org.memoryGiB.used}
                        total={org.memoryGiB.total}
                      />
                      <ResourceRow
                        label="Storage"
                        used={org.storageGiB.used}
                        total={org.storageGiB.total}
                      />
                    </CardBody>
                  </Card>
                ))}
              </div>

              <div className="provider-admin-dashboard__actions">
                <Button
                  variant="secondary"
                  icon={<PlusCircleIcon />}
                  isDisabled={actionsDisabled}
                >
                  Onboard new tenant
                </Button>
                <Button variant="secondary" icon={<CatalogIcon />} isDisabled={actionsDisabled}>
                  Deploy global template
                </Button>
                <Button
                  variant="secondary"
                  icon={<InfrastructureIcon />}
                  isDisabled={actionsDisabled}
                >
                  View system health
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>

        <aside>
          <Card isFullHeight>
            <CardHeader>
              <CardTitle>Recent activities</CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="provider-admin-dashboard__activity-list">
                {PROVIDER_RECENT_ACTIVITIES.slice(0, 5).map((item) => (
                  <li key={item.id} className="provider-admin-dashboard__activity-item">
                    <div className="provider-admin-dashboard__activity-meta">
                      <Label color={item.labelColor} isCompact>
                        {item.area}
                      </Label>
                      <span className="provider-admin-dashboard__activity-time">{item.timeLabel}</span>
                    </div>
                    <Content component="p" className="provider-admin-dashboard__activity-title">
                      {item.title}
                    </Content>
                    <Content component="p" className="provider-admin-dashboard__activity-detail">
                      {item.detail}
                    </Content>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  )
}
