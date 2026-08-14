import { useEffect, useState } from 'react'
import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import { NetworkIcon } from '@patternfly/react-icons/dist/esm/icons/network-icon'
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
  formatSubnetDetail,
  generateProviderSubnetId,
  type ProviderSubnet,
  type ProviderVirtualNetwork,
} from '../../providerAdmin/networkInventory'
import { NETWORK_INVENTORY_CREATE_REVIEW_STEP } from '../../networking/networkInventoryCreateWizard'
import { isValidKubernetesResourceName } from '../../shared/kubernetesResourceName'
import { resolveNetworkInventoryScope } from '../../shared/networkInventoryScope'
import { NetworkInventoryCreateWizardShell } from './NetworkInventoryCreateWizardShell'

type CreateSubnetForm = {
  name: string
  detail: string
  cidr: string
  vlan: string
  virtualNetworkId: string
}

function buildDemoForm(virtualNetworks: ProviderVirtualNetwork[]): CreateSubnetForm {
  return {
    name: 'bm-compute-c',
    detail: 'Demo subnet for additional tenant compute capacity',
    cidr: '10.42.2.0/24',
    vlan: '202',
    virtualNetworkId: virtualNetworks[0]?.id ?? '',
  }
}

function buildFormFromSubnet(subnet: ProviderSubnet): CreateSubnetForm {
  return {
    name: subnet.name,
    detail: subnet.detail,
    cidr: subnet.cidr,
    vlan: subnet.vlan,
    virtualNetworkId: subnet.virtualNetworkId,
  }
}

const SUBNET_WIZARD_STEPS = [
  { id: 'subnet', label: 'Subnet' },
  NETWORK_INVENTORY_CREATE_REVIEW_STEP,
] as const

type CreateSubnetWizardProps = {
  isOpen: boolean
  parentLabel?: string
  virtualNetworks: ProviderVirtualNetwork[]
  tenantSlug?: string
  resource?: ProviderSubnet | null
  onClose: () => void
  onCreated: (subnet: ProviderSubnet) => void
}

export function CreateSubnetWizard({
  isOpen,
  parentLabel = 'Subnets',
  virtualNetworks,
  tenantSlug,
  resource = null,
  onClose,
  onCreated,
}: CreateSubnetWizardProps) {
  const isEditMode = resource !== null
  const [form, setForm] = useState<CreateSubnetForm>(() => buildDemoForm(virtualNetworks))

  useEffect(() => {
    if (!isOpen) {
      setForm(buildDemoForm(virtualNetworks))
      return
    }

    setForm(resource ? buildFormFromSubnet(resource) : buildDemoForm(virtualNetworks))
  }, [isOpen, resource, virtualNetworks])

  const isNameValid = isValidKubernetesResourceName(form.name)
  const isDetailsStepValid =
    isNameValid &&
    Boolean(form.cidr.trim()) &&
    Boolean(form.vlan.trim()) &&
    Boolean(form.virtualNetworkId.trim()) &&
    virtualNetworks.length > 0

  const selectedNetwork =
    virtualNetworks.find((network) => network.id === form.virtualNetworkId) ?? null

  const handleClose = () => {
    setForm(buildDemoForm(virtualNetworks))
    onClose()
  }

  const handleSubmit = () => {
    if (!isDetailsStepValid) {
      return
    }

    const cidr = form.cidr.trim()
    const vlan = form.vlan.trim()
    const scope = resolveNetworkInventoryScope(tenantSlug)
    const subnet: ProviderSubnet = isEditMode
      ? {
          ...resource,
          name: form.name.trim(),
          cidr,
          vlan,
          detail: form.detail.trim() || formatSubnetDetail(cidr, vlan),
          virtualNetworkId: form.virtualNetworkId,
        }
      : {
          id: generateProviderSubnetId(),
          name: form.name.trim(),
          cidr,
          vlan,
          detail: form.detail.trim() || formatSubnetDetail(cidr, vlan),
          virtualNetworkId: form.virtualNetworkId,
          createdAt: new Date().toISOString(),
          status: 'Ready',
        }

    if (isEditMode) {
      scope.updateSubnet(subnet)
    } else {
      scope.addSubnet(subnet)
    }

    onCreated(subnet)
    handleClose()
  }

  function renderStepContent(stepId: string) {
    if (stepId === 'subnet') {
      return (
        <div className="provider-admin-network-inventory__wizard-step">
          <Content component="p" className="provider-admin-network-inventory__wizard-lede">
            {isEditMode
              ? 'Update subnet addressing and virtual network scope.'
              : 'Subnets are scoped to a virtual network and appear in launch networking for that network.'}
          </Content>
          <Form autoComplete="off" className="provider-admin-network-inventory__form">
            <FormGroup label="Name" fieldId="create-subnet-name" isRequired>
              <KubernetesResourceNameField
                id="create-subnet-name"
                value={form.name}
                onChange={(value) => setForm((current) => ({ ...current, name: value }))}
                placeholder="e.g. bm-compute-a"
                isRequired
                isDisabled={isEditMode}
              />
            </FormGroup>
            <FormGroup label="Description" fieldId="create-subnet-detail">
              <TextInput
                id="create-subnet-detail"
                value={form.detail}
                onChange={(_event, value) => setForm((current) => ({ ...current, detail: value }))}
              />
            </FormGroup>
            <FormGroup label="Virtual network" fieldId="create-subnet-vnet" isRequired>
              <FormSelect
                id="create-subnet-vnet"
                value={form.virtualNetworkId}
                onChange={(_event, value) =>
                  setForm((current) => ({ ...current, virtualNetworkId: value }))
                }
                aria-label="Virtual network"
                isDisabled={virtualNetworks.length === 0}
              >
                {virtualNetworks.length === 0 ? (
                  <FormSelectOption value="" label="No virtual networks available" />
                ) : (
                  virtualNetworks.map((network) => (
                    <FormSelectOption
                      key={network.id}
                      value={network.id}
                      label={`${network.name} (${network.cidr})`}
                    />
                  ))
                )}
              </FormSelect>
            </FormGroup>
            <FormGroup label="CIDR" fieldId="create-subnet-cidr" isRequired>
              <TextInput
                id="create-subnet-cidr"
                value={form.cidr}
                onChange={(_event, value) => setForm((current) => ({ ...current, cidr: value }))}
              />
            </FormGroup>
            <FormGroup label="VLAN" fieldId="create-subnet-vlan" isRequired>
              <TextInput
                id="create-subnet-vlan"
                value={form.vlan}
                onChange={(_event, value) => setForm((current) => ({ ...current, vlan: value }))}
              />
            </FormGroup>
          </Form>
        </div>
      )
    }

    return (
      <DescriptionList isCompact className="provider-admin-network-inventory__wizard-review">
        <DescriptionListGroup>
          <DescriptionListTerm>Name</DescriptionListTerm>
          <DescriptionListDescription>{form.name.trim() || '—'}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Virtual network</DescriptionListTerm>
          <DescriptionListDescription>
            {selectedNetwork ? `${selectedNetwork.name} (${selectedNetwork.cidr})` : '—'}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>CIDR</DescriptionListTerm>
          <DescriptionListDescription>
            <code>{form.cidr.trim() || '—'}</code>
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>VLAN</DescriptionListTerm>
          <DescriptionListDescription>{form.vlan.trim() || '—'}</DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    )
  }

  function getStepFooter(stepId: string) {
    if (stepId === 'subnet') {
      return { isNextDisabled: !isDetailsStepValid }
    }

    if (stepId === 'review') {
      return {
        nextButtonText: (
          <span className="provider-admin-network-inventory__wizard-footer-label">
            <NetworkIcon aria-hidden />
            <span>{isEditMode ? 'Save changes' : 'Create subnet'}</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
        onNext: handleSubmit,
        isNextDisabled: !isDetailsStepValid,
      }
    }

    return undefined
  }

  return (
    <NetworkInventoryCreateWizardShell
      isOpen={isOpen}
      parentLabel={parentLabel}
      title={isEditMode ? 'Edit subnet' : 'Create subnet'}
      titleId="create-subnet-wizard-title"
      steps={SUBNET_WIZARD_STEPS}
      renderStepContent={renderStepContent}
      getStepFooter={getStepFooter}
      onClose={handleClose}
      leaveConfirmPrimaryActionLabel={isEditMode ? 'Discard changes' : 'Leave'}
    />
  )
}
