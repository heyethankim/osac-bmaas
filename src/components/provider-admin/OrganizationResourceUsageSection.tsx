import { type ReactNode, useMemo } from 'react'
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  Label,
  LabelGroup,
  Progress,
  ProgressMeasureLocation,
  Title,
} from '@patternfly/react-core'
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import { getOrganizationResourceUsage } from '../../providerAdmin/organizationResourceUsage'

function quotaVariant(used: number, total: number): 'success' | 'warning' | 'danger' | undefined {
  if (total <= 0) {
    return undefined
  }
  const percent = (used / total) * 100
  if (percent >= 100) {
    return 'danger'
  }
  if (percent >= 80) {
    return 'warning'
  }
  return undefined
}

function UsageProgressRow({
  label,
  used,
  total,
  icon,
  hint,
  countLabel,
  variant,
}: {
  label: string
  used: number
  total: number
  icon?: ReactNode
  hint?: string
  countLabel?: string
  variant?: 'success' | 'warning' | 'danger'
}) {
  const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0

  return (
    <div className="provider-admin-organizations__usage-row">
      <div className="provider-admin-organizations__usage-row-copy">
        <div className="provider-admin-organizations__usage-row-label">
          {icon ? (
            <span className="provider-admin-organizations__usage-row-icon" aria-hidden>
              {icon}
            </span>
          ) : null}
          <span>{label}</span>
        </div>
        {hint ? (
          <span className="provider-admin-organizations__usage-row-hint">{hint}</span>
        ) : null}
      </div>
      <Progress
        value={percent}
        measureLocation={ProgressMeasureLocation.none}
        size="sm"
        variant={variant}
        aria-label={`${label} ${used} of ${total}`}
      />
      <span className="provider-admin-organizations__usage-row-count">
        {countLabel ?? `${used}/${total}`}
      </span>
    </div>
  )
}

export function OrganizationResourceUsageSection({
  organization,
}: {
  organization: RegisteredOrganization
}) {
  const usage = useMemo(() => getOrganizationResourceUsage(organization), [organization])
  const instanceTotal = Math.max(usage.instanceCount, 0)

  return (
    <div className="provider-admin-organizations__usage">
      <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
        Resource usage
      </Title>
      <Content component="p" className="provider-admin-organizations__usage-lede">
        Catalog items, instance quota, and project consumption for this tenant.
      </Content>

      <div className="provider-admin-organizations__usage-kpis">
        <Card isCompact>
          <CardHeader>
            <CardTitle>Catalog items</CardTitle>
          </CardHeader>
          <CardBody>
            <Title headingLevel="h3" size="2xl" className="provider-admin-organizations__usage-kpi-value">
              {usage.catalogItems.length.toLocaleString()}
            </Title>
            {usage.catalogItems.length === 0 ? (
              <Content component="p" className="provider-admin-organizations__usage-kpi-hint">
                No catalog items assigned
              </Content>
            ) : (
              <LabelGroup
                className="provider-admin-organizations__usage-labels"
                numLabels={3}
                aria-label="Assigned catalog items"
              >
                {usage.catalogItems.map((item) => (
                  <Label key={item.id} isCompact>
                    {item.displayName}
                  </Label>
                ))}
              </LabelGroup>
            )}
          </CardBody>
        </Card>

        <Card isCompact>
          <CardHeader>
            <CardTitle>Instances</CardTitle>
          </CardHeader>
          <CardBody>
            <Title headingLevel="h3" size="2xl" className="provider-admin-organizations__usage-kpi-value">
              {usage.instanceCount.toLocaleString()}
              <span> / {usage.maxInstances.toLocaleString()}</span>
            </Title>
            <Progress
              value={usage.instancePercent}
              measureLocation={ProgressMeasureLocation.none}
              size="sm"
              variant={quotaVariant(usage.instanceCount, usage.maxInstances)}
              aria-label={`Instance quota ${usage.instancePercent} percent`}
            />
            <Content component="p" className="provider-admin-organizations__usage-kpi-hint">
              {usage.instancePercent}% of organization quota
            </Content>
          </CardBody>
        </Card>

        <Card isCompact>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardBody>
            <Title headingLevel="h3" size="2xl" className="provider-admin-organizations__usage-kpi-value">
              {usage.projectCount.toLocaleString()}
            </Title>
            <Content component="p" className="provider-admin-organizations__usage-kpi-hint">
              {usage.projects.reduce((sum, project) => sum + project.memberCount, 0)} members across
              projects
            </Content>
          </CardBody>
        </Card>

        <Card isCompact>
          <CardHeader>
            <CardTitle>IP pools</CardTitle>
          </CardHeader>
          <CardBody>
            <Title headingLevel="h3" size="2xl" className="provider-admin-organizations__usage-kpi-value">
              {usage.pools.length.toLocaleString()}
            </Title>
            {usage.pools.length === 0 ? (
              <Content component="p" className="provider-admin-organizations__usage-kpi-hint">
                No external IP pool
              </Content>
            ) : (
              <LabelGroup
                className="provider-admin-organizations__usage-labels"
                numLabels={2}
                aria-label="External IP pools"
              >
                {usage.pools.map((pool) => (
                  <Label
                    key={pool.id}
                    color={pool.id === organization.externalIpPoolId ? 'blue' : 'grey'}
                    isCompact
                  >
                    {pool.name}
                    {pool.id === organization.externalIpPoolId ? ' · Primary' : ''}
                  </Label>
                ))}
              </LabelGroup>
            )}
            {usage.pools[0] ? (
              <Content component="p" className="provider-admin-organizations__usage-kpi-hint">
                <code>{usage.pools[0].cidr}</code>
              </Content>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <div className="provider-admin-organizations__usage-split">
        <Card isCompact>
          <CardHeader>
            <CardTitle>Instances by service</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="provider-admin-organizations__usage-rows">
              {usage.byService.map((service) => (
                <UsageProgressRow
                  key={service.id}
                  label={service.label}
                  used={service.count}
                  total={instanceTotal}
                  icon={getCatalogServiceIcon(service.id)}
                  countLabel={`${service.count.toLocaleString()} of ${instanceTotal.toLocaleString()}`}
                />
              ))}
            </div>
          </CardBody>
        </Card>

        <Card isCompact>
          <CardHeader>
            <CardTitle>Instances by project</CardTitle>
          </CardHeader>
          <CardBody>
            {usage.projects.length === 0 ? (
              <Content component="p" className="provider-admin-organizations__usage-empty">
                No projects yet.
              </Content>
            ) : (
              <div className="provider-admin-organizations__usage-rows">
                {usage.projects.map((project) => (
                  <UsageProgressRow
                    key={project.id}
                    label={`${project.name} · ${project.environmentLabel}`}
                    hint={
                      project.catalogItemNames.length > 0
                        ? project.catalogItemNames.join(', ')
                        : 'No catalog items attached'
                    }
                    used={project.used}
                    total={project.quota}
                    variant={quotaVariant(project.used, project.quota)}
                  />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
