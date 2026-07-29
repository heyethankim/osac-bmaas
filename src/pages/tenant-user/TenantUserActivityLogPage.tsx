import { Content, Title } from '@patternfly/react-core'

export function TenantUserActivityLogPage() {
  return (
    <div className="tenant-user-workspace-page tenant-user-activity-log">
      <Title headingLevel="h1" size="3xl" className="tenant-user-activity-log__title">
        Activity log
      </Title>
      <Content component="p" className="tenant-user-activity-log__lede">
        Review recent provisioning, lifecycle, and access activity for your instances.
      </Content>
    </div>
  )
}
