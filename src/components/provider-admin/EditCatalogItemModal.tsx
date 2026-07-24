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
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Radio,
  TextArea,
  TextInput,
} from '@patternfly/react-core'
import { CatalogPublishScopeIcon } from './CatalogPublishScopeIcon'
import { VipEnterpriseOrganizationField } from './VipEnterpriseOrganizationField'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import {
  CATALOG_SERVICE_FILTER_LABELS,
  formatRateCardSummary,
  type CatalogServiceId,
  type PublishCatalogScope,
} from '../../providerSetup/templateDemo'

export type CatalogItemEditFields = {
  displayName: string
  description: string
  scope: PublishCatalogScope
  enterpriseTenantId?: string
}

type EditCatalogItemModalProps = {
  catalog: ProviderCatalogDraft | null
  serviceId: CatalogServiceId
  organizations: RegisteredOrganization[]
  initialEnterpriseTenantId?: string
  onClose: () => void
  onSave: (fields: CatalogItemEditFields) => void
  onRegisterOrganization?: () => void
}

export function EditCatalogItemModal({
  catalog,
  serviceId,
  organizations,
  initialEnterpriseTenantId,
  onClose,
  onSave,
  onRegisterOrganization,
}: EditCatalogItemModalProps) {
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [publishScope, setPublishScope] = useState<PublishCatalogScope>('global-public')
  const [enterpriseTenantId, setEnterpriseTenantId] = useState('')

  useEffect(() => {
    if (!catalog) {
      setDisplayName('')
      setDescription('')
      setPublishScope('global-public')
      setEnterpriseTenantId('')
      return
    }

    setDisplayName(catalog.displayName)
    setDescription(catalog.description ?? '')
    setPublishScope(catalog.scope)

    const preferredTenantId = initialEnterpriseTenantId ?? catalog.enterpriseTenantId ?? ''
    if (catalog.scope === 'vip-enterprise') {
      const resolvedTenantId =
        preferredTenantId &&
        organizations.some((organization) => organization.tenantId === preferredTenantId)
          ? preferredTenantId
          : (organizations[0]?.tenantId ?? preferredTenantId)
      setEnterpriseTenantId(resolvedTenantId)
    } else {
      setEnterpriseTenantId('')
    }
  }, [catalog, initialEnterpriseTenantId, organizations])

  useEffect(() => {
    if (!catalog || publishScope !== 'vip-enterprise' || enterpriseTenantId.trim()) {
      return
    }

    const firstOrganization = organizations[0]
    if (firstOrganization) {
      setEnterpriseTenantId(firstOrganization.tenantId)
    }
  }, [catalog, organizations, publishScope, enterpriseTenantId])

  const isVipEnterprise = publishScope === 'vip-enterprise'
  const canSave = Boolean(displayName.trim())

  const selectVipEnterprise = () => {
    setPublishScope('vip-enterprise')
    setEnterpriseTenantId((current) => {
      if (current.trim() && organizations.some((organization) => organization.tenantId === current)) {
        return current
      }
      return organizations[0]?.tenantId ?? ''
    })
  }

  const handleSave = () => {
    if (!canSave) {
      return
    }

    onSave({
      displayName: displayName.trim(),
      description: description.trim(),
      scope: publishScope,
      ...(isVipEnterprise && enterpriseTenantId.trim()
        ? { enterpriseTenantId: enterpriseTenantId.trim() }
        : {}),
    })
    onClose()
  }

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={catalog !== null}
      onClose={onClose}
      aria-labelledby="edit-catalog-item-title"
      className="provider-admin-catalog-items__edit-modal"
    >
      <ModalHeader title="Edit catalog item" labelId="edit-catalog-item-title" />
      <ModalBody>
        {catalog ? (
          <>
            <Content component="p" className="provider-admin-catalog-items__edit-lede">
              Update the storefront name, description, and visibility. Service, linked template, and
              rate stay locked—create a new catalog item to change those.
            </Content>

            <DescriptionList isCompact className="provider-admin-catalog-items__edit-summary">
              <DescriptionListGroup>
                <DescriptionListTerm>Service</DescriptionListTerm>
                <DescriptionListDescription>
                  {CATALOG_SERVICE_FILTER_LABELS[serviceId]}
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
              <DescriptionListGroup>
                <DescriptionListTerm>Catalog item ID</DescriptionListTerm>
                <DescriptionListDescription>
                  <code>{catalog.catalogItemId}</code>
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>

            <Form autoComplete="off" className="provider-admin-catalog-items__edit-form">
              <FormGroup label="Name" fieldId="edit-catalog-item-name" isRequired>
                <TextInput
                  id="edit-catalog-item-name"
                  value={displayName}
                  onChange={(_event, value) => setDisplayName(value)}
                  aria-label="Name"
                  isRequired
                />
              </FormGroup>

              <FormGroup label="Description" fieldId="edit-catalog-item-description">
                <TextArea
                  id="edit-catalog-item-description"
                  value={description}
                  onChange={(_event, value) => setDescription(value)}
                  aria-label="Description"
                  rows={4}
                />
              </FormGroup>

              <FormGroup label="Visibility" fieldId="edit-catalog-item-visibility" isRequired>
                <div
                  className="provider-admin-catalog__scope-options"
                  role="radiogroup"
                  aria-label="Visibility"
                >
                  <button
                    type="button"
                    className={`provider-admin-catalog__scope-card${
                      publishScope === 'global-public'
                        ? ' provider-admin-catalog__scope-card--selected'
                        : ''
                    }`}
                    onClick={() => {
                      setPublishScope('global-public')
                      setEnterpriseTenantId('')
                    }}
                    role="radio"
                    aria-checked={publishScope === 'global-public'}
                  >
                    <CatalogPublishScopeIcon
                      scope="global-public"
                      className="provider-admin-catalog__scope-icon"
                    />
                    <span className="provider-admin-catalog__scope-copy">
                      <span className="provider-admin-catalog__scope-title">Global public</span>
                      <span className="provider-admin-catalog__scope-detail">
                        Visible to all tenants.
                      </span>
                    </span>
                    <Radio
                      id="edit-scope-global-public"
                      name="edit-catalog-scope"
                      isChecked={publishScope === 'global-public'}
                      onChange={() => {
                        setPublishScope('global-public')
                        setEnterpriseTenantId('')
                      }}
                      aria-label="Global public"
                    />
                  </button>
                  <button
                    type="button"
                    className={`provider-admin-catalog__scope-card${
                      publishScope === 'vip-enterprise'
                        ? ' provider-admin-catalog__scope-card--selected'
                        : ''
                    }`}
                    onClick={selectVipEnterprise}
                    role="radio"
                    aria-checked={publishScope === 'vip-enterprise'}
                  >
                    <CatalogPublishScopeIcon
                      scope="vip-enterprise"
                      className="provider-admin-catalog__scope-icon"
                    />
                    <span className="provider-admin-catalog__scope-copy">
                      <span className="provider-admin-catalog__scope-title">VIP enterprise</span>
                      <span className="provider-admin-catalog__scope-detail">
                        Visible only to a specific enterprise tenant.
                      </span>
                    </span>
                    <Radio
                      id="edit-scope-vip-enterprise"
                      name="edit-catalog-scope"
                      isChecked={publishScope === 'vip-enterprise'}
                      onChange={selectVipEnterprise}
                      aria-label="VIP enterprise"
                    />
                  </button>
                </div>
              </FormGroup>

              {isVipEnterprise ? (
                <VipEnterpriseOrganizationField
                  organizations={organizations}
                  selectedTenantId={enterpriseTenantId}
                  onSelectedTenantIdChange={setEnterpriseTenantId}
                  onRegisterOrganization={onRegisterOrganization}
                  fieldIdPrefix="edit-catalog"
                />
              ) : null}
            </Form>
          </>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" isDisabled={!canSave} onClick={handleSave}>
          Save
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}
