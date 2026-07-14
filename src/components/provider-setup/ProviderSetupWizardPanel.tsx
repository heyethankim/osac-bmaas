import { useCallback, useEffect, useRef, useState } from 'react'
import ResourcesFullIcon from '@patternfly/react-icons/dist/esm/icons/resources-full-icon'
import {
  Button,
  Card,
  CardBody,
  Content,
  Flex,
  FlexItem,
  Label,
  ProgressStep,
  ProgressStepper,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core'
import {
  getProviderSetupWizardIntro,
  PROVIDER_SERVICE_CHIP_LABELS,
  PROVIDER_SETUP_STEPS,
  type ConnectVerificationState,
  type DiscoveryScanPhase,
  type ProviderServiceId,
  type ProviderSetupStepId,
} from '../../providerSetup/constants'
import {
  scheduleDiscoveryScan,
  type DiscoveryScanSnapshot,
} from '../../providerSetup/discoveryScan'
import { ProviderSetupConnectStep } from '../../pages/provider-setup/ProviderSetupConnectStep'
import { ProviderSetupDiscoverStep, ProviderSetupDiscoverAlert } from '../../pages/provider-setup/ProviderSetupDiscoverStep'
import { ProviderSetupTemplateStep } from '../../pages/provider-setup/ProviderSetupTemplateStep'
import type { PublishedTemplatePayload } from '../../providerSetup/templateDemo'

const STEP_IDS: ProviderSetupStepId[] = PROVIDER_SETUP_STEPS.map((step) => step.id)

type ProviderSetupWizardPanelProps = {
  selectedServices: ProviderServiceId[]
  onChangeServices: () => void
  onCreateCatalogItem: (payload: PublishedTemplatePayload) => void
  isPublishing?: boolean
}

export function ProviderSetupWizardPanel({
  selectedServices,
  onChangeServices,
  onCreateCatalogItem,
  isPublishing = false,
}: ProviderSetupWizardPanelProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [verificationState, setVerificationState] = useState<ConnectVerificationState>('idle')
  const [scanPhase, setScanPhase] = useState<DiscoveryScanPhase>('idle')
  const [scanSnapshot, setScanSnapshot] = useState<DiscoveryScanSnapshot>({
    revealedHostCount: 0,
    availableHostCount: 0,
    scanProgress: 0,
    activeHost: null,
  })
  const cancelScanRef = useRef<(() => void) | null>(null)

  const activeStepId = STEP_IDS[stepIndex]
  const isLastStep = stepIndex === STEP_IDS.length - 1

  const isNextDisabled =
    (activeStepId === 'connect' && verificationState !== 'verified') ||
    (activeStepId === 'discover' && scanPhase !== 'complete')

  const handleTestConnection = useCallback(() => {
    setVerificationState('verifying')
    window.setTimeout(() => setVerificationState('verified'), 1400)
  }, [])

  const handleTriggerScan = useCallback(() => {
    cancelScanRef.current?.()
    cancelScanRef.current = null

    setScanPhase('scanning')
    setScanSnapshot({
      revealedHostCount: 0,
      availableHostCount: 0,
      scanProgress: 4,
      activeHost: null,
    })

    cancelScanRef.current = scheduleDiscoveryScan(
      (snapshot) => {
        setScanSnapshot(snapshot)
      },
      () => {
        setScanSnapshot((current) => ({
          ...current,
          scanProgress: 100,
          activeHost: null,
        }))
        setScanPhase('complete')
        cancelScanRef.current = null
      },
    )
  }, [])

  useEffect(
    () => () => {
      cancelScanRef.current?.()
    },
    [],
  )

  const handleStepClick = (index: number) => {
    if (index < stepIndex) {
      setStepIndex(index)
    }
  }

  const handleStepKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (index >= stepIndex) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setStepIndex(index)
    }
  }

  const handleNext = () => {
    if (isLastStep) {
      return
    }
    setStepIndex((index) => index + 1)
  }

  const wizardIntro = getProviderSetupWizardIntro(selectedServices)

  return (
    <Stack hasGutter className={`provider-setup-wizard${activeStepId === 'discover' && scanPhase !== 'idle' ? ' provider-setup-wizard--discover-expanded' : ''}`}>
      <StackItem>
        <Flex
          className="provider-setup-wizard__service-context"
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentFlexEnd' }}
          gap={{ default: 'gapSm' }}
        >
          <FlexItem>
            <span className="provider-service-selection__summary-label">Selected</span>
          </FlexItem>
          {selectedServices.map((serviceId) => (
            <FlexItem key={serviceId}>
              <Label color="grey" isCompact>
                {PROVIDER_SERVICE_CHIP_LABELS[serviceId]}
              </Label>
            </FlexItem>
          ))}
          <FlexItem>
            <Button
              variant="link"
              isInline
              className="provider-setup-wizard__change-link"
              onClick={onChangeServices}
              aria-label="Change selected services"
            >
              Change
            </Button>
          </FlexItem>
        </Flex>
      </StackItem>

      <StackItem className="provider-setup-wizard__intro">
        <Label color="blue">First-time setup</Label>
        <Title headingLevel="h1" size="3xl">
          {wizardIntro.title}
        </Title>
        <Content component="p" className="provider-setup-page__lede">
          {wizardIntro.lede}
        </Content>
      </StackItem>

      <StackItem className="provider-setup-wizard__stepper-wrap">
        <ProgressStepper
          aria-label="Platform setup progress"
          className="provider-setup-wizard__stepper"
          isCenterAligned
        >
          {PROVIDER_SETUP_STEPS.map((step, index) => {
            const isComplete = index < stepIndex
            const isCurrent = index === stepIndex
            const isClickable = isComplete

            return (
              <ProgressStep
                key={step.id}
                id={`provider-setup-step-${step.id}`}
                titleId={`provider-setup-step-${step.id}-title`}
                variant={isComplete ? 'success' : isCurrent ? 'default' : 'pending'}
                isCurrent={isCurrent}
                icon={isCurrent ? <ResourcesFullIcon /> : undefined}
                className={isClickable ? 'provider-setup-wizard__step--clickable' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onClick={isClickable ? () => handleStepClick(index) : undefined}
                onKeyDown={isClickable ? (event) => handleStepKeyDown(event, index) : undefined}
                aria-label={
                  isComplete
                    ? `${step.label}, completed step, return to this step`
                    : isCurrent
                      ? `${step.label}, current step, in process step`
                      : `${step.label}, pending step`
                }
              >
                {step.label}
              </ProgressStep>
            )
          })}
        </ProgressStepper>
      </StackItem>

      {activeStepId === 'discover' && scanPhase === 'complete' ? (
        <StackItem>
          <ProviderSetupDiscoverAlert scanPhase={scanPhase} />
        </StackItem>
      ) : null}

      <StackItem>
        {activeStepId === 'template' ? (
          <ProviderSetupTemplateStep
            onCreateCatalogItem={onCreateCatalogItem}
            isPublishing={isPublishing}
          />
        ) : (
          <Card isCompact={false} className="provider-setup-wizard__body-card">
            <CardBody>
              {activeStepId === 'connect' ? (
                <ProviderSetupConnectStep
                  embedded
                  verificationState={verificationState}
                  onTestConnection={handleTestConnection}
                  onSaveContinue={handleNext}
                  isSaveContinueDisabled={isNextDisabled}
                />
              ) : null}

              {activeStepId === 'discover' ? (
                <ProviderSetupDiscoverStep
                  embedded
                  scanPhase={scanPhase}
                  scanSnapshot={scanSnapshot}
                  onTriggerScan={handleTriggerScan}
                  onCreateTemplate={handleNext}
                />
              ) : null}
            </CardBody>
          </Card>
        )}
      </StackItem>
    </Stack>
  )
}
