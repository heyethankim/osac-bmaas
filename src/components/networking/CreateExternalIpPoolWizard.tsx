import { useEffect, useMemo, useState } from 'react'
import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import { GlobeIcon } from '@patternfly/react-icons/dist/esm/icons/globe-icon'
import {
  Alert,
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
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import { NETWORK_INVENTORY_CREATE_REVIEW_STEP } from '../../networking/networkInventoryCreateWizard'
import { isValidKubernetesResourceName } from '../../shared/kubernetesResourceName'
import { resolveNetworkInventoryScope } from '../../shared/networkInventoryScope'
import { assignExternalIpPoolToRegisteredOrganization } from '../../providerSetup/storage'
import { NetworkInventoryCreateWizardShell } from './NetworkInventoryCreateWizardShell'

type CreatePoolForm = {
  name: string
  cidr: string
  dataCenter: string
  totalAddresses: string
  organizationId: string
}

const DEFAULT_CREATE_POOL_FORM: CreatePoolForm = {
  name: 'tenant-edge-pool',
  cidr: '203.0.113.0/26',
  dataCenter: EXTERNAL_IP_POOL_DATA_CENTERS[0],
  totalAddresses: '62',
  organizationId: '',
}

const PROVIDER_CREATE_EXTERNAL_IP_POOL_STEPS = [
  { id: 'pool', label: 'External IP pool' },
  { id: 'organization', label: 'Tenant' },
  NETWORK_INVENTORY_CREATE_REVIEW_STEP,
] as const

const TENANT_CREATE_EXTERNAL_IP_POOL_STEPS = [
  { id: 'pool', label: 'External IP pool' },
  NETWORK_INVENTORY_CREATE_REVIEW_STEP,
] as const

type CreateExternalIpPoolWizardProps = {
  isOpen: boolean
  parentLabel?: string
  tenantSlug?: string
  organizations?: RegisteredOrganization[]
  resource?: ExternalIpPool | null
  onClose: () => void
  onCreated: (pool: ExternalIpPool) => void
}

function buildFormFromPool(pool: ExternalIpPool): CreatePoolForm {
  return {
    name: pool.name,
    cidr: pool.cidr,
    dataCenter: pool.dataCenter,
    totalAddresses: String(pool.totalAddresses),
    organizationId: pool.assignedOrganizationId ?? '',
  }
}

export function CreateExternalIpPoolWizard({
  isOpen,
  parentLabel = 'External IP pools',
  tenantSlug,
  organizations = [],
  resource = null,
  onClose,
  onCreated,
}: CreateExternalIpPoolWizardProps) {
  const isEditMode = resource !== null
  const isProviderCreate = !tenantSlug && !isEditMode
  const steps = isProviderCreate
    ? PROVIDER_CREATE_EXTERNAL_IP_POOL_STEPS
    : TENANT_CREATE_EXTERNAL_IP_POOL_STEPS
  const assignableOrganizations = useMemo(() => organizations, [organizations])
  const [form, setForm] = useState<CreatePoolForm>(DEFAULT_CREATE_POOL_FORM)

  useEffect(() => {
    if (!isOpen) {
      setForm(DEFAULT_CREATE_POOL_FORM)
      return
    }

    if (resource) {
      setForm(buildFormFromPool(resource))
      return
    }

    setForm({
      ...DEFAULT_CREATE_POOL_FORM,
      organizationId: assignableOrganizations[0]?.id ?? '',
    })
  }, [isOpen, resource, assignableOrganizations])

  const totalAddresses = Number.parseInt(form.totalAddresses, 10)
  const isNameValid = isValidKubernetesResourceName(form.name)
  const isDetailsStepValid =
    isNameValid &&
    Boolean(form.cidr.trim()) &&
    Boolean(form.dataCenter.trim()) &&
    Number.isFinite(totalAddresses) &&
    totalAddresses > 0
  const selectedOrganization = assignableOrganizations.find(
    (organization) => organization.id === form.organizationId,
  )
  const isOrganizationStepValid =
    !isProviderCreate ||
    (assignableOrganizations.length > 0 && Boolean(form.organizationId.trim()))
  const canSubmit = isDetailsStepValid && (isEditMode || isOrganizationStepValid)

  const handleClose = () => {
    setForm(DEFAULT_CREATE_POOL_FORM)
    onClose()
  }

  const handleSubmit = () => {
    if (!canSubmit) {
      return
    }

    const scope = resolveNetworkInventoryScope(tenantSlug)
    const pool: ExternalIpPool = isEditMode
      ? {
          ...resource,
          name: form.name.trim(),
          cidr: form.cidr.trim(),
          dataCenter: form.dataCenter.trim(),
          totalAddresses,
        }
      : {
          id: generateExternalIpPoolId(),
          name: form.name.trim(),
          cidr: form.cidr.trim(),
          dataCenter: form.dataCenter.trim(),
          totalAddresses,
          assignedOrganizationId: null,
          assignedOrganizationName: null,
          createdAt: new Date().toISOString(),
        }

    if (isEditMode) {
      scope.updateExternalIpPool(pool)
    } else {
      scope.addExternalIpPool(pool)

      if (isProviderCreate && form.organizationId.trim()) {
        assignExternalIpPoolToRegisteredOrganization(pool.id, form.organizationId.trim())
      }
    }

    onCreated(pool)
    handleClose()
  }

  function renderStepContent(stepId: string) {
    if (stepId === 'pool') {
      return (
        <div className="provider-admin-network-inventory__wizard-step">
          <Content component="p" className="provider-admin-network-inventory__wizard-lede">
            {isEditMode
              ? 'Update routable address capacity and metadata for this external IP pool.'
              : isProviderCreate
                ? 'Define routable addresses for tenant edge exposure. You will assign this pool to a tenant in the next step.'
                : 'External IP pools provide routable addresses for workloads that need public exposure.'}
          </Content>
          <Form autoComplete="off" className="provider-admin-network-inventory__form">
            <FormGroup label="Pool name" fieldId="create-pool-name" isRequired>
              <KubernetesResourceNameField
                id="create-pool-name"
                value={form.name}
                onChange={(value) => setForm((current) => ({ ...current, name: value }))}
                placeholder="e.g. tenant-edge-pool"
                isRequired
                isDisabled={isEditMode}
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

    if (stepId === 'organization') {
      return (
        <div className="provider-admin-network-inventory__wizard-step">
          <Content component="p" className="provider-admin-network-inventory__wizard-lede">
            Assign this pool to a tenant. Tenants can have multiple pools for
            different regions or environments.
          </Content>
          {assignableOrganizations.length === 0 ? (
            <Alert
              variant="warning"
              isInline
              title="No registered tenants"
              className="provider-admin-external-ip-pools__assign-alert"
            >
              <Content component="p">
                Register a tenant before creating and assigning an external IP pool.
              </Content>
            </Alert>
          ) : (
            <Form autoComplete="off" className="provider-admin-network-inventory__form">
              <FormGroup label="Tenant" fieldId="create-pool-organization" isRequired>
                <FormSelect
                  id="create-pool-organization"
                  value={form.organizationId}
                  onChange={(_event, value) =>
                    setForm((current) => ({ ...current, organizationId: value }))
                  }
                  aria-label="Tenant"
                >
                  {assignableOrganizations.map((organization) => (
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
                  {selectedOrganization.name} will receive this address pool for tenant edge
                  exposure.
                </Content>
              ) : null}
            </Form>
          )}
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
        {isProviderCreate && !isEditMode ? (
          <DescriptionListGroup>
            <DescriptionListTerm>Tenant</DescriptionListTerm>
            <DescriptionListDescription>
              {selectedOrganization?.name ?? '—'}
            </DescriptionListDescription>
          </DescriptionListGroup>
        ) : null}
      </DescriptionList>
    )
  }

  function getStepFooter(stepId: string) {
    if (stepId === 'pool') {
      return { isNextDisabled: !isDetailsStepValid }
    }

    if (stepId === 'organization') {
      return { isNextDisabled: !isOrganizationStepValid }
    }

    if (stepId === 'review') {
      return {
        nextButtonText: (
          <span className="provider-admin-network-inventory__wizard-footer-label">
            <GlobeIcon aria-hidden />
            <span>{isEditMode ? 'Save changes' : 'Create pool'}</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
        onNext: handleSubmit,
        isNextDisabled: !canSubmit,
      }
    }

    return undefined
  }

  return (
    <NetworkInventoryCreateWizardShell
      isOpen={isOpen}
      parentLabel={parentLabel}
      title={isEditMode ? 'Edit external IP pool' : 'Create external IP pool'}
      titleId="create-external-ip-pool-wizard-title"
      steps={steps}
      renderStepContent={renderStepContent}
      getStepFooter={getStepFooter}
      onClose={handleClose}
      leaveConfirmPrimaryActionLabel={isEditMode ? 'Discard changes' : 'Leave'}
    />
  )
}
