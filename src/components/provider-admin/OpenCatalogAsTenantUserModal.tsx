import { useEffect, useState } from 'react'
import {
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
import { getDemoTenantUserOrganization } from '../../providerAdmin/openAsTenantUser'

type OpenCatalogAsTenantUserModalProps = {
  catalog: ProviderCatalogDraft | null
  organizations: RegisteredOrganization[]
  onClose: () => void
  onConfirm: (organization: RegisteredOrganization) => void
}

export function OpenCatalogAsTenantUserModal({
  catalog,
  organizations,
  onClose,
  onConfirm,
}: OpenCatalogAsTenantUserModalProps) {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('')

  useEffect(() => {
    if (!catalog) {
      setSelectedOrganizationId('')
      return
    }

    const preferred =
      organizations.find((organization) => organization.catalogItemId === catalog.catalogItemId) ??
      organizations[0]

    setSelectedOrganizationId(preferred?.id ?? '')
  }, [catalog, organizations])

  const selectedOrganization =
    organizations.find((organization) => organization.id === selectedOrganizationId) ??
    (organizations.length === 0 ? getDemoTenantUserOrganization() : undefined)

  const handleConfirm = () => {
    if (!selectedOrganization) {
      return
    }
    onConfirm(selectedOrganization)
    onClose()
  }

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={catalog !== null}
      onClose={onClose}
      aria-labelledby="open-catalog-as-tenant-user-title"
      className="provider-admin-catalog-items__assign-modal"
    >
      <ModalHeader
        title="Open as tenant user"
        labelId="open-catalog-as-tenant-user-title"
      />
      <ModalBody>
        {catalog ? (
          <>
            <Content component="p" className="provider-admin-catalog-items__assign-note">
              Preview this catalog item in the tenant-user catalog.
            </Content>
            <DescriptionList isCompact className="provider-admin-catalog-items__assign-summary">
              <DescriptionListGroup>
                <DescriptionListTerm>Catalog item</DescriptionListTerm>
                <DescriptionListDescription>
                  {catalog.displayName} · <code>{catalog.catalogItemId}</code>
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
            {organizations.length === 0 ? (
              <Content component="p">
                No registered organizations yet. Preview will use north-summit-bank as a demo tenant.
              </Content>
            ) : (
              <Form autoComplete="off" className="provider-admin-catalog-items__assign-form">
                <FormGroup label="Organization" fieldId="open-as-tenant-user-org" isRequired>
                  <FormSelect
                    id="open-as-tenant-user-org"
                    value={selectedOrganizationId}
                    onChange={(_event, value) => setSelectedOrganizationId(value)}
                    aria-label="Organization"
                  >
                    {organizations.map((organization) => (
                      <FormSelectOption
                        key={organization.id}
                        value={organization.id}
                        label={`${organization.name} · ${organization.tenantId}`}
                      />
                    ))}
                  </FormSelect>
                </FormGroup>
              </Form>
            )}
          </>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleConfirm}
          isDisabled={!selectedOrganization}
        >
          Open as tenant user
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}
