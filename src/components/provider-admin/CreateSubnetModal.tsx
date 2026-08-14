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
  formatSubnetDetail,
  generateProviderSubnetId,
  type ProviderSubnet,
  type ProviderVirtualNetwork,
} from '../../providerAdmin/networkInventory'
import { isValidKubernetesResourceName } from '../../shared/kubernetesResourceName'
import { resolveNetworkInventoryScope } from '../../shared/networkInventoryScope'

type CreateSubnetForm = {
  name: string
  detail: string
  cidr: string
  vlan: string
  virtualNetworkId: string
}

/** Demo prefills so the create flow is ready to submit. */
function buildDemoForm(virtualNetworks: ProviderVirtualNetwork[]): CreateSubnetForm {
  return {
    name: 'bm-compute-c',
    detail: 'Demo subnet for additional tenant compute capacity',
    cidr: '10.42.2.0/24',
    vlan: '202',
    virtualNetworkId: virtualNetworks[0]?.id ?? '',
  }
}

type CreateSubnetModalProps = {
  isOpen: boolean
  virtualNetworks: ProviderVirtualNetwork[]
  onClose: () => void
  onCreated: (subnet: ProviderSubnet) => void
  tenantSlug?: string
}

export function CreateSubnetModal({
  isOpen,
  virtualNetworks,
  onClose,
  onCreated,
  tenantSlug,
}: CreateSubnetModalProps) {
  const [form, setForm] = useState<CreateSubnetForm>(() => buildDemoForm(virtualNetworks))

  useEffect(() => {
    if (isOpen) {
      setForm(buildDemoForm(virtualNetworks))
    }
  }, [isOpen, virtualNetworks])

  const isNameValid = isValidKubernetesResourceName(form.name)
  const isCreateDisabled =
    !isNameValid ||
    !form.cidr.trim() ||
    !form.vlan.trim() ||
    !form.virtualNetworkId.trim() ||
    virtualNetworks.length === 0

  const handleCreate = () => {
    if (isCreateDisabled) {
      return
    }

    const cidr = form.cidr.trim()
    const vlan = form.vlan.trim()
    const subnet: ProviderSubnet = {
      id: generateProviderSubnetId(),
      name: form.name.trim(),
      cidr,
      vlan,
      detail: form.detail.trim() || formatSubnetDetail(cidr, vlan),
      virtualNetworkId: form.virtualNetworkId,
      createdAt: new Date().toISOString(),
      status: 'Ready',
    }

    resolveNetworkInventoryScope(tenantSlug).addSubnet(subnet)
    onCreated(subnet)
    onClose()
  }

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="create-subnet-title"
      className="provider-admin-network-inventory__modal"
    >
      <ModalHeader title="Create subnet" labelId="create-subnet-title" />
      <ModalBody>
        <Content component="p" className="provider-admin-network-inventory__modal-lede">
          Subnets are scoped to a virtual network and appear in catalog defaults for that
          network.
        </Content>
        <Form autoComplete="off" className="provider-admin-network-inventory__form">
          <FormGroup label="Name" fieldId="create-subnet-name" isRequired>
            <KubernetesResourceNameField
              id="create-subnet-name"
              value={form.name}
              onChange={(value) => setForm((current) => ({ ...current, name: value }))}
              placeholder="e.g. bm-compute-a"
              isRequired
            />
          </FormGroup>
          <FormGroup label="Description" fieldId="create-subnet-detail">
            <TextInput
              id="create-subnet-detail"
              value={form.detail}
              onChange={(_event, value) => setForm((current) => ({ ...current, detail: value }))}
              placeholder="Optional description"
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
              placeholder="10.42.0.0/24"
            />
          </FormGroup>
          <FormGroup label="VLAN" fieldId="create-subnet-vlan" isRequired>
            <TextInput
              id="create-subnet-vlan"
              value={form.vlan}
              onChange={(_event, value) => setForm((current) => ({ ...current, vlan: value }))}
              placeholder="200"
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={handleCreate} isDisabled={isCreateDisabled}>
          Create subnet
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}
