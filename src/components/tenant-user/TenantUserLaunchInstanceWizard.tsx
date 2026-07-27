import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeftIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-left-icon'
import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import { CheckIcon } from '@patternfly/react-icons/dist/esm/icons/check-icon'
import { InfoCircleIcon } from '@patternfly/react-icons/dist/esm/icons/info-circle-icon'
import { LockIcon } from '@patternfly/react-icons/dist/esm/icons/lock-icon'
import {
  Alert,
  Card,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  Modal,
  ModalVariant,
  Spinner,
  TextArea,
  TextInput,
  Wizard,
  WizardHeader,
  WizardStep,
} from '@patternfly/react-core'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import type { TenantUserCatalogCard } from '../../tenantUser/catalog'
import {
  createLaunchInstanceWizardForm,
  getLaunchInstanceWizardSteps,
  getNextLaunchInstanceName,
  isInstanceNameValid,
  LAUNCH_INSTANCE_BOOT_LOG_STEP_MS,
  LAUNCH_INSTANCE_PROVISIONING_SETTLE_MS,
  LAUNCH_INSTANCE_WIZARD_DEMO,
  PROVISIONING_BOOT_LOG_STEPS,
  type LaunchInstanceWizardForm,
  type LaunchInstanceWizardStepId,
  type ProvisioningBootLogStatus,
} from '../../tenantUser/launchInstanceWizard'
import {
  formatLaunchInstanceNetworkLabel,
  getLaunchNetworkFieldLabel,
  resolveLaunchInstanceNetworking,
  resolveLaunchNetworkContext,
  type LaunchNetworkFieldView,
} from '../../tenantUser/launchNetworking'
import { formatTenantInstanceName, generateTenantInstanceId, type TenantInstance } from '../../tenantUser/instances'
import type { TenantUserScopeKind } from '../../tenantUser/scope'

type TenantUserLaunchInstanceWizardProps = {
  isOpen: boolean
  catalogItem: TenantUserCatalogCard
  organization: RegisteredOrganization | null
  catalogDraft: ProviderCatalogDraft | null
  preferCatalogDraft?: boolean
  scopeKind: TenantUserScopeKind
  scopeLabel: string
  scopeFieldLabel: 'Organization' | 'Project'
  existingInstanceNames?: readonly string[]
  onClose: () => void
  onProvisioningStarted: (instance: TenantInstance) => void
  onDismissDuringProvisioning: (instanceId: string) => void
  onWizardFinished: (instanceId: string) => void
}

function getBootLogStatus(
  stepIndex: number,
  activeIndex: number,
): ProvisioningBootLogStatus {
  if (stepIndex < activeIndex) {
    return 'completed'
  }

  if (stepIndex === activeIndex) {
    return 'in-progress'
  }

  return 'pending'
}

function AssignedNetworkField({ field }: { field: LaunchNetworkFieldView }) {
  return (
    <div className="tenant-user-launch-wizard__assigned-field">
      <Content component="p" className="tenant-user-launch-wizard__assigned-label">
        {field.label}
      </Content>
      <Content component="p" className="tenant-user-launch-wizard__assigned-value">
        {field.value}
      </Content>
      <Content component="p" className="tenant-user-launch-wizard__assigned-helper">
        {LAUNCH_INSTANCE_WIZARD_DEMO.networkingAssignedHelper}
      </Content>
    </div>
  )
}

export function TenantUserLaunchInstanceWizard({
  isOpen,
  catalogItem,
  organization,
  catalogDraft,
  preferCatalogDraft = false,
  scopeKind,
  scopeLabel,
  scopeFieldLabel,
  existingInstanceNames = [],
  onClose,
  onProvisioningStarted,
  onDismissDuringProvisioning,
  onWizardFinished,
}: TenantUserLaunchInstanceWizardProps) {
  const networkContext = useMemo(
    () => resolveLaunchNetworkContext(organization, catalogDraft, preferCatalogDraft),
    [organization, catalogDraft, preferCatalogDraft],
  )
  const includeNetworkingStep = networkContext.enabled && networkContext.hasEditableFields
  const wizardSteps = useMemo(
    () => getLaunchInstanceWizardSteps(includeNetworkingStep),
    [includeNetworkingStep],
  )

  const [form, setForm] = useState<LaunchInstanceWizardForm>(() =>
    createLaunchInstanceWizardForm({
      virtualNetworkId: networkContext.policy.virtualNetwork.id,
      subnetId: networkContext.policy.subnet.id,
      securityGroupId: networkContext.policy.securityGroup.id,
    }),
  )
  const [activeStepId, setActiveStepId] = useState<LaunchInstanceWizardStepId>('configure')
  const [activeBootLogIndex, setActiveBootLogIndex] = useState(0)
  const [isProvisioningComplete, setIsProvisioningComplete] = useState(false)
  const provisioningStartedRef = useRef(false)
  const provisioningInstanceIdRef = useRef<string | null>(null)
  const isOpenRef = useRef(isOpen)

  const activeStepDescription =
    wizardSteps.find((step) => step.id === activeStepId)?.description ?? ''
  const isProvisioningInProgress =
    activeStepId === 'provisioning' && !isProvisioningComplete

  const networkSelections = {
    virtualNetworkId: form.virtualNetworkId || networkContext.policy.virtualNetwork.id,
    subnetId: form.subnetId || networkContext.policy.subnet.id,
    securityGroupId: form.securityGroupId || networkContext.policy.securityGroup.id,
  }

  const networkLabel = formatLaunchInstanceNetworkLabel(networkContext, networkSelections)
  const networking = resolveLaunchInstanceNetworking(networkContext, networkSelections)
  const assignedNetworkSummary = networkContext.assignedNetworkSummary
  const securityGroupField = networkContext.fields.find(
    (field) => field.kind === 'security-group',
  )
  const securityGroupLabel = securityGroupField
    ? getLaunchNetworkFieldLabel(securityGroupField, networkSelections.securityGroupId)
    : networkContext.policy.securityGroup.name

  const resetWizard = () => {
    setForm(
      createLaunchInstanceWizardForm({
        virtualNetworkId: networkContext.policy.virtualNetwork.id,
        subnetId: networkContext.policy.subnet.id,
        securityGroupId: networkContext.policy.securityGroup.id,
        instanceName: getNextLaunchInstanceName(existingInstanceNames),
      }),
    )
    setActiveStepId('configure')
    setActiveBootLogIndex(0)
    setIsProvisioningComplete(false)
    provisioningStartedRef.current = false
    provisioningInstanceIdRef.current = null
  }

  const handleClose = () => {
    if (isProvisioningInProgress && provisioningInstanceIdRef.current) {
      onDismissDuringProvisioning(provisioningInstanceIdRef.current)
      resetWizard()
      onClose()
      return
    }

    resetWizard()
    onClose()
  }

  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      resetWizard()
      return
    }

    setForm(
      createLaunchInstanceWizardForm({
        virtualNetworkId: networkContext.policy.virtualNetwork.id,
        subnetId: networkContext.policy.subnet.id,
        securityGroupId: networkContext.policy.securityGroup.id,
        instanceName: getNextLaunchInstanceName(existingInstanceNames),
      }),
    )
  }, [isOpen, networkContext, existingInstanceNames])

  useEffect(() => {
    if (!isOpen || activeStepId !== 'provisioning' || provisioningStartedRef.current) {
      return
    }

    provisioningStartedRef.current = true

    const instance: TenantInstance = {
      id: generateTenantInstanceId(),
      name: formatTenantInstanceName(form.instanceName.trim()),
      catalogItemDisplayName: catalogItem.displayName,
      hardwareProfile: catalogItem.hardwareProfile,
      osImage: catalogItem.osImage,
      networkLabel,
      networking,
      gpuLabel: catalogItem.gpu,
      projectName: scopeLabel,
      scopeKind,
      status: 'provisioning',
      createdAt: new Date().toISOString(),
      provisionedAt: null,
    }

    provisioningInstanceIdRef.current = instance.id
    onProvisioningStarted(instance)

    const totalSteps = PROVISIONING_BOOT_LOG_STEPS.length
    let stepIndex = 0

    const intervalId = window.setInterval(() => {
      stepIndex += 1
      setActiveBootLogIndex(stepIndex)

      if (stepIndex >= totalSteps) {
        window.clearInterval(intervalId)
        setIsProvisioningComplete(true)

        window.setTimeout(() => {
          const instanceId = provisioningInstanceIdRef.current
          if (isOpenRef.current && instanceId) {
            onWizardFinished(instanceId)
            resetWizard()
          }
        }, LAUNCH_INSTANCE_PROVISIONING_SETTLE_MS)
      }
    }, LAUNCH_INSTANCE_BOOT_LOG_STEP_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [
    activeStepId,
    catalogItem,
    form.instanceName,
    isOpen,
    networkLabel,
    networking,
    onProvisioningStarted,
    onWizardFinished,
    scopeKind,
    scopeLabel,
  ])

  const updateNetworkSelection = (
    kind: LaunchNetworkFieldView['kind'],
    value: string,
  ) => {
    setForm((current) => {
      if (kind === 'virtual-network') {
        return { ...current, virtualNetworkId: value }
      }
      if (kind === 'subnet') {
        return { ...current, subnetId: value }
      }
      return { ...current, securityGroupId: value }
    })
  }

  const getSelectedIdForField = (field: LaunchNetworkFieldView): string => {
    if (field.kind === 'virtual-network') {
      return networkSelections.virtualNetworkId
    }
    if (field.kind === 'subnet') {
      return networkSelections.subnetId
    }
    return networkSelections.securityGroupId
  }

  const renderConfigureStep = () => (
    <div className="tenant-user-launch-wizard__step">
      <Content component="h2" className="tenant-user-launch-wizard__step-title">
        {LAUNCH_INSTANCE_WIZARD_DEMO.configureTitle}
      </Content>
      <Content component="p" className="tenant-user-launch-wizard__step-lede">
        {LAUNCH_INSTANCE_WIZARD_DEMO.configureLede}
      </Content>

      <Form autoComplete="off" className="tenant-user-launch-wizard__form">
        <FormGroup label="Instance name" fieldId="launch-instance-name" isRequired>
          <TextInput
            id="launch-instance-name"
            value={form.instanceName}
            onChange={(_event, value) => setForm((current) => ({ ...current, instanceName: value }))}
            placeholder={LAUNCH_INSTANCE_WIZARD_DEMO.instanceNamePlaceholder}
          />
        </FormGroup>

        <FormGroup label="SSH public key" fieldId="launch-instance-ssh-key" isRequired>
          <TextArea
            id="launch-instance-ssh-key"
            value={form.sshPublicKey}
            onChange={(_event, value) => setForm((current) => ({ ...current, sshPublicKey: value }))}
            placeholder={LAUNCH_INSTANCE_WIZARD_DEMO.sshPlaceholder}
            resizeOrientation="vertical"
          />
        </FormGroup>

        <div className="tenant-user-launch-wizard__preconfigured-section">
          <div className="tenant-user-launch-wizard__preconfigured-title">
            <LockIcon aria-hidden />
            <span>{LAUNCH_INSTANCE_WIZARD_DEMO.preConfiguredTitle}</span>
          </div>

          <div
            className={`tenant-user-launch-wizard__preconfigured-grid${
              networkContext.enabled && !includeNetworkingStep
                ? ' tenant-user-launch-wizard__preconfigured-grid--with-network'
                : ''
            }`}
          >
            <div className="tenant-user-launch-wizard__preconfigured-item">
              <Content component="p" className="tenant-user-launch-wizard__preconfigured-label">
                Hardware profile
              </Content>
              <Content component="p" className="tenant-user-launch-wizard__preconfigured-value">
                {catalogItem.hardwareProfile}
              </Content>
            </div>
            <div className="tenant-user-launch-wizard__preconfigured-item">
              <Content component="p" className="tenant-user-launch-wizard__preconfigured-label">
                OS image
              </Content>
              <Content component="p" className="tenant-user-launch-wizard__preconfigured-value">
                {catalogItem.osImage}
              </Content>
            </div>
            {networkContext.enabled && !includeNetworkingStep ? (
              <div className="tenant-user-launch-wizard__preconfigured-item">
                <Content component="p" className="tenant-user-launch-wizard__preconfigured-label">
                  Network
                </Content>
                <Content component="p" className="tenant-user-launch-wizard__preconfigured-value">
                  {assignedNetworkSummary}
                </Content>
                <Content component="p" className="tenant-user-launch-wizard__assigned-helper">
                  {LAUNCH_INSTANCE_WIZARD_DEMO.networkingAssignedHelper}
                </Content>
              </div>
            ) : null}
          </div>
        </div>
      </Form>
    </div>
  )

  const renderNetworkingStep = () => {
    const assignedFields = networkContext.fields.filter((field) => field.locked)
    const editableFields = networkContext.fields.filter((field) => !field.locked)

    return (
      <div className="tenant-user-launch-wizard__step">
        <Content component="h2" className="tenant-user-launch-wizard__step-title">
          {LAUNCH_INSTANCE_WIZARD_DEMO.networkingTitle}
        </Content>
        <Content component="p" className="tenant-user-launch-wizard__step-lede">
          {LAUNCH_INSTANCE_WIZARD_DEMO.networkingLede}
        </Content>

        {assignedFields.length > 0 ? (
          <div className="tenant-user-launch-wizard__assigned-grid">
            {assignedFields.map((field) => (
              <AssignedNetworkField key={field.kind} field={field} />
            ))}
          </div>
        ) : null}

        <Form autoComplete="off" className="tenant-user-launch-wizard__form">
          {editableFields.map((field) => {
            const fieldId = `launch-instance-${field.kind}`
            const selectedId = getSelectedIdForField(field)

            return (
              <FormGroup key={field.kind} label={field.label} fieldId={fieldId} isRequired>
                <FormSelect
                  id={fieldId}
                  value={selectedId}
                  onChange={(_event, value) => updateNetworkSelection(field.kind, value)}
                  aria-label={field.label}
                >
                  {field.options.map((option) => (
                    <FormSelectOption
                      key={option.id}
                      value={option.id}
                      label={getCatalogOptionLabel(option.name, option.detail)}
                    />
                  ))}
                </FormSelect>
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      Choose the {field.label.toLowerCase()} for this instance.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
            )
          })}
        </Form>
      </div>
    )
  }

  const renderReviewStep = () => (
    <div className="tenant-user-launch-wizard__step">
      <Content component="h2" className="tenant-user-launch-wizard__step-title">
        {LAUNCH_INSTANCE_WIZARD_DEMO.reviewTitle}
      </Content>

      <Alert
        variant="info"
        isInline
        title="Provisioning time"
        className="tenant-user-launch-wizard__review-alert"
        customIcon={<InfoCircleIcon />}
      >
        <Content component="p" className="tenant-user-launch-wizard__review-alert-text">
          {LAUNCH_INSTANCE_WIZARD_DEMO.reviewProvisioningNote}
        </Content>
      </Alert>

      <DescriptionList isCompact className="tenant-user-launch-wizard__review-list">
        <DescriptionListGroup>
          <DescriptionListTerm>Catalog item</DescriptionListTerm>
          <DescriptionListDescription>{catalogItem.displayName}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Instance name</DescriptionListTerm>
          <DescriptionListDescription>{form.instanceName.trim()}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Hardware</DescriptionListTerm>
          <DescriptionListDescription>{catalogItem.hardwareProfile}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>GPU</DescriptionListTerm>
          <DescriptionListDescription>{catalogItem.gpu}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>OS image</DescriptionListTerm>
          <DescriptionListDescription>{catalogItem.osImage}</DescriptionListDescription>
        </DescriptionListGroup>
        {networkContext.enabled ? (
          <>
            <DescriptionListGroup>
              <DescriptionListTerm>Network</DescriptionListTerm>
              <DescriptionListDescription>{assignedNetworkSummary}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Security group</DescriptionListTerm>
              <DescriptionListDescription>{securityGroupLabel}</DescriptionListDescription>
            </DescriptionListGroup>
          </>
        ) : null}
        <DescriptionListGroup>
          <DescriptionListTerm>{scopeFieldLabel}</DescriptionListTerm>
          <DescriptionListDescription>{scopeLabel}</DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    </div>
  )

  const renderProvisioningStep = () => (
    <div className="tenant-user-launch-wizard__step tenant-user-launch-wizard__step--provisioning">
      <Content component="h2" className="tenant-user-launch-wizard__step-title">
        {LAUNCH_INSTANCE_WIZARD_DEMO.provisioningTitle}
      </Content>
      <Content component="p" className="tenant-user-launch-wizard__step-lede">
        {LAUNCH_INSTANCE_WIZARD_DEMO.provisioningLede}
      </Content>

      <Alert
        variant="info"
        isInline
        title="You can close this wizard anytime"
        className="tenant-user-launch-wizard__provisioning-alert"
        customIcon={<InfoCircleIcon />}
      >
        <Content component="p">{LAUNCH_INSTANCE_WIZARD_DEMO.provisioningDismissibleNote}</Content>
      </Alert>

      <Card className="tenant-user-launch-wizard__boot-log">
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          className="tenant-user-launch-wizard__boot-log-header"
        >
          <FlexItem>
            <Content component="p" className="tenant-user-launch-wizard__boot-log-title">
              Boot log · {form.instanceName.trim()}
            </Content>
          </FlexItem>
          <FlexItem>
            <Content component="p" className="tenant-user-launch-wizard__boot-log-remaining">
              {LAUNCH_INSTANCE_WIZARD_DEMO.bootLogRemaining}
            </Content>
          </FlexItem>
        </Flex>

        <ul className="tenant-user-launch-wizard__boot-log-list">
          {PROVISIONING_BOOT_LOG_STEPS.map((step, index) => {
            const status = getBootLogStatus(index, activeBootLogIndex)

            return (
              <li
                key={step.id}
                className={`tenant-user-launch-wizard__boot-log-item tenant-user-launch-wizard__boot-log-item--${status}`}
              >
                {status === 'completed' ? (
                  <CheckIcon aria-hidden />
                ) : status === 'in-progress' ? (
                  <Spinner
                    size="sm"
                    className="tenant-user-launch-wizard__boot-log-spinner"
                    aria-label="Step in progress"
                  />
                ) : (
                  <span className="tenant-user-launch-wizard__boot-log-bullet" aria-hidden />
                )}
                <span>{step.label}</span>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )

  const renderStepContent = (stepId: LaunchInstanceWizardStepId) => {
    switch (stepId) {
      case 'configure':
        return renderConfigureStep()
      case 'networking':
        return renderNetworkingStep()
      case 'review':
        return renderReviewStep()
      case 'provisioning':
        return renderProvisioningStep()
      default:
        return null
    }
  }

  const getStepFooter = (stepId: LaunchInstanceWizardStepId) => {
    if (stepId === 'configure' || stepId === 'networking') {
      return {
        isNextDisabled:
          stepId === 'configure'
            ? !isInstanceNameValid(form.instanceName) || !form.sshPublicKey.trim()
            : false,
        nextButtonText: (
          <span className="tenant-user-launch-wizard__footer-label">
            <span>Continue</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
        ...(stepId === 'networking'
          ? {
              backButtonText: (
                <span className="tenant-user-launch-wizard__footer-label">
                  <ArrowLeftIcon aria-hidden />
                  <span>Back</span>
                </span>
              ),
            }
          : {}),
      }
    }

    if (stepId === 'review') {
      return {
        isCancelHidden: true,
        backButtonText: (
          <span className="tenant-user-launch-wizard__footer-label">
            <ArrowLeftIcon aria-hidden />
            <span>Back</span>
          </span>
        ),
        nextButtonText: (
          <span className="tenant-user-launch-wizard__footer-label">
            <span>{LAUNCH_INSTANCE_WIZARD_DEMO.confirmProvisioningLabel}</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
      }
    }

    return {
      isCancelHidden: false,
      cancelButtonText: LAUNCH_INSTANCE_WIZARD_DEMO.closeWhileProvisioningLabel,
      isBackHidden: true,
      isNextDisabled: true,
      nextButtonText: isProvisioningComplete ? 'Complete' : 'Provisioning…',
    }
  }

  return (
    <Modal
      variant={ModalVariant.medium}
      width="64rem"
      maxWidth="64rem"
      isOpen={isOpen}
      onEscapePress={handleClose}
      aria-labelledby="launch-instance-wizard-title"
      className="tenant-user-launch-wizard__modal"
    >
      {isOpen ? (
        <Wizard
          key={`launch-instance-wizard-${includeNetworkingStep ? 'net' : 'no-net'}`}
          className="tenant-user-launch-wizard"
          height="40rem"
          onClose={handleClose}
          onStepChange={(_event, currentStep) => {
            const stepId = String(currentStep.id).replace('launch-instance-step-', '')
            if (
              stepId === 'configure' ||
              stepId === 'networking' ||
              stepId === 'review' ||
              stepId === 'provisioning'
            ) {
              setActiveStepId(stepId)
            }
          }}
          header={
            <WizardHeader
              title="Launch instance"
              titleId="launch-instance-wizard-title"
              description={activeStepDescription || undefined}
              onClose={handleClose}
              closeButtonAriaLabel="Close launch instance wizard"
            />
          }
        >
          {wizardSteps.map((step) => (
            <WizardStep
              key={step.id}
              name={step.label}
              id={`launch-instance-step-${step.id}`}
              footer={getStepFooter(step.id)}
            >
              {renderStepContent(step.id)}
            </WizardStep>
          ))}
        </Wizard>
      ) : null}
    </Modal>
  )
}

function getCatalogOptionLabel(name: string, detail: string): string {
  return `${name} · ${detail}`
}
