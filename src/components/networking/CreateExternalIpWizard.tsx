import { useEffect, useMemo, useState } from 'react'
import {
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
  FormGroup,
  Label,
  Title,
} from '@patternfly/react-core'
import { NETWORK_INVENTORY_CREATE_REVIEW_STEP } from '../../networking/networkInventoryCreateWizard'
import {
  createAllocatedExternalIp,
  type ExternalIp,
} from '../../providerAdmin/externalIps'
import {
  getExternalIpPoolTotalAddresses,
  type ExternalIpPool,
} from '../../providerAdmin/externalIpPools'
import { formatExternalIpPoolCapacitySummary } from '../provider-admin/ExternalIpPoolHubCardSections'
import { addTenantExternalIp } from '../../tenantAdmin/networkInventoryStorage'
import { TENANT_EXTERNAL_IPS_PAGE_LABEL } from '../../tenantAdmin/constants'
import { NetworkInventoryCreateWizardShell } from './NetworkInventoryCreateWizardShell'

const CREATE_EXTERNAL_IP_STEPS = [
  { id: 'pool', label: 'External IP pool' },
  NETWORK_INVENTORY_CREATE_REVIEW_STEP,
] as const

type CreateExternalIpWizardProps = {
  isOpen: boolean
  tenantSlug: string
  pools: readonly ExternalIpPool[]
  usedAddresses: ReadonlySet<string>
  initialPoolId?: string | null
  parentLabel?: string
  onClose: () => void
  onCreated: (ip: ExternalIp) => void
}

export function CreateExternalIpWizard({
  isOpen,
  tenantSlug,
  pools,
  usedAddresses,
  initialPoolId = null,
  parentLabel = TENANT_EXTERNAL_IPS_PAGE_LABEL,
  onClose,
  onCreated,
}: CreateExternalIpWizardProps) {
  const [selectedPoolId, setSelectedPoolId] = useState<string>(
    () => initialPoolId ?? pools[0]?.id ?? '',
  )

  useEffect(() => {
    if (isOpen) {
      setSelectedPoolId(initialPoolId ?? pools[0]?.id ?? '')
    }
  }, [initialPoolId, isOpen, pools])

  const selectedPool = useMemo(
    () => pools.find((pool) => pool.id === selectedPoolId) ?? pools[0] ?? null,
    [pools, selectedPoolId],
  )

  const previewIp = useMemo(
    () => (selectedPool ? createAllocatedExternalIp(selectedPool, usedAddresses) : null),
    [selectedPool, usedAddresses],
  )

  const handleCreate = () => {
    if (!selectedPool || !previewIp) {
      return
    }

    addTenantExternalIp(tenantSlug, previewIp)
    onCreated(previewIp)
  }

  const renderPoolStep = () => (
    <div className="provider-admin-network-inventory__wizard-step">
      <Content component="p" className="provider-admin-network-inventory__wizard-lede">
        Select an assigned IP pool. The platform allocates the next available address
        automatically.
      </Content>
      {pools.length === 0 ? (
        <Content component="p">No assigned IP pools are available yet.</Content>
      ) : (
        <Form autoComplete="off" className="provider-admin-network-inventory__form">
          <FormGroup label="IP pool" fieldId="create-external-ip-pool" isRequired>
            <div
              id="create-external-ip-pool"
              className="provider-setup-template__card-group provider-admin-network-inventory__tenant-cards"
              role="radiogroup"
              aria-label="External IP pool"
            >
              {pools.map((pool) => {
                const isSelected = selectedPoolId === pool.id
                const titleId = `create-external-ip-pool-${pool.id}-name`

                return (
                  <button
                    key={pool.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-labelledby={titleId}
                    className={`provider-setup-template__select-card provider-admin-network-inventory__tenant-card${
                      isSelected ? ' provider-setup-template__select-card--selected' : ''
                    }`}
                    onClick={() => setSelectedPoolId(pool.id)}
                  >
                    {isSelected ? (
                      <Label
                        color="grey"
                        isCompact
                        className="provider-setup-template__select-card-selected-badge"
                      >
                        Selected
                      </Label>
                    ) : null}
                    <Title
                      id={titleId}
                      headingLevel="h3"
                      size="md"
                      className="provider-setup-template__select-card-title"
                    >
                      {pool.name}
                    </Title>
                    <Content
                      component="p"
                      className="provider-setup-template__select-card-meta"
                    >
                      {pool.cidr}
                    </Content>
                    <Content
                      component="p"
                      className="provider-setup-template__select-card-detail"
                    >
                      {formatExternalIpPoolCapacitySummary(pool, 0)} ·{' '}
                      {getExternalIpPoolTotalAddresses(pool).toLocaleString()} total
                    </Content>
                  </button>
                )
              })}
            </div>
          </FormGroup>
        </Form>
      )}
    </div>
  )

  const renderReviewStep = () => (
    <div className="provider-admin-network-inventory__wizard-step">
      <Content component="p" className="provider-admin-network-inventory__wizard-lede">
        Review the automatically assigned external IP before creating it.
      </Content>
      <DescriptionList isCompact className="provider-admin-network-inventory__wizard-review">
        <DescriptionListGroup>
          <DescriptionListTerm>IP pool</DescriptionListTerm>
          <DescriptionListDescription>{selectedPool?.name ?? '—'}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Address</DescriptionListTerm>
          <DescriptionListDescription>
            <code>{previewIp?.address ?? '—'}</code>
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Status</DescriptionListTerm>
          <DescriptionListDescription>Available</DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    </div>
  )

  return (
    <NetworkInventoryCreateWizardShell
      isOpen={isOpen}
      parentLabel={parentLabel}
      title="Create external IP"
      titleId="create-external-ip-wizard-title"
      description="Allocate an external address from an assigned IP pool."
      steps={CREATE_EXTERNAL_IP_STEPS}
      renderStepContent={(stepId) => {
        if (stepId === 'pool') {
          return renderPoolStep()
        }

        if (stepId === 'review') {
          return renderReviewStep()
        }

        return null
      }}
      getStepFooter={(stepId) => {
        if (stepId === 'pool') {
          return {
            isNextDisabled: !selectedPool,
          }
        }

        if (stepId === 'review') {
          return {
            nextButtonText: 'Create external IP',
            onNext: handleCreate,
            isNextDisabled: !previewIp,
          }
        }

        return undefined
      }}
      onClose={onClose}
      className="provider-admin-external-networks-hub__create-ip-wizard"
      leaveConfirmPrimaryActionLabel="Leave create external IP"
      getStepName={(step) => step.label}
    />
  )
}
