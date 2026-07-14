import { Content, Title } from '@patternfly/react-core'

type PlaceholderProviderAdminPageProps = {
  title: string
  description: string
}

export function PlaceholderProviderAdminPage({
  title,
  description,
}: PlaceholderProviderAdminPageProps) {
  return (
    <div className="provider-admin-placeholder">
      <Title headingLevel="h1" size="3xl">
        {title}
      </Title>
      <Content component="p" className="provider-admin-placeholder__copy">
        {description}
      </Content>
    </div>
  )
}
