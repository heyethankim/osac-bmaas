import { Content, Title } from '@patternfly/react-core'

type PlaceholderTenantAdminPageProps = {
  title: string
  description: string
}

export function PlaceholderTenantAdminPage({
  title,
  description,
}: PlaceholderTenantAdminPageProps) {
  return (
    <div className="tenant-admin-workspace-page tenant-admin-placeholder">
      <Title headingLevel="h1" size="3xl">
        {title}
      </Title>
      <Content component="p" className="tenant-admin-placeholder__copy">
        {description}
      </Content>
    </div>
  )
}
