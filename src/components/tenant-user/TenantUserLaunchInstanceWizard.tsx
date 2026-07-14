import { useEffect, useRef, useState } from 'react'
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
  Modal,
  ModalVariant,
  Spinner,
  TextArea,
  TextInput,
  Wizard,
  WizardHeader,
  WizardStep,
} from '@patternfly/react-core'
import type { TenantUserCatalogCard } from '../../tenantUser/catalog'
import {
  DEFAULT_LAUNCH_INSTANCE_WIZARD_FORM,
  isInstanceNameValid,
  LAUNCH_INSTANCE_WIZARD_DEMO,
  LAUNCH_INSTANCE_WIZARD_STEPS,
  PROVISIONING_BOOT_LOG_STEPS,
  type LaunchInstanceWizardForm,
  type LaunchInstanceWizardStepId,
  type ProvisioningBootLogStatus,
} from '../../tenantUser/launchInstanceWizard'
import { generateTenantInstanceId, type TenantInstance } from '../../tenantUser/instances'

type TenantUserLaunchInstanceWizardProps = {
  isOpen: boolean
  catalogItem: TenantUserCatalogCard
  projectName: string
  onClose: () => void
  onProvisioned: (instance: TenantInstance) => void
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

export function TenantUserLaunchInstanceWizard({
  isOpen,
  catalogItem,
  projectName,
  onClose,
  onProvisioned,
}: TenantUserLaunchInstanceWizardProps) {
  const [form, setForm] = useState<LaunchInstanceWizardForm>(DEFAULT_LAUNCH_INSTANCE_WIZARD_FORM)
  const [activeStepId, setActiveStepId] = useState<LaunchInstanceWizardStepId>('configure')
  const [activeBootLogIndex, setActiveBootLogIndex] = useState(0)
  const [isProvisioningComplete, setIsProvisioningComplete] = useState(false)
  const provisioningStartedRef = useRef(false)

  const activeStepDescription =
    LAUNCH_INSTANCE_WIZARD_STEPS.find((step) => step.id === activeStepId)?.description ?? ''

  const resetWizard = () => {
    setForm(DEFAULT_LAUNCH_INSTANCE_WIZARD_FORM)
    setActiveStepId('configure')
    setActiveBootLogIndex(0)
    setIsProvisioningComplete(false)
    provisioningStartedRef.current = false
  }

  const handleClose = () => {
    if (activeStepId === 'provisioning' && !isProvisioningComplete) {
      return
    }

    resetWizard()
    onClose()
  }

  useEffect(() => {
    if (!isOpen) {
      resetWizard()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || activeStepId !== 'provisioning' || provisioningStartedRef.current) {
      return
    }

    provisioningStartedRef.current = true
    const totalSteps = PROVISIONING_BOOT_LOG_STEPS.length
    let stepIndex = 0

    const intervalId = window.setInterval(() => {
      stepIndex += 1
      setActiveBootLogIndex(stepIndex)

      if (stepIndex >= totalSteps) {
        window.clearInterval(intervalId)
        setIsProvisioningComplete(true)

        const instance: TenantInstance = {
          id: generateTenantInstanceId(),
          name: form.instanceName.trim(),
          catalogItemDisplayName: LAUNCH_INSTANCE_WIZARD_DEMO.reviewCatalogItem,
          hardwareProfile: LAUNCH_INSTANCE_WIZARD_DEMO.reviewHardware,
          osImage: LAUNCH_INSTANCE_WIZARD_DEMO.reviewOsImage,
          networkLabel: LAUNCH_INSTANCE_WIZARD_DEMO.reviewNetwork,
          gpuLabel: LAUNCH_INSTANCE_WIZARD_DEMO.reviewGpu,
          projectName,
          status: 'running',
          createdAt: new Date().toISOString(),
          provisionedAt: new Date().toISOString(),
        }

        window.setTimeout(() => {
          onProvisioned(instance)
          handleClose()
        }, 900)
      }
    }, 850)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [activeStepId, form.instanceName, isOpen, onProvisioned, projectName])

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

          <div className="tenant-user-launch-wizard__preconfigured-grid">
            <div className="tenant-user-launch-wizard__preconfigured-item">
              <Content component="p" className="tenant-user-launch-wizard__preconfigured-label">
                Hardware profile
              </Content>
              <Content component="p" className="tenant-user-launch-wizard__preconfigured-value">
                {LAUNCH_INSTANCE_WIZARD_DEMO.hardwareProfile}
              </Content>
            </div>
            <div className="tenant-user-launch-wizard__preconfigured-item">
              <Content component="p" className="tenant-user-launch-wizard__preconfigured-label">
                OS image
              </Content>
              <Content component="p" className="tenant-user-launch-wizard__preconfigured-value">
                {LAUNCH_INSTANCE_WIZARD_DEMO.osImage}
              </Content>
            </div>
            <div className="tenant-user-launch-wizard__preconfigured-item">
              <Content component="p" className="tenant-user-launch-wizard__preconfigured-label">
                Network / VLAN
              </Content>
              <Content component="p" className="tenant-user-launch-wizard__preconfigured-value">
                {LAUNCH_INSTANCE_WIZARD_DEMO.networkVlan}
              </Content>
            </div>
          </div>
        </div>
      </Form>
    </div>
  )

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
          <DescriptionListDescription>
            {LAUNCH_INSTANCE_WIZARD_DEMO.reviewHardware}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>GPU</DescriptionListTerm>
          <DescriptionListDescription>{LAUNCH_INSTANCE_WIZARD_DEMO.reviewGpu}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>OS image</DescriptionListTerm>
          <DescriptionListDescription>{LAUNCH_INSTANCE_WIZARD_DEMO.reviewOsImage}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Network</DescriptionListTerm>
          <DescriptionListDescription>{LAUNCH_INSTANCE_WIZARD_DEMO.reviewNetwork}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Team</DescriptionListTerm>
          <DescriptionListDescription>{projectName}</DescriptionListDescription>
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
      case 'review':
        return renderReviewStep()
      case 'provisioning':
        return renderProvisioningStep()
      default:
        return null
    }
  }

  const getStepFooter = (stepId: LaunchInstanceWizardStepId) => {
    if (stepId === 'configure') {
      return {
        isNextDisabled:
          !isInstanceNameValid(form.instanceName) || !form.sshPublicKey.trim(),
        nextButtonText: (
          <span className="tenant-user-launch-wizard__footer-label">
            <span>Continue</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
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
      isCancelHidden: true,
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
          key="launch-instance-wizard"
          className="tenant-user-launch-wizard"
          height="40rem"
          onClose={handleClose}
          onStepChange={(_event, currentStep) => {
            const stepId = String(currentStep.id).replace('launch-instance-step-', '')
            if (stepId === 'configure' || stepId === 'review' || stepId === 'provisioning') {
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
              isCloseHidden={activeStepId === 'provisioning'}
            />
          }
        >
          {LAUNCH_INSTANCE_WIZARD_STEPS.map((step) => (
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
