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
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import { formatRateCardSummary } from '../../providerSetup/templateDemo'

type AssignCatalogToOrganizationModalProps = {
  catalog: ProviderCatalogDraft | null
  organizations: RegisteredOrganization[]
  defaultOrganizationId?: string | null
  onClose: () => void
  onAssign: (organizationId: string) => void
}

export function AssignCatalogToOrganizationModal({
  catalog,
  organizations,
  defaultOrganizationId = null,
  onClose,
  onAssign,
}: AssignCatalogToOrganizationModalProps) {
  const eligibleOrganizations = useMemo(
    () => organizations.filter((organization) => !organization.catalogItemId),
    [organizations],
  )
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('')

  useEffect(() => {
    if (!catalog) {
      setSelectedOrganizationId('')
      return
    }

    const preferredOrganizationId =
      defaultOrganizationId &&
      eligibleOrganizations.some((organization) => organization.id === defaultOrganizationId)
        ? defaultOrganizationId
        : (eligibleOrganizations[0]?.id ?? '')

    setSelectedOrganizationId(preferredOrganizationId)
  }, [catalog, defaultOrganizationId, eligibleOrganizations])

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
      isOpen={catalog !== null}
      onClose={onClose}
      aria-labelledby="assign-catalog-item-title"
      className="provider-admin-catalog-items__assign-modal"
    >
      <ModalHeader title="Assign to organization" labelId="assign-catalog-item-title" />
      <ModalBody>
        {catalog ? (
          <>
            <DescriptionList isCompact className="provider-admin-catalog-items__assign-summary">
              <DescriptionListGroup>
                <DescriptionListTerm>Catalog item</DescriptionListTerm>
                <DescriptionListDescription>
                  {catalog.displayName} · <code>{catalog.catalogItemId}</code>
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Linked template</DescriptionListTerm>
                <DescriptionListDescription>{catalog.templateName}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Rate</DescriptionListTerm>
                <DescriptionListDescription>
                  {formatRateCardSummary(catalog.rateCard)}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>

            {eligibleOrganizations.length === 0 ? (
              <Alert
                variant="warning"
                isInline
                title="No eligible organizations"
                className="provider-admin-catalog-items__assign-alert"
              >
                <Content component="p">
                  Register a tenant organization first, or remove an existing catalog assignment
                  before attaching this item to another tenant.
                </Content>
              </Alert>
            ) : (
              <Form autoComplete="off" className="provider-admin-catalog-items__form">
                <FormGroup label="Organization" fieldId="assign-catalog-organization" isRequired>
                  <FormSelect
                    id="assign-catalog-organization"
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
                  <Content component="p" className="provider-admin-catalog-items__assign-note">
                    {selectedOrganization.name} will see this catalog item in its tenant storefront
                    after the tenant admin accepts the invitation.
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
          Assign catalog item
        </Button>
      </ModalFooter>
    </Modal>
  )
}
