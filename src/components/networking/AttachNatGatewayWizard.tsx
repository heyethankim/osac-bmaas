import { useEffect, useState } from 'react'
import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import { RouteIcon } from '@patternfly/react-icons/dist/esm/icons/route-icon'
import {
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
} from '@patternfly/react-core'
import { NETWORK_INVENTORY_CREATE_REVIEW_STEP } from '../../networking/networkInventoryCreateWizard'
import {
  findNatGatewayProfileForGateway,
  hasVirtualNetworkNatGateway,
  NAT_GATEWAY_PROFILES,
  type NatGatewayProfile,
  type ProviderVirtualNetwork,
} from '../../providerAdmin/networkInventory'
import {
  NetworkInventoryCreateWizardShell,
  type NetworkInventoryCreateBreadcrumbAncestor,
} from './NetworkInventoryCreateWizardShell'

type NatGatewayWizardMode = 'attach' | 'edit'

const NAT_GATEWAY_WIZARD_STEPS = [
  { id: 'nat-gateway', label: 'NAT gateway' },
  NETWORK_INVENTORY_CREATE_REVIEW_STEP,
] as const

type AttachNatGatewayWizardProps = {
  isOpen: boolean
  presentation?: 'modal' | 'page'
  network: ProviderVirtualNetwork
  mode?: NatGatewayWizardMode
  parentLabel?: string
  ancestors?: readonly NetworkInventoryCreateBreadcrumbAncestor[]
  onClose: () => void
  onAttach: (network: ProviderVirtualNetwork, profile: NatGatewayProfile) => void
}

export function AttachNatGatewayWizard({
  isOpen,
  presentation = 'page',
  network,
  mode = 'attach',
  parentLabel = 'Virtual networks',
  ancestors,
  onClose,
  onAttach,
}: AttachNatGatewayWizardProps) {
  const isEditMode = mode === 'edit'
  const [selectedProfileId, setSelectedProfileId] = useState(NAT_GATEWAY_PROFILES[0]?.id ?? '')

  useEffect(() => {
    if (!isOpen) {
      setSelectedProfileId(NAT_GATEWAY_PROFILES[0]?.id ?? '')
      return
    }

    if (isEditMode && hasVirtualNetworkNatGateway(network)) {
      const matchingProfile = findNatGatewayProfileForGateway(network.natGateway)
      setSelectedProfileId(matchingProfile?.id ?? NAT_GATEWAY_PROFILES[0]?.id ?? '')
      return
    }

    setSelectedProfileId(NAT_GATEWAY_PROFILES[0]?.id ?? '')
  }, [isOpen, isEditMode, network.id, network.natGateway?.id])

  const selectedProfile =
    NAT_GATEWAY_PROFILES.find((profile) => profile.id === selectedProfileId) ??
    NAT_GATEWAY_PROFILES[0] ??
    null

  const isDetailsStepValid = selectedProfile !== null

  const handleClose = () => {
    setSelectedProfileId(NAT_GATEWAY_PROFILES[0]?.id ?? '')
    onClose()
  }

  const handleSubmit = () => {
    if (!selectedProfile) {
      return
    }

    onAttach(network, selectedProfile)
    handleClose()
  }

  function renderStepContent(stepId: string) {
    if (stepId === 'nat-gateway') {
      return (
        <div className="provider-admin-network-inventory__wizard-step">
          <Content component="p" className="provider-admin-network-inventory__wizard-lede">
            {isEditMode
              ? 'Select a different NAT gateway profile for outbound internet access.'
              : 'Provides outbound internet access for workloads in this virtual network.'}
          </Content>
          <Form autoComplete="off" className="provider-admin-network-inventory__form">
            <FormGroup label="Virtual network" fieldId="attach-nat-gateway-network">
              {network.name}
            </FormGroup>
            <FormGroup label="IPv4 CIDR" fieldId="attach-nat-gateway-cidr">
              <code>{network.cidr}</code>
            </FormGroup>
            <FormGroup label="NAT gateway" fieldId="attach-nat-gateway-profile" isRequired>
              <FormSelect
                id="attach-nat-gateway-profile"
                value={selectedProfileId}
                onChange={(_event, value) => setSelectedProfileId(value)}
                aria-label="NAT gateway profile"
              >
                {NAT_GATEWAY_PROFILES.map((profile) => (
                  <FormSelectOption
                    key={profile.id}
                    value={profile.id}
                    label={`${profile.name} · ${profile.publicIp}`}
                  />
                ))}
              </FormSelect>
              {selectedProfile ? (
                <FormHelperText>{selectedProfile.description}</FormHelperText>
              ) : null}
            </FormGroup>
          </Form>
        </div>
      )
    }

    return (
      <DescriptionList isCompact className="provider-admin-network-inventory__wizard-review">
        <DescriptionListGroup>
          <DescriptionListTerm>Virtual network</DescriptionListTerm>
          <DescriptionListDescription>{network.name}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>IPv4 CIDR</DescriptionListTerm>
          <DescriptionListDescription>
            <code>{network.cidr}</code>
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>NAT gateway</DescriptionListTerm>
          <DescriptionListDescription>
            {selectedProfile
              ? `${selectedProfile.name} · ${selectedProfile.publicIp}`
              : '—'}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Description</DescriptionListTerm>
          <DescriptionListDescription>
            {selectedProfile?.description ?? '—'}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    )
  }

  function getStepFooter(stepId: string) {
    if (stepId === 'nat-gateway') {
      return { isNextDisabled: !isDetailsStepValid }
    }

    if (stepId === 'review') {
      return {
        nextButtonText: (
          <span className="provider-admin-network-inventory__wizard-footer-label">
            <RouteIcon aria-hidden />
            <span>{isEditMode ? 'Save changes' : 'Attach NAT gateway'}</span>
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
      presentation={presentation}
      ancestors={ancestors}
      parentLabel={parentLabel}
      title={isEditMode ? 'Change NAT gateway' : 'Attach NAT gateway'}
      titleId="attach-nat-gateway-wizard-title"
      steps={NAT_GATEWAY_WIZARD_STEPS}
      renderStepContent={renderStepContent}
      getStepFooter={getStepFooter}
      onClose={handleClose}
      leaveConfirmPrimaryActionLabel={isEditMode ? 'Discard changes' : 'Leave'}
    />
  )
}
