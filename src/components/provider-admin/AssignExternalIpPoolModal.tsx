import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core'
import type { ExternalIpPool } from '../../providerAdmin/externalIpPools'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'

type AssignExternalIpPoolModalProps = {
  pool: ExternalIpPool | null
  organizations: RegisteredOrganization[]
  onClose: () => void
  onAssign: (organizationId: string) => void
}

export function AssignExternalIpPoolModal({
  pool,
  organizations,
  onClose,
  onAssign,
}: AssignExternalIpPoolModalProps) {
  const eligibleOrganizations = useMemo(
    () => organizations.filter((organization) => !organization.externalIpPoolId),
    [organizations],
  )
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('')

  useEffect(() => {
    if (!pool) {
      setSelectedOrganizationId('')
      return
    }

    setSelectedOrganizationId(eligibleOrganizations[0]?.id ?? '')
  }, [pool, eligibleOrganizations])

  const selectedOrganization = eligibleOrganizations.find(
    (organization) => organization.id === selectedOrganizationId,
  )

  const handleAssign = () => {
    if (!selectedOrganizationId) {
      return
    }

    onAssign(selectedOrganizationId)
    onClose()
  }

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={pool !== null}
      onClose={onClose}
      aria-labelledby="assign-external-ip-pool-title"
      className="provider-admin-external-ip-pools__assign-modal"
    >
      <ModalHeader title="Assign to organization" labelId="assign-external-ip-pool-title" />
      <ModalBody>
        {pool ? (
          <>
            <DescriptionList isCompact className="provider-admin-external-ip-pools__assign-summary">
              <DescriptionListGroup>
                <DescriptionListTerm>Pool</DescriptionListTerm>
                <DescriptionListDescription>
                  {pool.name} · <code>{pool.cidr}</code>
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Data center</DescriptionListTerm>
                <DescriptionListDescription>{pool.dataCenter}</DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>

            {eligibleOrganizations.length === 0 ? (
              <Alert
                variant="warning"
                isInline
                title="No eligible organizations"
                className="provider-admin-external-ip-pools__assign-alert"
              >
                <Content component="p">
                  Register a tenant organization without an external IP pool, or release an existing
                  assignment before assigning this pool.
                </Content>
              </Alert>
            ) : (
              <Form autoComplete="off" className="provider-admin-external-ip-pools__form">
                <FormGroup label="Organization" fieldId="assign-pool-organization" isRequired>
                  <FormSelect
                    id="assign-pool-organization"
                    value={selectedOrganizationId}
                    onChange={(_event, value) => setSelectedOrganizationId(value)}
                    aria-label="Organization"
                  >
                    {eligibleOrganizations.map((organization) => (
                      <FormSelectOption
                        key={organization.id}
                        value={organization.id}
                        label={organization.name}
                      />
                    ))}
                  </FormSelect>
                </FormGroup>
                {selectedOrganization ? (
                  <Content component="p" className="provider-admin-external-ip-pools__assign-note">
                    {selectedOrganization.name} will receive exclusive access to this address pool
                    for tenant edge exposure.
                  </Content>
                ) : null}
              </Form>
            )}
          </>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          isDisabled={!selectedOrganizationId || eligibleOrganizations.length === 0}
          onClick={handleAssign}
        >
          Assign pool
        </Button>
      </ModalFooter>
    </Modal>
  )
}
