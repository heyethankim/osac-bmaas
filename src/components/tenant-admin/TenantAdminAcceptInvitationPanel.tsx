import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import {
  Button,
  Card,
  CardBody,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import { activateProviderRegisteredOrganizationBySlug } from '../../providerSetup/storage'
import { TENANT_ACCEPT_INVITATION_INTRO } from '../../tenantAdmin/constants'
import { getTenantCatalogAccessLabel } from '../../tenantAdmin/catalog'
import { formatOrganizationExternalIpPoolLabel, resolveOrganizationExternalIpPool } from '../../tenantAdmin/projects'

type TenantAdminAcceptInvitationPanelProps = {
  organization: RegisteredOrganization
  catalogDraft: ProviderCatalogDraft | null
  onAccept: () => void
}

export function TenantAdminAcceptInvitationPanel({
  organization,
  catalogDraft,
  onAccept,
}: TenantAdminAcceptInvitationPanelProps) {
  const catalogAccessLabel = getTenantCatalogAccessLabel(organization, catalogDraft)
  const organizationPool = resolveOrganizationExternalIpPool(organization)
  const externalIpPoolLabel = formatOrganizationExternalIpPoolLabel(organizationPool)

  const handleAcceptInvitation = () => {
    activateProviderRegisteredOrganizationBySlug(organization.slug)
    onAccept()
  }

  return (
    <Stack hasGutter className="tenant-admin-onboarding">
      <StackItem className="tenant-admin-onboarding__intro">
        <Label color="blue">Invitation pending</Label>
        <Title headingLevel="h1" size="3xl">
          {TENANT_ACCEPT_INVITATION_INTRO.title}
        </Title>
        <Content component="p" className="tenant-admin-onboarding__lede">
          {TENANT_ACCEPT_INVITATION_INTRO.lede}
        </Content>
      </StackItem>

      <StackItem>
        <Card isCompact={false} className="tenant-admin-onboarding__body-card">
          <CardBody>
            <Content component="p" className="tenant-admin-onboarding__step-lede">
              Review the organization details below. Accept the invitation to access your tenant
              admin workspace.
            </Content>
            <DescriptionList isCompact className="tenant-admin-onboarding__invite-summary">
              <DescriptionListGroup>
                <DescriptionListTerm>Organization</DescriptionListTerm>
                <DescriptionListDescription>{organization.name}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Billing account</DescriptionListTerm>
                <DescriptionListDescription>
                  {organization.billingAccountName}{' '}
                  <code>{organization.billingAccountId}</code>
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Catalog access</DescriptionListTerm>
                <DescriptionListDescription>{catalogAccessLabel}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Instance quota</DescriptionListTerm>
                <DescriptionListDescription>
                  {organization.maxInstances} BMaaS instances
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>External IP pool</DescriptionListTerm>
                <DescriptionListDescription>{externalIpPoolLabel}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Tenant admin</DescriptionListTerm>
                <DescriptionListDescription>
                  {organization.tenantAdminName} · {organization.tenantAdminEmail}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
            <div className="tenant-admin-onboarding__step-actions">
              <Button variant="primary" onClick={handleAcceptInvitation}>
                Accept invitation
                <ArrowRightIcon style={{ marginInlineStart: '0.5rem' }} aria-hidden />
              </Button>
            </div>
          </CardBody>
        </Card>
      </StackItem>
    </Stack>
  )
}
