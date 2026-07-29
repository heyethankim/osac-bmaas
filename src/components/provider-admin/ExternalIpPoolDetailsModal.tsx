import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core'
import type { ExternalIpPool } from '../../providerAdmin/externalIpPools'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'

type ExternalIpPoolDetailsModalProps = {
  pool: ExternalIpPool | null
  organization: RegisteredOrganization | null
  onClose: () => void
}

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ExternalIpPoolDetailsModal({
  pool,
  organization,
  onClose,
}: ExternalIpPoolDetailsModalProps) {
  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={pool !== null}
      onClose={onClose}
      aria-labelledby="external-ip-pool-details-title"
      className="provider-admin-external-ip-pools__details-modal"
    >
      <ModalHeader
        title={pool?.name ?? 'External IP pool details'}
        labelId="external-ip-pool-details-title"
      />
      <ModalBody>
        {pool ? (
          <DescriptionList isCompact>
            <DescriptionListGroup>
              <DescriptionListTerm>Pool ID</DescriptionListTerm>
              <DescriptionListDescription>
                <code>{pool.id}</code>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>CIDR</DescriptionListTerm>
              <DescriptionListDescription>
                <code>{pool.cidr}</code>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Data center</DescriptionListTerm>
              <DescriptionListDescription>{pool.dataCenter}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Capacity</DescriptionListTerm>
              <DescriptionListDescription>
                {pool.totalAddresses.toLocaleString()} addresses
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Assignment</DescriptionListTerm>
              <DescriptionListDescription>
                {pool.assignedOrganizationName ? (
                  pool.assignedOrganizationName
                ) : (
                  <Label color="green" isCompact>
                    Available
                  </Label>
                )}
              </DescriptionListDescription>
            </DescriptionListGroup>
            {organization ? (
              <>
                <DescriptionListGroup>
                  <DescriptionListTerm>Primary email domain</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code>{organization.primaryDomain || '—'}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Organization status</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label
                      color={organization.status === 'Active' ? 'green' : 'orange'}
                      isCompact
                    >
                      {organization.status}
                    </Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Login path</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code>/tenant-admin/{organization.slug}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </>
            ) : null}
            <DescriptionListGroup>
              <DescriptionListTerm>Created</DescriptionListTerm>
              <DescriptionListDescription>{formatCreatedAt(pool.createdAt)}</DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        ) : null}
      </ModalBody>
    </Modal>
  )
}
