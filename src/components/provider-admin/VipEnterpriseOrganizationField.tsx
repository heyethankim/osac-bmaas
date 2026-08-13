import { useState } from 'react'
import {
  Alert,
  AlertActionLink,
  Button,
  Content,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core'
import { CheckIcon } from '@patternfly/react-icons/dist/esm/icons/check-icon'
import { InfoCircleIcon } from '@patternfly/react-icons/dist/esm/icons/info-circle-icon'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'

export function normalizeEnterpriseTenantIds(
  value: string | readonly string[] | undefined,
): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.map((entry) => String(entry).trim()).filter(Boolean))]
  }

  if (typeof value !== 'string') {
    return []
  }

  const trimmed = value.trim()
  return trimmed ? [trimmed] : []
}

type VipEnterpriseOrganizationFieldProps = {
  organizations: RegisteredOrganization[]
  selectedTenantIds: string[]
  onSelectedTenantIdsChange: (tenantIds: string[]) => void
  onRegisterOrganization?: () => void
  fieldIdPrefix: string
}

export function VipEnterpriseOrganizationField({
  organizations,
  selectedTenantIds,
  onSelectedTenantIdsChange,
  onRegisterOrganization,
  fieldIdPrefix,
}: VipEnterpriseOrganizationFieldProps) {
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false)
  const selectedIdSet = new Set(normalizeEnterpriseTenantIds(selectedTenantIds))

  const toggleOrganization = (tenantId: string) => {
    if (selectedIdSet.has(tenantId)) {
      onSelectedTenantIdsChange([...selectedIdSet].filter((id) => id !== tenantId))
      return
    }

    onSelectedTenantIdsChange([...selectedIdSet, tenantId])
  }

  const requestGoToOrganizations = () => {
    if (!onRegisterOrganization) {
      return
    }
    setIsLeaveConfirmOpen(true)
  }

  const closeLeaveConfirm = () => {
    setIsLeaveConfirmOpen(false)
  }

  const confirmGoToOrganizations = () => {
    setIsLeaveConfirmOpen(false)
    onRegisterOrganization?.()
  }

  const leaveConfirmModal = onRegisterOrganization ? (
    <Modal
      variant={ModalVariant.small}
      isOpen={isLeaveConfirmOpen}
      onClose={closeLeaveConfirm}
      aria-labelledby={`${fieldIdPrefix}-leave-orgs-title`}
      aria-describedby={`${fieldIdPrefix}-leave-orgs-description`}
    >
      <ModalHeader
        title="Are you sure?"
        titleIconVariant="warning"
        labelId={`${fieldIdPrefix}-leave-orgs-title`}
      />
      <ModalBody>
        <Content component="p" id={`${fieldIdPrefix}-leave-orgs-description`}>
          You will leave this catalog flow to register a new organization. Unsaved progress may be
          lost.
        </Content>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={confirmGoToOrganizations}>
          Register an organization
        </Button>
        <Button variant="link" onClick={closeLeaveConfirm}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  ) : null

  if (organizations.length === 0) {
    return (
      <>
        <Alert
          variant="warning"
          isInline
          title="No tenant organizations yet"
          className="provider-admin-catalog__vip-empty-alert"
          actionLinks={
            onRegisterOrganization ? (
              <AlertActionLink component="button" onClick={requestGoToOrganizations}>
                Register an organization
              </AlertActionLink>
            ) : undefined
          }
        >
          <Content component="p">
            VIP enterprise needs at least one registered organization to target. Register a new
            organization on the Organizations page, or save this catalog item as unpublished and
            assign tenants later. You can also switch to Global public to publish now.
          </Content>
        </Alert>
        {leaveConfirmModal}
      </>
    )
  }

  return (
    <div className="provider-admin-catalog__vip-enterprise-field">
      <FormGroup
        label="Select one or more enterprise organizations"
        fieldId={`${fieldIdPrefix}-enterprise-organizations`}
        isRequired
      >
        <div
          className="provider-admin-catalog__vip-org-cards"
          role="group"
          aria-label="Enterprise organizations"
        >
          {organizations.map((organization) => {
            const isSelected = selectedIdSet.has(organization.tenantId)
            const cardId = `${fieldIdPrefix}-enterprise-${organization.tenantId}`
            return (
              <button
                key={organization.id}
                type="button"
                id={cardId}
                className={`provider-admin-catalog__vip-org-card${
                  isSelected ? ' provider-admin-catalog__vip-org-card--selected' : ''
                }`}
                aria-pressed={isSelected}
                onClick={() => toggleOrganization(organization.tenantId)}
              >
                <span
                  className={`provider-admin-catalog__vip-org-card-indicator${
                    isSelected ? ' provider-admin-catalog__vip-org-card-indicator--selected' : ''
                  }`}
                  aria-hidden
                >
                  {isSelected ? <CheckIcon /> : null}
                </span>
                <span className="provider-admin-catalog__vip-org-card-name">
                  {organization.name.trim() || organization.tenantId}
                </span>
              </button>
            )
          })}
        </div>
      </FormGroup>

      {onRegisterOrganization ? (
        <div className="provider-admin-catalog__vip-orgs-hint">
          <span className="provider-admin-catalog__vip-orgs-hint-icon" aria-hidden>
            <InfoCircleIcon />
          </span>
          <div className="provider-admin-catalog__vip-orgs-hint-content">
            <Content component="p" className="provider-admin-catalog__vip-orgs-hint-title">
              Don&apos;t see the organization you need?{' '}
              <Button
                variant="link"
                isInline
                className="provider-admin-catalog__vip-orgs-hint-link"
                onClick={requestGoToOrganizations}
              >
                Register an organization
              </Button>
            </Content>
          </div>
        </div>
      ) : null}
      {leaveConfirmModal}
    </div>
  )
}

export function formatVipEnterpriseVisibilityLabel(
  organizations: RegisteredOrganization[],
  enterpriseTenantIdOrIds: string | readonly string[] | undefined,
): string {
  const tenantIds = normalizeEnterpriseTenantIds(enterpriseTenantIdOrIds)
  if (tenantIds.length === 0) {
    return 'VIP enterprise · Restricted — unassigned'
  }

  const names = tenantIds.map((tenantId) => {
    const organization = organizations.find((entry) => entry.tenantId === tenantId)
    return organization?.name ?? tenantId
  })

  if (names.length === 1) {
    return `VIP enterprise · ${names[0]}`
  }

  if (names.length === 2) {
    return `VIP enterprise · ${names[0]}, ${names[1]}`
  }

  return `VIP enterprise · ${names[0]} +${names.length - 1} more`
}

export function getCatalogEnterpriseTenantIds(item: {
  enterpriseTenantId?: string
  enterpriseTenantIds?: string[]
}): string[] {
  if (item.enterpriseTenantIds?.length) {
    return normalizeEnterpriseTenantIds(item.enterpriseTenantIds)
  }

  return normalizeEnterpriseTenantIds(item.enterpriseTenantId)
}
