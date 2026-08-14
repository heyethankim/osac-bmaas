import { useEffect, useState } from 'react'
import {
  Button,
  Content,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  TextInput,
} from '@patternfly/react-core'
import { KubernetesResourceNameField } from '../shared/KubernetesResourceNameHelper'
import {
  generateProviderSecurityGroupId,
  type ProviderSecurityGroup,
  type ProviderVirtualNetwork,
} from '../../providerAdmin/networkInventory'
import { isValidKubernetesResourceName } from '../../shared/kubernetesResourceName'
import { resolveNetworkInventoryScope } from '../../shared/networkInventoryScope'

type CreateSecurityGroupForm = {
  name: string
  detail: string
  virtualNetworkId: string
  inboundRules: string
  outboundRules: string
}

/** Demo prefills so the create flow is ready to submit. */
function buildDemoForm(virtualNetworks: ProviderVirtualNetwork[]): CreateSecurityGroupForm {
  return {
    name: 'allow-demo-workload',
    detail: 'Demo ingress for SSH, HTTPS, and API',
    virtualNetworkId: virtualNetworks[0]?.id ?? '',
    inboundRules: 'SSH (22), HTTPS (443), API (6443)',
    outboundRules: 'Allow all',
  }
}

type CreateSecurityGroupModalProps = {
  isOpen: boolean
  virtualNetworks: ProviderVirtualNetwork[]
  onClose: () => void
  onCreated: (group: ProviderSecurityGroup) => void
  tenantSlug?: string
}

export function CreateSecurityGroupModal({
  isOpen,
  virtualNetworks,
  onClose,
  onCreated,
  tenantSlug,
}: CreateSecurityGroupModalProps) {
  const [form, setForm] = useState<CreateSecurityGroupForm>(() => buildDemoForm(virtualNetworks))

  useEffect(() => {
    if (isOpen) {
      setForm(buildDemoForm(virtualNetworks))
    }
  }, [isOpen, virtualNetworks])

  const isNameValid = isValidKubernetesResourceName(form.name)
  const isCreateDisabled =
    !isNameValid || !form.virtualNetworkId.trim() || virtualNetworks.length === 0

  const handleCreate = () => {
    if (isCreateDisabled) {
      return
    }

    const group: ProviderSecurityGroup = {
      id: generateProviderSecurityGroupId(),
      name: form.name.trim(),
      detail: form.detail.trim(),
      virtualNetworkId: form.virtualNetworkId,
      inboundRules: form.inboundRules.trim() || 'None',
      outboundRules: form.outboundRules.trim() || 'Allow all',
      createdAt: new Date().toISOString(),
      status: 'Ready',
    }

    resolveNetworkInventoryScope(tenantSlug).addSecurityGroup(group)
    onCreated(group)
    onClose()
  }

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="create-security-group-title"
      className="provider-admin-network-inventory__modal"
    >
      <ModalHeader title="Create security group" labelId="create-security-group-title" />
      <ModalBody>
        <Content component="p" className="provider-admin-network-inventory__modal-lede">
          Security groups become available as catalog defaults after creation.
        </Content>
        <Form autoComplete="off" className="provider-admin-network-inventory__form">
          <FormGroup label="Name" fieldId="create-sg-name" isRequired>
            <KubernetesResourceNameField
              id="create-sg-name"
              value={form.name}
              onChange={(value) => setForm((current) => ({ ...current, name: value }))}
              placeholder="e.g. allow-demo-workload"
              isRequired
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
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={handleCreate} isDisabled={isCreateDisabled}>
          Create security group
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}
