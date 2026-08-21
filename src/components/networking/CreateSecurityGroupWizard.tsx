import { useEffect, useState } from 'react'
import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import { ShieldAltIcon } from '@patternfly/react-icons/dist/esm/icons/shield-alt-icon'
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
  generateProviderSecurityGroupId,
  type ProviderSecurityGroup,
  type ProviderVirtualNetwork,
} from '../../providerAdmin/networkInventory'
import { NETWORK_INVENTORY_CREATE_REVIEW_STEP } from '../../networking/networkInventoryCreateWizard'
import { isValidKubernetesResourceName } from '../../shared/kubernetesResourceName'
import { resolveNetworkInventoryScope } from '../../shared/networkInventoryScope'
import { NetworkInventoryCreateWizardShell } from './NetworkInventoryCreateWizardShell'

type CreateSecurityGroupForm = {
  name: string
  detail: string
  virtualNetworkId: string
  inboundRules: string
  outboundRules: string
}

function buildDemoForm(virtualNetworks: ProviderVirtualNetwork[]): CreateSecurityGroupForm {
  return {
    name: 'allow-demo-workload',
    detail: 'Demo ingress for SSH, HTTPS, and API',
    virtualNetworkId: virtualNetworks[0]?.id ?? '',
    inboundRules: 'SSH (22), HTTPS (443), API (6443)',
    outboundRules: 'Allow all',
  }
}

function buildFormFromSecurityGroup(group: ProviderSecurityGroup): CreateSecurityGroupForm {
  return {
    name: group.name,
    detail: group.detail,
    virtualNetworkId: group.virtualNetworkId,
    inboundRules: group.inboundRules,
    outboundRules: group.outboundRules,
  }
}

const SECURITY_GROUP_WIZARD_STEPS = [
  { id: 'security-group', label: 'Security group' },
  NETWORK_INVENTORY_CREATE_REVIEW_STEP,
] as const

type CreateSecurityGroupWizardProps = {
  isOpen: boolean
  parentLabel?: string
  virtualNetworks: ProviderVirtualNetwork[]
  tenantSlug?: string
  resource?: ProviderSecurityGroup | null
  onClose: () => void
  onCreated: (group: ProviderSecurityGroup) => void
}

export function CreateSecurityGroupWizard({
  isOpen,
  parentLabel = 'Security groups',
  virtualNetworks,
  tenantSlug,
  resource = null,
  onClose,
  onCreated,
}: CreateSecurityGroupWizardProps) {
  const isEditMode = resource !== null
  const [form, setForm] = useState<CreateSecurityGroupForm>(() => buildDemoForm(virtualNetworks))

  useEffect(() => {
    if (!isOpen) {
      setForm(buildDemoForm(virtualNetworks))
      return
    }

    setForm(resource ? buildFormFromSecurityGroup(resource) : buildDemoForm(virtualNetworks))
  }, [isOpen, resource, virtualNetworks])

  const isNameValid = isValidKubernetesResourceName(form.name)
  const isDetailsStepValid =
    isNameValid && Boolean(form.virtualNetworkId.trim()) && virtualNetworks.length > 0

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

    const scope = resolveNetworkInventoryScope(tenantSlug)
    const group: ProviderSecurityGroup = isEditMode
      ? {
          ...resource,
          name: form.name.trim(),
          detail: form.detail.trim(),
          virtualNetworkId: form.virtualNetworkId,
          inboundRules: form.inboundRules.trim() || 'None',
          outboundRules: form.outboundRules.trim() || 'Allow all',
        }
      : {
          id: generateProviderSecurityGroupId(),
          name: form.name.trim(),
          detail: form.detail.trim(),
          virtualNetworkId: form.virtualNetworkId,
          inboundRules: form.inboundRules.trim() || 'None',
          outboundRules: form.outboundRules.trim() || 'Allow all',
          createdAt: new Date().toISOString(),
          status: 'Ready',
        }

    if (isEditMode) {
      scope.updateSecurityGroup(group)
    } else {
      scope.addSecurityGroup(group)
    }

    onCreated(group)
    handleClose()
  }

  function renderStepContent(stepId: string) {
    if (stepId === 'security-group') {
      return (
        <div className="provider-admin-network-inventory__wizard-step">
          <Content component="p" className="provider-admin-network-inventory__wizard-lede">
            {isEditMode
              ? 'Update security group rules and virtual network scope.'
              : 'Security groups control network access for workloads launched in your tenant.'}
          </Content>
          <Form autoComplete="off" className="provider-admin-network-inventory__form">
            <FormGroup label="Name" fieldId="create-sg-name" isRequired>
              <KubernetesResourceNameField
                id="create-sg-name"
                value={form.name}
                onChange={(value) => setForm((current) => ({ ...current, name: value }))}
                placeholder="e.g. allow-demo-workload"
                isRequired
                isDisabled={isEditMode}
              />
            </FormGroup>
            <FormGroup label="Description" fieldId="create-sg-detail">
              <TextInput
                id="create-sg-detail"
                value={form.detail}
                onChange={(_event, value) => setForm((current) => ({ ...current, detail: value }))}
              />
            </FormGroup>
            <FormGroup label="Virtual network" fieldId="create-sg-vnet" isRequired>
              <FormSelect
                id="create-sg-vnet"
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
            <FormGroup label="Inbound rules" fieldId="create-sg-inbound">
              <TextInput
                id="create-sg-inbound"
                value={form.inboundRules}
                onChange={(_event, value) =>
                  setForm((current) => ({ ...current, inboundRules: value }))
                }
              />
            </FormGroup>
            <FormGroup label="Outbound rules" fieldId="create-sg-outbound">
              <TextInput
                id="create-sg-outbound"
                value={form.outboundRules}
                onChange={(_event, value) =>
                  setForm((current) => ({ ...current, outboundRules: value }))
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
          <DescriptionListTerm>Virtual network</DescriptionListTerm>
          <DescriptionListDescription>
            {selectedNetwork ? `${selectedNetwork.name} (${selectedNetwork.cidr})` : '—'}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Inbound rules</DescriptionListTerm>
          <DescriptionListDescription>{form.inboundRules.trim() || 'None'}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Outbound rules</DescriptionListTerm>
          <DescriptionListDescription>
            {form.outboundRules.trim() || 'Allow all'}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    )
  }

  function getStepFooter(stepId: string) {
    if (stepId === 'security-group') {
      return { isNextDisabled: !isDetailsStepValid }
    }

    if (stepId === 'review') {
      return {
        nextButtonText: (
          <span className="provider-admin-network-inventory__wizard-footer-label">
            <ShieldAltIcon aria-hidden />
            <span>{isEditMode ? 'Save changes' : 'Create security group'}</span>
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
      title={isEditMode ? 'Edit security group' : 'Create security group'}
      titleId="create-security-group-wizard-title"
      steps={SECURITY_GROUP_WIZARD_STEPS}
      renderStepContent={renderStepContent}
      getStepFooter={getStepFooter}
      onClose={handleClose}
      leaveConfirmPrimaryActionLabel={isEditMode ? 'Discard changes' : 'Leave'}
    />
  )
}
