import { useEffect, useMemo, useState } from 'react'
import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import { GlobeIcon } from '@patternfly/react-icons/dist/esm/icons/globe-icon'
import { RhUiConnectedIcon } from '@patternfly/react-icons/dist/esm/icons/rh-ui-connected-icon'
import { MinusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/minus-circle-icon'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
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
  Label,
  TextArea,
  TextInput,
  Title,
} from '@patternfly/react-core'
import { KubernetesResourceNameField } from '../shared/KubernetesResourceNameHelper'
import { TENANT_EXTERNAL_IPS_PAGE_LABEL } from '../../tenantAdmin/constants'
import {
  EXTERNAL_IP_POOL_DATA_CENTERS,
  generateExternalIpPoolId,
  getDefaultExternalIpPoolCidr,
  getDefaultExternalIpPoolCidrs,
  getExternalIpPoolCidrs,
  suggestNextExternalIpPoolCidr,
  DEFAULT_PROVIDER_EXTERNAL_IP_POOL_DESCRIPTION,
  DEFAULT_PROVIDER_EXTERNAL_IP_POOL_NAME,
  type ExternalIpPool,
  type ExternalIpPoolIpFamily,
} from '../../providerAdmin/externalIpPools'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import { NETWORK_INVENTORY_CREATE_REVIEW_STEP } from '../../networking/networkInventoryCreateWizard'
import {
  buildExternalIpPoolEditSnapshot,
  buildExternalIpPoolEditSnapshotFromPool,
  buildProviderExternalIpPoolEditSnapshot,
  buildProviderExternalIpPoolEditSnapshotFromPool,
  getExternalIpPoolEditChanges,
  getNetworkInventoryEditModifiedStepIds,
  getProviderExternalIpPoolEditChanges,
  type NetworkInventoryEditStepId,
} from '../../networking/networkInventoryEditDiff'
import { NetworkInventoryEditReviewPanel } from '../../networking/NetworkInventoryEditReviewPanel'
import { isValidKubernetesResourceName } from '../../shared/kubernetesResourceName'
import { resolveNetworkInventoryScope } from '../../shared/networkInventoryScope'
import { assignExternalIpPoolToRegisteredOrganization } from '../../providerSetup/storage'
import { NetworkInventoryCreateWizardShell } from './NetworkInventoryCreateWizardShell'

type TenantPoolForm = {
  name: string
  cidr: string
  dataCenter: string
  totalAddresses: string
  organizationId: string
}

type ProviderPoolForm = {
  name: string
  description: string
  ipFamily: ExternalIpPoolIpFamily
  cidrs: string[]
  organizationId: string
}

const DEFAULT_TENANT_POOL_FORM: TenantPoolForm = {
  name: 'tenant-edge-pool',
  cidr: '203.0.113.0/26',
  dataCenter: EXTERNAL_IP_POOL_DATA_CENTERS[0],
  totalAddresses: '62',
  organizationId: '',
}

const DEFAULT_PROVIDER_POOL_FORM: ProviderPoolForm = {
  name: DEFAULT_PROVIDER_EXTERNAL_IP_POOL_NAME,
  description: DEFAULT_PROVIDER_EXTERNAL_IP_POOL_DESCRIPTION,
  ipFamily: 'IPv4',
  cidrs: getDefaultExternalIpPoolCidrs('IPv4'),
  organizationId: '',
}

const PROVIDER_IP_FAMILY_OPTIONS: {
  id: ExternalIpPoolIpFamily
  label: string
  description: string
  example: string
}[] = [
  {
    id: 'IPv4',
    label: 'IPv4',
    description: 'Default. Use for standard internet-facing tenant services.',
    example: '203.0.113.0/26',
  },
  {
    id: 'IPv6',
    label: 'IPv6',
    description: 'Use only when your edge network and tenants support IPv6.',
    example: '2001:db8::/32',
  },
]

const PROVIDER_CREATE_EXTERNAL_IP_POOL_STEPS = [
  { id: 'details', label: 'General' },
  { id: 'addressing', label: 'Addressing' },
  NETWORK_INVENTORY_CREATE_REVIEW_STEP,
] as const

const PROVIDER_EDIT_EXTERNAL_IP_POOL_STEPS = [
  { id: 'addressing', label: 'Addressing' },
  NETWORK_INVENTORY_CREATE_REVIEW_STEP,
] as const

const TENANT_CREATE_EXTERNAL_IP_POOL_STEPS = [
  { id: 'pool', label: 'External IP pool' },
  NETWORK_INVENTORY_CREATE_REVIEW_STEP,
] as const

type CreateExternalIpPoolWizardProps = {
  isOpen: boolean
  presentation?: 'modal' | 'page'
  parentLabel?: string
  tenantSlug?: string
  organizations?: RegisteredOrganization[]
  resource?: ExternalIpPool | null
  onClose: () => void
  onCreated: (pool: ExternalIpPool) => void
}

function buildTenantFormFromPool(pool: ExternalIpPool): TenantPoolForm {
  return {
    name: pool.name,
    cidr: pool.cidr,
    dataCenter: pool.dataCenter,
    totalAddresses: String(pool.totalAddresses),
    organizationId: pool.assignedOrganizationId ?? '',
  }
}

function buildProviderFormFromPool(pool: ExternalIpPool): ProviderPoolForm {
  const cidrs = getExternalIpPoolCidrs(pool)

  return {
    name: pool.name,
    description: pool.description ?? '',
    ipFamily: pool.ipFamily ?? 'IPv4',
    cidrs: cidrs.length > 0 ? cidrs : getDefaultExternalIpPoolCidrs(pool.ipFamily ?? 'IPv4'),
    organizationId: pool.assignedOrganizationId ?? '',
  }
}

function normalizeProviderCidrs(cidrs: readonly string[]): string[] {
  return cidrs.map((cidr) => cidr.trim()).filter(Boolean)
}

export function CreateExternalIpPoolWizard({
  isOpen,
  presentation = 'page',
  parentLabel = TENANT_EXTERNAL_IPS_PAGE_LABEL,
  tenantSlug,
  organizations = [],
  resource = null,
  onClose,
  onCreated,
}: CreateExternalIpPoolWizardProps) {
  const isEditMode = resource !== null
  const isProviderFlow = !tenantSlug
  const isProviderCreate = isProviderFlow && !isEditMode
  const steps = isProviderCreate
    ? PROVIDER_CREATE_EXTERNAL_IP_POOL_STEPS
    : isProviderFlow && isEditMode
      ? PROVIDER_EDIT_EXTERNAL_IP_POOL_STEPS
      : TENANT_CREATE_EXTERNAL_IP_POOL_STEPS
  const assignableOrganizations = useMemo(
    () =>
      [...organizations].sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
      ),
    [organizations],
  )
  const [tenantForm, setTenantForm] = useState<TenantPoolForm>(DEFAULT_TENANT_POOL_FORM)
  const [providerForm, setProviderForm] = useState<ProviderPoolForm>(DEFAULT_PROVIDER_POOL_FORM)

  useEffect(() => {
    if (!isOpen) {
      setTenantForm(DEFAULT_TENANT_POOL_FORM)
      setProviderForm(DEFAULT_PROVIDER_POOL_FORM)
      return
    }

    if (resource) {
      if (isProviderFlow) {
        setProviderForm(buildProviderFormFromPool(resource))
      } else {
        setTenantForm(buildTenantFormFromPool(resource))
      }
      return
    }

    if (isProviderFlow) {
      setProviderForm({
        ...DEFAULT_PROVIDER_POOL_FORM,
        organizationId: assignableOrganizations[0]?.id ?? '',
      })
      return
    }

    setTenantForm({
      ...DEFAULT_TENANT_POOL_FORM,
      organizationId: assignableOrganizations[0]?.id ?? '',
    })
  }, [assignableOrganizations, isOpen, isProviderFlow, resource])

  const totalAddresses = Number.parseInt(tenantForm.totalAddresses, 10)
  const normalizedProviderCidrs = normalizeProviderCidrs(providerForm.cidrs)
  const isNameValid = isValidKubernetesResourceName(
    isProviderFlow ? providerForm.name : tenantForm.name,
  )
  const isTenantPoolStepValid =
    isNameValid &&
    Boolean(tenantForm.cidr.trim()) &&
    Boolean(tenantForm.dataCenter.trim()) &&
    Number.isFinite(totalAddresses) &&
    totalAddresses > 0
  const isProviderGeneralStepValid =
    isNameValid &&
    (!isProviderCreate ||
      (assignableOrganizations.length > 0 && Boolean(providerForm.organizationId.trim())))
  const isProviderAddressingStepValid = normalizedProviderCidrs.length > 0
  const canSubmit = isProviderFlow
    ? isProviderCreate
      ? isProviderGeneralStepValid && isProviderAddressingStepValid
      : isProviderAddressingStepValid
    : isTenantPoolStepValid

  const selectedOrganization = assignableOrganizations.find(
    (organization) =>
      organization.id === (isProviderFlow ? providerForm.organizationId : tenantForm.organizationId),
  )

  const editChanges = useMemo(() => {
    if (!isEditMode || !resource) {
      return []
    }

    if (isProviderFlow) {
      return getProviderExternalIpPoolEditChanges(
        buildProviderExternalIpPoolEditSnapshotFromPool(resource),
        buildProviderExternalIpPoolEditSnapshot({
          description: providerForm.description,
          ipFamily: providerForm.ipFamily,
          cidrs: providerForm.cidrs,
        }),
      )
    }

    return getExternalIpPoolEditChanges(
      buildExternalIpPoolEditSnapshotFromPool(resource),
      buildExternalIpPoolEditSnapshot({
        cidr: tenantForm.cidr,
        dataCenter: tenantForm.dataCenter,
        totalAddresses: tenantForm.totalAddresses,
      }),
    )
  }, [
    isEditMode,
    isProviderFlow,
    providerForm.cidrs,
    providerForm.description,
    providerForm.ipFamily,
    resource,
    tenantForm.cidr,
    tenantForm.dataCenter,
    tenantForm.totalAddresses,
  ])

  const modifiedStepIds = useMemo(
    () => getNetworkInventoryEditModifiedStepIds(editChanges),
    [editChanges],
  )

  const canSaveEdit = !isEditMode || editChanges.length > 0

  const handleClose = () => {
    setTenantForm(DEFAULT_TENANT_POOL_FORM)
    setProviderForm(DEFAULT_PROVIDER_POOL_FORM)
    onClose()
  }

  const handleSubmit = () => {
    if (!canSubmit) {
      return
    }

    const scope = resolveNetworkInventoryScope(tenantSlug)
    const pool: ExternalIpPool = isProviderFlow
      ? isEditMode
        ? {
            ...resource!,
            name: providerForm.name.trim(),
            description: providerForm.description.trim() || undefined,
            ipFamily: providerForm.ipFamily,
            cidrs: normalizedProviderCidrs,
            cidr: normalizedProviderCidrs[0] ?? '',
          }
        : {
            id: generateExternalIpPoolId(),
            name: providerForm.name.trim(),
            description: providerForm.description.trim() || undefined,
            ipFamily: providerForm.ipFamily,
            cidrs: normalizedProviderCidrs,
            cidr: normalizedProviderCidrs[0] ?? '',
            dataCenter: '',
            totalAddresses: 0,
            assignedOrganizationId: null,
            assignedOrganizationName: null,
            createdAt: new Date().toISOString(),
          }
      : isEditMode
        ? {
            ...resource!,
            name: tenantForm.name.trim(),
            cidr: tenantForm.cidr.trim(),
            dataCenter: tenantForm.dataCenter.trim(),
            totalAddresses,
          }
        : {
            id: generateExternalIpPoolId(),
            name: tenantForm.name.trim(),
            cidr: tenantForm.cidr.trim(),
            dataCenter: tenantForm.dataCenter.trim(),
            totalAddresses,
            assignedOrganizationId: null,
            assignedOrganizationName: null,
            createdAt: new Date().toISOString(),
          }

    if (isEditMode) {
      scope.updateExternalIpPool(pool)
    } else {
      scope.addExternalIpPool(pool)

      if (isProviderCreate && providerForm.organizationId.trim()) {
        assignExternalIpPoolToRegisteredOrganization(pool.id, providerForm.organizationId.trim())
      }
    }

    onCreated(pool)
    handleClose()
  }

  const updateProviderCidr = (index: number, value: string) => {
    setProviderForm((current) => ({
      ...current,
      cidrs: current.cidrs.map((cidr, currentIndex) =>
        currentIndex === index ? value : cidr,
      ),
    }))
  }

  const addProviderCidr = () => {
    setProviderForm((current) => ({
      ...current,
      cidrs: [
        ...current.cidrs,
        suggestNextExternalIpPoolCidr(current.ipFamily, current.cidrs),
      ],
    }))
  }

  const removeProviderCidr = (index: number) => {
    setProviderForm((current) => ({
      ...current,
      cidrs:
        current.cidrs.length > 1
          ? current.cidrs.filter((_, currentIndex) => currentIndex !== index)
          : current.cidrs,
    }))
  }

  const handleProviderIpFamilyChange = (ipFamily: ExternalIpPoolIpFamily) => {
    setProviderForm((current) => {
      if (current.ipFamily === ipFamily) {
        return current
      }

      return {
        ...current,
        ipFamily,
        cidrs: getDefaultExternalIpPoolCidrs(ipFamily),
      }
    })
  }

  function renderProviderDetailsStep() {
    return (
      <div className="provider-admin-network-inventory__wizard-step">
        <Content component="p" className="provider-admin-network-inventory__wizard-lede">
          Name the pool, add an optional description, and assign it to a tenant.
        </Content>
        <Form autoComplete="off" className="provider-admin-network-inventory__form">
          <FormGroup label="Pool name" fieldId="create-pool-name" isRequired>
            <KubernetesResourceNameField
              id="create-pool-name"
              value={providerForm.name}
              onChange={(value) => setProviderForm((current) => ({ ...current, name: value }))}
              placeholder="e.g. tenant-edge-pool"
              isRequired
            />
          </FormGroup>
          <FormGroup label="Description" fieldId="create-pool-description">
            <TextArea
              id="create-pool-description"
              value={providerForm.description}
              onChange={(_event, value) =>
                setProviderForm((current) => ({ ...current, description: value }))
              }
              placeholder="Describe how this pool will be used"
              resizeOrientation="vertical"
            />
          </FormGroup>
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
            <FormGroup label="Tenant" fieldId="create-pool-organization" isRequired>
              <div
                id="create-pool-organization"
                className="provider-setup-template__card-group provider-admin-network-inventory__tenant-cards"
                role="radiogroup"
                aria-label="Tenant"
              >
                {assignableOrganizations.map((organization) => {
                  const isSelected = providerForm.organizationId === organization.id
                  const titleId = `create-pool-tenant-${organization.id}-name`

                  return (
                    <button
                      key={organization.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-labelledby={titleId}
                      className={`provider-setup-template__select-card provider-admin-network-inventory__tenant-card${
                        isSelected ? ' provider-setup-template__select-card--selected' : ''
                      }`}
                      onClick={() =>
                        setProviderForm((current) => ({
                          ...current,
                          organizationId: organization.id,
                        }))
                      }
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
                        {organization.name}
                      </Title>
                      <Content
                        component="p"
                        className="provider-setup-template__select-card-meta"
                      >
                        {organization.primaryDomain || '—'}
                      </Content>
                    </button>
                  )
                })}
              </div>
            </FormGroup>
          )}
        </Form>
      </div>
    )
  }

  function renderProviderAddressingStep() {
    return (
      <div className="provider-admin-network-inventory__wizard-step">
        <Content component="p" className="provider-admin-network-inventory__wizard-lede">
          {isEditMode
            ? 'Update the pool description, IP family, and CIDR ranges.'
            : 'Choose the IP family and CIDR ranges for tenant edge exposure.'}
        </Content>
        <Form autoComplete="off" className="provider-admin-network-inventory__form">
          {isEditMode ? (
            <FormGroup label="Description" fieldId="create-pool-description">
              <TextArea
                id="create-pool-description"
                value={providerForm.description}
                onChange={(_event, value) =>
                  setProviderForm((current) => ({ ...current, description: value }))
                }
                placeholder="Describe how this pool will be used"
                resizeOrientation="vertical"
              />
            </FormGroup>
          ) : null}
          <FormGroup label="IP family" fieldId="create-pool-ip-family" isRequired>
            <div
              id="create-pool-ip-family"
              className="provider-setup-template__card-group provider-admin-network-inventory__ip-family-cards"
              role="radiogroup"
              aria-label="IP family"
            >
              {PROVIDER_IP_FAMILY_OPTIONS.map((option) => {
                const isSelected = providerForm.ipFamily === option.id
                const titleId = `create-pool-ip-family-${option.id}-title`

                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-labelledby={titleId}
                    className={`provider-setup-template__select-card provider-admin-network-inventory__ip-family-card${
                      isSelected ? ' provider-setup-template__select-card--selected' : ''
                    }`}
                    onClick={() => handleProviderIpFamilyChange(option.id)}
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
                      {option.label}
                    </Title>
                    <Content
                      component="p"
                      className="provider-setup-template__select-card-detail"
                    >
                      {option.description}
                    </Content>
                    <Content
                      component="p"
                      className="provider-admin-network-inventory__ip-family-card-example"
                    >
                      <code>{option.example}</code>
                    </Content>
                  </button>
                )
              })}
            </div>
          </FormGroup>
          <FormGroup
            label="CIDR"
            fieldId="create-pool-cidr-0"
            isRequired
          >
            {providerForm.cidrs.map((cidr, index) => {
              const fieldId = `create-pool-cidr-${index}`

              return (
                <div key={fieldId} className="provider-admin-network-inventory__cidr-row">
                  <TextInput
                    id={fieldId}
                    value={cidr}
                    placeholder={getDefaultExternalIpPoolCidr(providerForm.ipFamily)}
                    onChange={(_event, value) => updateProviderCidr(index, value)}
                  />
                  {providerForm.cidrs.length > 1 ? (
                    <Button
                      variant="plain"
                      aria-label={`Remove CIDR ${index + 1}`}
                      icon={<MinusCircleIcon aria-hidden />}
                      onClick={() => removeProviderCidr(index)}
                    />
                  ) : null}
                </div>
              )
            })}
            <Button
              variant="link"
              isInline
              icon={<PlusIcon aria-hidden />}
              className="provider-admin-network-inventory__add-cidr"
              onClick={addProviderCidr}
            >
              Add CIDR
            </Button>
          </FormGroup>
        </Form>
      </div>
    )
  }

  function renderTenantPoolStep() {
    return (
      <div className="provider-admin-network-inventory__wizard-step">
        <Content component="p" className="provider-admin-network-inventory__wizard-lede">
          {isEditMode
            ? 'Update routable address capacity and metadata for this external IP pool.'
            : 'External IP pools provide routable addresses for workloads that need public exposure.'}
        </Content>
        <Form autoComplete="off" className="provider-admin-network-inventory__form">
          <FormGroup label="Pool name" fieldId="create-pool-name" isRequired>
            <KubernetesResourceNameField
              id="create-pool-name"
              value={tenantForm.name}
              onChange={(value) => setTenantForm((current) => ({ ...current, name: value }))}
              placeholder="e.g. tenant-edge-pool"
              isRequired
              isDisabled={isEditMode}
            />
          </FormGroup>
          <FormGroup label="CIDR" fieldId="create-pool-cidr" isRequired>
            <TextInput
              id="create-pool-cidr"
              value={tenantForm.cidr}
              onChange={(_event, value) => setTenantForm((current) => ({ ...current, cidr: value }))}
            />
          </FormGroup>
          <FormGroup label="Data center" fieldId="create-pool-data-center" isRequired>
            <FormSelect
              id="create-pool-data-center"
              value={tenantForm.dataCenter}
              onChange={(_event, value) =>
                setTenantForm((current) => ({ ...current, dataCenter: value }))
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
              value={tenantForm.totalAddresses}
              onChange={(_event, value) =>
                setTenantForm((current) => ({ ...current, totalAddresses: value }))
              }
            />
          </FormGroup>
        </Form>
      </div>
    )
  }

  function renderStepContent(stepId: string) {
    if (stepId === 'details') {
      return renderProviderDetailsStep()
    }

    if (stepId === 'addressing') {
      return renderProviderAddressingStep()
    }

    if (stepId === 'pool') {
      return renderTenantPoolStep()
    }

    return (
      <NetworkInventoryEditReviewPanel
        isEditMode={isEditMode}
        editChanges={editChanges}
        createReview={
          isProviderFlow ? (
            <DescriptionList isCompact className="provider-admin-network-inventory__wizard-review">
              <DescriptionListGroup>
                <DescriptionListTerm>Pool name</DescriptionListTerm>
                <DescriptionListDescription>
                  {providerForm.name.trim() || '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Description</DescriptionListTerm>
                <DescriptionListDescription>
                  {providerForm.description.trim() || '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              {isProviderCreate ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>Tenant</DescriptionListTerm>
                  <DescriptionListDescription>
                    {selectedOrganization?.name ?? '—'}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ) : null}
              <DescriptionListGroup>
                <DescriptionListTerm>IP family</DescriptionListTerm>
                <DescriptionListDescription>{providerForm.ipFamily}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>CIDR</DescriptionListTerm>
                <DescriptionListDescription>
                  {normalizedProviderCidrs.length > 0
                    ? normalizedProviderCidrs.map((cidr, index) => (
                        <span key={`${cidr}-${index}`}>
                          {index > 0 ? ', ' : null}
                          <code>{cidr}</code>
                        </span>
                      ))
                    : '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          ) : (
            <DescriptionList isCompact className="provider-admin-network-inventory__wizard-review">
              <DescriptionListGroup>
                <DescriptionListTerm>Pool name</DescriptionListTerm>
                <DescriptionListDescription>{tenantForm.name.trim() || '—'}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>CIDR</DescriptionListTerm>
                <DescriptionListDescription>
                  <code>{tenantForm.cidr.trim() || '—'}</code>
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Data center</DescriptionListTerm>
                <DescriptionListDescription>
                  {tenantForm.dataCenter.trim() || '—'}
                </DescriptionListDescription>
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
      />
    )
  }

  function getStepFooter(stepId: string) {
    if (stepId === 'details') {
      return { isNextDisabled: !isProviderGeneralStepValid }
    }

    if (stepId === 'addressing') {
      return { isNextDisabled: !isProviderAddressingStepValid }
    }

    if (stepId === 'pool') {
      return { isNextDisabled: !isTenantPoolStepValid }
    }

    if (stepId === 'review') {
      return {
        nextButtonText: (
          <span className="provider-admin-network-inventory__wizard-footer-label">
            {isProviderFlow ? <RhUiConnectedIcon aria-hidden /> : <GlobeIcon aria-hidden />}
            <span>{isEditMode ? 'Save changes' : 'Create external IP pool'}</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
        onNext: handleSubmit,
        isNextDisabled: !canSubmit || !canSaveEdit,
      }
    }

    return undefined
  }

  return (
    <NetworkInventoryCreateWizardShell
      isOpen={isOpen}
      presentation={presentation}
      parentLabel={parentLabel}
      title={isEditMode ? 'Edit external IP pool' : 'Create external IP pool'}
      titleId="create-external-ip-pool-wizard-title"
      steps={steps}
      renderStepContent={renderStepContent}
      getStepFooter={getStepFooter}
      onClose={handleClose}
      leaveConfirmPrimaryActionLabel={isEditMode ? 'Discard changes' : 'Leave'}
      getStepName={(step) =>
        isEditMode && modifiedStepIds.has(step.id as NetworkInventoryEditStepId)
          ? `${step.label} (modified)`
          : step.label
      }
    />
  )
}
