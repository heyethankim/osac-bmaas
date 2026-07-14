import { Content, Page, PageSection, Title } from '@patternfly/react-core'
import { useParams } from 'react-router-dom'
import { RouterButton } from '../components/RouterButton'
import { DEMO_TENANT_LABEL, isDemoTenantId } from '../demoTenant'

const roleLabels = {
  provider: 'Provider Admin',
  'tenant-admin': 'Tenant Admin',
  'tenant-user': 'Tenant User',
} as const

type RoleKey = keyof typeof roleLabels

type PlaceholderRolePageProps = {
  role: RoleKey
}

export function PlaceholderRolePage({ role }: PlaceholderRolePageProps) {
  const { tenant } = useParams<{ tenant?: string }>()
  const tenantLabel =
    tenant && isDemoTenantId(tenant) ? DEMO_TENANT_LABEL[tenant] : undefined
  const roleLabel = roleLabels[role]

  return (
    <Page>
      <PageSection isWidthLimited>
        <Title headingLevel="h1" size="2xl">
          {roleLabel}
          {tenantLabel ? ` — ${tenantLabel}` : ''}
        </Title>
        <Content component="p" style={{ marginTop: '1rem' }}>
          This workspace is a placeholder for the {roleLabel.toLowerCase()} experience. Role-specific
          flows will be added in upcoming milestones.
        </Content>
        <RouterButton variant="link" to="/" isInline style={{ marginTop: '1.5rem' }}>
          Back to role selection
        </RouterButton>
      </PageSection>
    </Page>
  )
}
