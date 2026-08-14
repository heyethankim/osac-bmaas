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
  TextInput,
} from '@patternfly/react-core'
import { KubernetesResourceNameField } from '../shared/KubernetesResourceNameHelper'
import {
  generateProviderVirtualNetworkId,
  type ProviderVirtualNetwork,
} from '../../providerAdmin/networkInventory'
import { NETWORK_INVENTORY_CREATE_REVIEW_STEP } from '../../networking/networkInventoryCreateWizard'
import { isValidKubernetesResourceName } from '../../shared/kubernetesResourceName'
import { resolveNetworkInventoryScope } from '../../shared/networkInventoryScope'
import { NetworkInventoryCreateWizardShell } from './NetworkInventoryCreateWizardShell'

type CreateVirtualNetworkForm = {
  name: string
  detail: string
  cidr: string
  ipv6Cidr: string
}

const DEFAULT_FORM: CreateVirtualNetworkForm = {
  name: 'demo-workload',
  detail: 'Prefilled demo virtual network for tenant workloads',
  cidr: '10.60.0.0/16',
  ipv6Cidr: '2001:db8:60::/48',
}

const VIRTUAL_NETWORK_WIZARD_STEPS = [
  { id: 'virtual-network', label: 'Virtual network' },
  NETWORK_INVENTORY_CREATE_REVIEW_STEP,
] as const

type CreateVirtualNetworkWizardProps = {
  isOpen: boolean
  parentLabel?: string
  tenantSlug?: string
  resource?: ProviderVirtualNetwork | null
  onClose: () => void
  onCreated: (network: ProviderVirtualNetwork) => void
}

function buildFormFromNetwork(network: ProviderVirtualNetwork): CreateVirtualNetworkForm {
  return {
    name: network.name,
    detail: network.detail,
    cidr: network.cidr,
    ipv6Cidr: network.ipv6Cidr ?? '',
  }
}

export function CreateVirtualNetworkWizard({
  isOpen,
  parentLabel = 'Virtual networks',
  tenantSlug,
  resource = null,
  onClose,
  onCreated,
}: CreateVirtualNetworkWizardProps) {
  const isEditMode = resource !== null
  const [form, setForm] = useState<CreateVirtualNetworkForm>(DEFAULT_FORM)

  useEffect(() => {
    if (!isOpen) {
      setForm(DEFAULT_FORM)
      return
    }

    setForm(resource ? buildFormFromNetwork(resource) : DEFAULT_FORM)
  }, [isOpen, resource])

  const isNameValid = isValidKubernetesResourceName(form.name)
  const isDetailsStepValid = isNameValid && Boolean(form.cidr.trim())

  const handleClose = () => {
    setForm(DEFAULT_FORM)
    onClose()
  }

  const handleSubmit = () => {
    if (!isDetailsStepValid) {
      return
    }

    const scope = resolveNetworkInventoryScope(tenantSlug)
    const network: ProviderVirtualNetwork = isEditMode
      ? {
          ...resource,
          name: form.name.trim(),
          detail: form.detail.trim(),
          cidr: form.cidr.trim(),
          ipv6Cidr: form.ipv6Cidr.trim(),
        }
      : {
          id: generateProviderVirtualNetworkId(),
          name: form.name.trim(),
          detail: form.detail.trim(),
          cidr: form.cidr.trim(),
          ipv6Cidr: form.ipv6Cidr.trim(),
          createdAt: new Date().toISOString(),
          status: 'Ready',
        }

    if (isEditMode) {
      scope.updateVirtualNetwork(network)
    } else {
      scope.addVirtualNetwork(network)
    }

    onCreated(network)
    handleClose()
  }

  function renderStepContent(stepId: string) {
    if (stepId === 'virtual-network') {
      return (
        <div className="provider-admin-network-inventory__wizard-step">
          <Content component="p" className="provider-admin-network-inventory__wizard-lede">
            {isEditMode
              ? 'Update address space and metadata for this virtual network.'
              : 'Create a virtual network to make address space available for workloads, subnets, and catalog networking.'}
          </Content>
          <Form autoComplete="off" className="provider-admin-network-inventory__form">
            <FormGroup label="Name" fieldId="create-vnet-name" isRequired>
              <KubernetesResourceNameField
                id="create-vnet-name"
                value={form.name}
                onChange={(value) => setForm((current) => ({ ...current, name: value }))}
                placeholder="e.g. demo-workload"
                isRequired
                isDisabled={isEditMode}
              />
            </FormGroup>
            <FormGroup label="Description" fieldId="create-vnet-detail">
              <TextInput
                id="create-vnet-detail"
                value={form.detail}
                onChange={(_event, value) => setForm((current) => ({ ...current, detail: value }))}
              />
            </FormGroup>
            <FormGroup label="IPv4 CIDR" fieldId="create-vnet-ipv4-cidr" isRequired>
              <TextInput
                id="create-vnet-ipv4-cidr"
                value={form.cidr}
                onChange={(_event, value) => setForm((current) => ({ ...current, cidr: value }))}
              />
            </FormGroup>
            <FormGroup label="IPv6 CIDR" fieldId="create-vnet-ipv6-cidr">
              <TextInput
                id="create-vnet-ipv6-cidr"
                value={form.ipv6Cidr}
                onChange={(_event, value) =>
                  setForm((current) => ({ ...current, ipv6Cidr: value }))
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
          <DescriptionListTerm>Name</DescriptionListTerm>
          <DescriptionListDescription>{form.name.trim() || '—'}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Description</DescriptionListTerm>
          <DescriptionListDescription>{form.detail.trim() || '—'}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>IPv4 CIDR</DescriptionListTerm>
          <DescriptionListDescription>
            <code>{form.cidr.trim() || '—'}</code>
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>IPv6 CIDR</DescriptionListTerm>
          <DescriptionListDescription>
            <code>{form.ipv6Cidr.trim() || '—'}</code>
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    )
  }

  function getStepFooter(stepId: string) {
    if (stepId === 'virtual-network') {
      return { isNextDisabled: !isDetailsStepValid }
    }

    if (stepId === 'review') {
      return {
        nextButtonText: (
          <span className="provider-admin-network-inventory__wizard-footer-label">
            <NetworkIcon aria-hidden />
            <span>{isEditMode ? 'Save changes' : 'Create virtual network'}</span>
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
      title={isEditMode ? 'Edit virtual network' : 'Create virtual network'}
      titleId="create-virtual-network-wizard-title"
      steps={VIRTUAL_NETWORK_WIZARD_STEPS}
      renderStepContent={renderStepContent}
      getStepFooter={getStepFooter}
      onClose={handleClose}
      leaveConfirmPrimaryActionLabel={isEditMode ? 'Discard changes' : 'Leave'}
    />
  )
}
