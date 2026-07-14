import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Content,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  TextInput,
} from '@patternfly/react-core'
import { createTenantCatalogItem, type TenantCatalogItem } from '../../tenantAdmin/catalogItems'
import type { TenantCatalogView } from '../../tenantAdmin/catalog'
import { formatRateCardSummary } from '../../providerSetup/templateDemo'

type CreateTenantCatalogItemModalProps = {
  isOpen: boolean
  inheritedCatalog: TenantCatalogView | null
  onClose: () => void
  onCreate: (item: TenantCatalogItem) => void
}

export function CreateTenantCatalogItemModal({
  isOpen,
  inheritedCatalog,
  onClose,
  onCreate,
}: CreateTenantCatalogItemModalProps) {
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setDisplayName('')
    }
  }, [isOpen])

  const handleCreate = () => {
    if (!displayName.trim()) {
      return
    }

    onCreate(
      createTenantCatalogItem({
        displayName,
        sourceCatalogItemId: inheritedCatalog?.catalogItemId ?? null,
        rateCard: inheritedCatalog?.rateCard,
      }),
    )
    onClose()
  }

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="create-tenant-catalog-item-title"
      className="tenant-admin-catalog__create-modal"
    >
      <ModalHeader title="Create catalog item" labelId="create-tenant-catalog-item-title" />
      <ModalBody>
        {inheritedCatalog ? (
          <Alert
            variant="info"
            isInline
            title="Inherited provider catalog"
            className="tenant-admin-catalog__create-alert"
          >
            <Content component="p">
              This tenant-scoped item will inherit pricing from{' '}
              <strong>{inheritedCatalog.displayName}</strong> (
              {formatRateCardSummary(inheritedCatalog.rateCard)}).
            </Content>
          </Alert>
        ) : (
          <Alert
            variant="warning"
            isInline
            title="No provider catalog assigned"
            className="tenant-admin-catalog__create-alert"
          >
            <Content component="p">
              Your provider administrator has not assigned a catalog item yet. You can still create
              a tenant-scoped menu using default pricing.
            </Content>
          </Alert>
        )}
        <Form autoComplete="off" className="tenant-admin-catalog__form">
          <FormGroup label="Display name" fieldId="tenant-catalog-display-name" isRequired>
            <TextInput
              id="tenant-catalog-display-name"
              value={displayName}
              onChange={(_event, value) => setDisplayName(value)}
              placeholder="Approved compute menu for platform engineering"
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" isDisabled={!displayName.trim()} onClick={handleCreate}>
          Create catalog item
        </Button>
      </ModalFooter>
    </Modal>
  )
}
