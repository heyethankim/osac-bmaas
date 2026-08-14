import { useEffect, useState } from 'react'
import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import { GlobeIcon } from '@patternfly/react-icons/dist/esm/icons/globe-icon'
import {
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  TextInput,
} from '@patternfly/react-core'
import { KubernetesResourceNameField } from '../shared/KubernetesResourceNameHelper'
import {
  EXTERNAL_IP_POOL_DATA_CENTERS,
  generateExternalIpPoolId,
  type ExternalIpPool,
} from '../../providerAdmin/externalIpPools'
import { NETWORK_INVENTORY_CREATE_REVIEW_STEP } from '../../networking/networkInventoryCreateWizard'
import { isValidKubernetesResourceName } from '../../shared/kubernetesResourceName'
import { resolveNetworkInventoryScope } from '../../shared/networkInventoryScope'
import { NetworkInventoryCreateWizardShell } from './NetworkInventoryCreateWizardShell'

type CreatePoolForm = {
  name: string
  cidr: string
  dataCenter: string
  totalAddresses: string
}

const DEFAULT_CREATE_POOL_FORM: CreatePoolForm = {
  name: 'tenant-edge-pool',
  cidr: '203.0.113.0/26',
  dataCenter: EXTERNAL_IP_POOL_DATA_CENTERS[0],
  totalAddresses: '62',
}

const CREATE_EXTERNAL_IP_POOL_STEPS = [
  { id: 'pool', label: 'External IP pool' },
  NETWORK_INVENTORY_CREATE_REVIEW_STEP,
] as const

type CreateExternalIpPoolWizardProps = {
  isOpen: boolean
  parentLabel?: string
  tenantSlug?: string
  onClose: () => void
  onCreated: (pool: ExternalIpPool) => void
}

export function CreateExternalIpPoolWizard({
  isOpen,
  parentLabel = 'External IP pools',
  tenantSlug,
  onClose,
  onCreated,
}: CreateExternalIpPoolWizardProps) {
  const [form, setForm] = useState<CreatePoolForm>(DEFAULT_CREATE_POOL_FORM)

  useEffect(() => {
    if (!isOpen) {
      setForm(DEFAULT_CREATE_POOL_FORM)
    }
  }, [isOpen])

  const totalAddresses = Number.parseInt(form.totalAddresses, 10)
  const isNameValid = isValidKubernetesResourceName(form.name)
  const isDetailsStepValid =
    isNameValid &&
    Boolean(form.cidr.trim()) &&
    Boolean(form.dataCenter.trim()) &&
    Number.isFinite(totalAddresses) &&
    totalAddresses > 0

  const handleClose = () => {
    setForm(DEFAULT_CREATE_POOL_FORM)
    onClose()
  }

  const handleCreate = () => {
    if (!isDetailsStepValid) {
      return
    }

    const pool: ExternalIpPool = {
      id: generateExternalIpPoolId(),
      name: form.name.trim(),
      cidr: form.cidr.trim(),
      dataCenter: form.dataCenter.trim(),
      totalAddresses,
      assignedOrganizationId: null,
      assignedOrganizationName: null,
      createdAt: new Date().toISOString(),
    }

    resolveNetworkInventoryScope(tenantSlug).addExternalIpPool(pool)
    onCreated(pool)
    handleClose()
  }

  function renderStepContent(stepId: string) {
    if (stepId === 'pool') {
      return (
        <div className="provider-admin-network-inventory__wizard-step">
          <Content component="p" className="provider-admin-network-inventory__wizard-lede">
            External IP pools provide routable addresses for workloads that need public exposure.
          </Content>
          <Form autoComplete="off" className="provider-admin-network-inventory__form">
            <FormGroup label="Pool name" fieldId="create-pool-name" isRequired>
              <KubernetesResourceNameField
                id="create-pool-name"
                value={form.name}
                onChange={(value) => setForm((current) => ({ ...current, name: value }))}
                placeholder="e.g. tenant-edge-pool"
                isRequired
              />
            </FormGroup>
            <FormGroup label="CIDR" fieldId="create-pool-cidr" isRequired>
              <TextInput
                id="create-pool-cidr"
                value={form.cidr}
                onChange={(_event, value) => setForm((current) => ({ ...current, cidr: value }))}
              />
            </FormGroup>
            <FormGroup label="Data center" fieldId="create-pool-data-center" isRequired>
              <FormSelect
                id="create-pool-data-center"
                value={form.dataCenter}
                onChange={(_event, value) =>
                  setForm((current) => ({ ...current, dataCenter: value }))
                }
                aria-label="Data center"
              >
                {EXTERNAL_IP_POOL_DATA_CENTERS.map((dataCenter) => (
                  <FormSelectOption key={dataCenter} value={dataCenter} label={dataCenter} />
                ))}
              </FormSelect>
            </FormGroup>
            <FormGroup label="Total addresses" fieldId="create-pool-capacity" isRequired>
              <TextInput
                id="create-pool-capacity"
                type="number"
                min={1}
                value={form.totalAddresses}
                onChange={(_event, value) =>
                  setForm((current) => ({ ...current, totalAddresses: value }))
                }
              />
            </FormGroup>
          </Form>
        </div>
      )
    }

    return (
      <DescriptionList isCompact className="provider-admin-network-inventory__wizard-review">
        <DescriptionListGroup>
          <DescriptionListTerm>Pool name</DescriptionListTerm>
          <DescriptionListDescription>{form.name.trim() || '—'}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>CIDR</DescriptionListTerm>
          <DescriptionListDescription>
            <code>{form.cidr.trim() || '—'}</code>
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Data center</DescriptionListTerm>
          <DescriptionListDescription>{form.dataCenter.trim() || '—'}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Total addresses</DescriptionListTerm>
          <DescriptionListDescription>
            {Number.isFinite(totalAddresses) ? totalAddresses.toLocaleString() : '—'}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    )
  }

  function getStepFooter(stepId: string) {
    if (stepId === 'pool') {
      return { isNextDisabled: !isDetailsStepValid }
    }

    if (stepId === 'review') {
      return {
        nextButtonText: (
          <span className="provider-admin-network-inventory__wizard-footer-label">
            <GlobeIcon aria-hidden />
            <span>Create pool</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
        onNext: handleCreate,
        isNextDisabled: !isDetailsStepValid,
      }
    }

    return undefined
  }

  return (
    <NetworkInventoryCreateWizardShell
      isOpen={isOpen}
      parentLabel={parentLabel}
      title="Create external IP pool"
      titleId="create-external-ip-pool-wizard-title"
      steps={CREATE_EXTERNAL_IP_POOL_STEPS}
      renderStepContent={renderStepContent}
      getStepFooter={getStepFooter}
      onClose={handleClose}
    />
  )
}
