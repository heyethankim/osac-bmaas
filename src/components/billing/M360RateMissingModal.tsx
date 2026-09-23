import { Button, Content, Modal, ModalBody, ModalFooter, ModalHeader } from '@patternfly/react-core'
import {
  getCatalogItemBillingTargetOrganization,
  getCatalogItemM360Pricing,
  getM360RateCardConfigureUrl,
  getOrganizationDisplayName,
  markCatalogItemM360RateConfigured,
} from '../../billing/m360'
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import { RouterButton } from '../RouterButton'
import { ExternalLinkButton } from '../shared/ExternalLinkButton'

type M360RateMissingModalProps = {
  item: ProviderCatalogDraft | null
  isOpen: boolean
  onClose: () => void
  onRatesRefreshed?: () => void
}

export function M360RateMissingModal({
  item,
  isOpen,
  onClose,
  onRatesRefreshed,
}: M360RateMissingModalProps) {
  if (!item) {
    return null
  }

  const pricing = getCatalogItemM360Pricing(item)
  const targetOrganization = getCatalogItemBillingTargetOrganization(item)
  const tenantLabel =
    targetOrganization
      ? getOrganizationDisplayName(targetOrganization)
      : pricing.tenantName ?? 'this tenant'

  const handleRefreshRates = () => {
    markCatalogItemM360RateConfigured(item.catalogItemId)
    onRatesRefreshed?.()
    onClose()
  }

  if (
    pricing.reason === 'tenant_billing_incomplete' ||
    pricing.reason === 'm360_account_inactive'
  ) {
    return (
      <Modal
        variant="small"
        isOpen={isOpen}
        onClose={onClose}
        aria-labelledby="m360-billing-pending-title"
      >
        <ModalHeader
          title="Complete tenant billing setup"
          titleIconVariant="warning"
          labelId="m360-billing-pending-title"
        />
        <ModalBody>
          <Content component="p">
            <strong>{item.displayName}</strong> is scoped to <strong>{tenantLabel}</strong>, but
            that tenant does not have billing configured yet. Publishing stays blocked until tenant
            registration links an M360 billing account.
          </Content>
          {pricing.reason === 'm360_account_inactive' ? (
            <Content component="p">
              The M360 billing account for this tenant is inactive. Activate the account in M360,
              then finish tenant setup in OSAC.
            </Content>
          ) : (
            <Content component="p">
              You can keep this catalog item as an unpublished draft while tenant onboarding is in
              progress.
            </Content>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="link" onClick={onClose}>
            Cancel
          </Button>
          <RouterButton
            variant="primary"
            to="/provider/workspace?nav=administration-organizations"
            onClick={onClose}
          >
            Complete tenant setup
          </RouterButton>
        </ModalFooter>
      </Modal>
    )
  }

  return (
    <Modal variant="small" isOpen={isOpen} onClose={onClose} aria-labelledby="m360-rate-missing-title">
      <ModalHeader title="Rate card required" titleIconVariant="warning" labelId="m360-rate-missing-title" />
      <ModalBody>
        <Content component="p">
          <strong>{item.displayName}</strong> cannot be published to tenants until a matching rate
          card exists in M360.
        </Content>
        <Content component="p">
          Configure the rate in M360, then refresh pricing in OSAC to unlock publish and tenant
          provisioning.
        </Content>
      </ModalBody>
      <ModalFooter>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={handleRefreshRates}>
          Refresh rates
        </Button>
        <ExternalLinkButton
          variant="primary"
          href={getM360RateCardConfigureUrl(item.catalogItemId)}
          onClick={onClose}
        >
          Configure rate card in M360
        </ExternalLinkButton>
      </ModalFooter>
    </Modal>
  )
}
