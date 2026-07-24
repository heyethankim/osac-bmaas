import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'

type OrganizationDetailsModalProps = {
  organization: RegisteredOrganization | null
  onClose: () => void
  onOpenAsTenantUser?: (organization: RegisteredOrganization) => void
}

function formatRegisteredAt(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function OrganizationDetailsModal({
  organization,
  onClose,
  onOpenAsTenantUser,
}: OrganizationDetailsModalProps) {
  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={organization !== null}
      onClose={onClose}
      aria-labelledby="organization-details-title"
      className="provider-admin-organizations__details-modal"
    >
      <ModalHeader
        title={organization?.name ?? 'Organization details'}
        labelId="organization-details-title"
      />
      <ModalBody>
        {organization ? (
          <DescriptionList isCompact>
            <DescriptionListGroup>
              <DescriptionListTerm>Organization</DescriptionListTerm>
              <DescriptionListDescription>{organization.name}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Tenant ID</DescriptionListTerm>
              <DescriptionListDescription>
                <code>{organization.tenantId}</code>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Status</DescriptionListTerm>
              <DescriptionListDescription>
                <Label color={organization.status === 'Active' ? 'green' : 'orange'} isCompact>
                  {organization.status}
                </Label>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Tenant admin</DescriptionListTerm>
              <DescriptionListDescription>
                {organization.tenantAdminName} · {organization.tenantAdminEmail}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Billing account</DescriptionListTerm>
              <DescriptionListDescription>
                {organization.billingAccountName} · <code>{organization.billingAccountId}</code>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Catalog access</DescriptionListTerm>
              <DescriptionListDescription>
                {organization.catalogDisplayName ?? 'Not assigned'}
                {organization.catalogItemId ? (
                  <>
                    {' '}
                    · <code>{organization.catalogItemId}</code>
                  </>
                ) : null}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>External IP pool</DescriptionListTerm>
              <DescriptionListDescription>
                {organization.externalIpPoolName ?? 'Not assigned'}
                {organization.externalIpPoolCidr ? (
                  <>
                    {' '}
                    · <code>{organization.externalIpPoolCidr}</code>
                  </>
                ) : null}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Instance quota</DescriptionListTerm>
              <DescriptionListDescription>
                {organization.maxInstances} BMaaS instances
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Login path</DescriptionListTerm>
              <DescriptionListDescription>
                <code>/tenant-admin/{organization.slug}</code>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Registered</DescriptionListTerm>
              <DescriptionListDescription>
                {formatRegisteredAt(organization.createdAt)}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        ) : null}
      </ModalBody>
      <ModalFooter>
        {organization && onOpenAsTenantUser ? (
          <Button
            variant="primary"
            onClick={() => onOpenAsTenantUser(organization)}
          >
            Open as tenant user
          </Button>
        ) : null}
        <Button variant="link" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  )
}
