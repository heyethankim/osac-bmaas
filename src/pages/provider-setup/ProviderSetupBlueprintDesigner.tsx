import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
  FormGroup,
  Grid,
  GridItem,
  Label,
  Modal,
  ModalVariant,
  Radio,
  Spinner,
  TextArea,
  TextInput,
  Title,
  Wizard,
  WizardHeader,
  WizardStep,
} from '@patternfly/react-core'
import { KubernetesResourceNameHelper } from '../../components/shared/KubernetesResourceNameHelper'
import {
  BLUEPRINT_DESIGNER_STEPS,
  DEFAULT_BLUEPRINT_FORM,
  DISCOVERED_HARDWARE_PROFILES,
  generateTemplateReferenceId,
  getCatalogDisplayName,
  getHardwareProfileLabel,
  getSwitchPortProfileLabel,
  parseRateCardFromForm,
  formatRateCardSummary,
  TEMPLATE_SAVE_VALIDATION_TASKS,
  type BlueprintDesignerStepId,
  type BlueprintFormState,
  type SavedMasterTemplate,
} from '../../providerSetup/templateDemo'
import type { OsImageOption } from '../../providerAdmin/computeImages'
import { toOsImageOption } from '../../providerAdmin/computeImages'
import { isValidKubernetesResourceName } from '../../shared/kubernetesResourceName'
import { getOsImageLabel } from '../../providerAdmin/osImageLabels'
import { getProviderComputeImages } from '../../providerSetup/storage'

type ProviderSetupBlueprintDesignerProps = {
  isOpen: boolean
  initialForm?: BlueprintFormState
  title?: string
  /** When set, save updates this template instead of creating a new reference ID. */
  existingTemplateRefId?: string
  onClose: () => void
  onTemplateSaved: (template: SavedMasterTemplate) => void
}

type ReviewSaveState = 'idle' | 'validating' | 'ready'

const VALIDATION_STEP_MS = 750

function HardwareSelectionCards({
  selectedId,
  onSelect,
}: {
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div
      className="provider-setup-template__card-group"
      role="radiogroup"
      aria-label="Hardware profile"
    >
      {DISCOVERED_HARDWARE_PROFILES.map((profile) => {
        const isSelected = profile.id === selectedId
        const title = `${profile.hostCount}× ${profile.vendor} ${profile.model}`

        return (
          <button
            key={profile.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={`provider-setup-template__select-card provider-setup-template__select-card--hardware${
              isSelected ? ' provider-setup-template__select-card--selected' : ''
            }`}
            onClick={() => onSelect(profile.id)}
          >
            <div className="provider-setup-template__select-card-header">
              <Label
                color={profile.category === 'compute' ? 'blue' : 'teal'}
                isCompact
                className="provider-setup-template__select-card-badge"
              >
                {profile.categoryLabel}
              </Label>
              <span
                className={`provider-setup-template__select-card-radio${
                  isSelected ? ' provider-setup-template__select-card-radio--selected' : ''
                }`}
                aria-hidden
              />
            </div>
            <Title headingLevel="h3" size="md" className="provider-setup-template__select-card-title">
              {title}
            </Title>
            <Grid hasGutter className="provider-setup-template__select-card-specs">
              <GridItem span={6}>
                <div className="provider-setup-template__spec">
                  <span className="provider-setup-template__spec-label">CPU</span>
                  <span className="provider-setup-template__spec-value">{profile.cpu}</span>
                </div>
              </GridItem>
              <GridItem span={6}>
                <div className="provider-setup-template__spec">
                  <span className="provider-setup-template__spec-label">Memory</span>
                  <span className="provider-setup-template__spec-value">{profile.memory}</span>
                </div>
              </GridItem>
              <GridItem span={6}>
                <div className="provider-setup-template__spec">
                  <span className="provider-setup-template__spec-label">GPU</span>
                  <span className="provider-setup-template__spec-value">{profile.gpu}</span>
                </div>
              </GridItem>
              <GridItem span={6}>
                <div className="provider-setup-template__spec">
                  <span className="provider-setup-template__spec-label">Network</span>
                  <span className="provider-setup-template__spec-value">{profile.network}</span>
                </div>
              </GridItem>
            </Grid>
          </button>
        )
      })}
    </div>
  )
}

function OsImageSelectionCards({
  options,
  selectedId,
  onSelect,
}: {
  options: OsImageOption[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="provider-setup-template__card-group" role="radiogroup" aria-label="OS image">
      {options.map((option) => {
        const isSelected = option.id === selectedId

        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={`provider-setup-template__select-card provider-setup-template__select-card--os${
              isSelected ? ' provider-setup-template__select-card--selected' : ''
            }`}
            onClick={() => onSelect(option.id)}
          >
            <span className="provider-setup-template__os-abbrev" aria-hidden>
              {option.abbrev}
            </span>
            <div className="provider-setup-template__os-copy">
              <div className="provider-setup-template__os-title-row">
                <span className="provider-setup-template__os-name">{option.name}</span>
                {option.recommended ? (
                  <Label color="green" isCompact>
                    Recommended
                  </Label>
                ) : null}
              </div>
              <span className="provider-setup-template__os-meta">
                {option.arch} · {option.size}
              </span>
            </div>
            <span
              className={`provider-setup-template__select-card-radio${
                isSelected ? ' provider-setup-template__select-card-radio--selected' : ''
              }`}
              aria-hidden
            />
          </button>
        )
      })}
    </div>
  )
}

export function ProviderSetupBlueprintDesigner({
  isOpen,
  initialForm = DEFAULT_BLUEPRINT_FORM,
  title = 'Create master template for catalog',
  existingTemplateRefId,
  onClose,
  onTemplateSaved,
}: ProviderSetupBlueprintDesignerProps) {
  const isEditing = Boolean(existingTemplateRefId)
  const [form, setForm] = useState<BlueprintFormState>(initialForm)
  const [reviewSaveState, setReviewSaveState] = useState<ReviewSaveState>('idle')
  const [validationTaskIndex, setValidationTaskIndex] = useState(0)
  const [templateRefId, setTemplateRefId] = useState(existingTemplateRefId ?? '')
  const validationTimerRef = useRef<number | null>(null)
  const osImageOptions = useMemo(
    () => getProviderComputeImages().map(toOsImageOption),
    [isOpen],
  )

  const resetDesigner = () => {
    setForm(initialForm)
    setReviewSaveState('idle')
    setValidationTaskIndex(0)
    setTemplateRefId(existingTemplateRefId ?? '')
    if (validationTimerRef.current !== null) {
      window.clearInterval(validationTimerRef.current)
      validationTimerRef.current = null
    }
  }

  const handleClose = () => {
    resetDesigner()
    onClose()
  }

  const handleStartSave = () => {
    setTemplateRefId(existingTemplateRefId ?? generateTemplateReferenceId())
    setValidationTaskIndex(0)
    setReviewSaveState('validating')
  }

  const handleDone = () => {
    const rateCard = parseRateCardFromForm(form)
    if (!rateCard) {
      return
    }

    const template: SavedMasterTemplate = {
      templateRefId,
      templateName: form.templateName,
      description: form.description,
      hardwareProfileId: form.hardwareProfileId,
      osImageId: form.osImage,
      suggestedDisplayName: getCatalogDisplayName(form.hardwareProfileId),
      rateCard,
    }
    resetDesigner()
    onTemplateSaved(template)
  }

  useEffect(() => {
    if (!isOpen) {
      resetDesigner()
      return
    }

    const images = getProviderComputeImages()
    const defaultImageAvailable = images.some((image) => image.id === initialForm.osImage)

    setForm({
      ...initialForm,
      osImage: defaultImageAvailable ? initialForm.osImage : (images[0]?.id ?? ''),
    })
    setReviewSaveState('idle')
    setValidationTaskIndex(0)
    setTemplateRefId(existingTemplateRefId ?? '')
  }, [isOpen, initialForm, existingTemplateRefId])

  useEffect(() => {
    if (reviewSaveState !== 'validating') {
      return undefined
    }

    validationTimerRef.current = window.setInterval(() => {
      setValidationTaskIndex((current) =>
        current >= TEMPLATE_SAVE_VALIDATION_TASKS.length ? current : current + 1,
      )
    }, VALIDATION_STEP_MS)

    return () => {
      if (validationTimerRef.current !== null) {
        window.clearInterval(validationTimerRef.current)
        validationTimerRef.current = null
      }
    }
  }, [reviewSaveState])

  useEffect(() => {
    if (
      reviewSaveState === 'validating' &&
      validationTaskIndex >= TEMPLATE_SAVE_VALIDATION_TASKS.length
    ) {
      const timer = window.setTimeout(() => setReviewSaveState('ready'), 300)
      return () => window.clearTimeout(timer)
    }

    return undefined
  }, [reviewSaveState, validationTaskIndex])

  function renderStepContent(stepId: BlueprintDesignerStepId) {
    switch (stepId) {
      case 'identity':
        return (
          <Form autoComplete="off" className="provider-setup-template__identity-form">
            <FormGroup label="Template name" fieldId="blueprint-template-name" isRequired>
              <TextInput
                id="blueprint-template-name"
                value={form.templateName}
                validated={
                  form.templateName.trim() && !isValidKubernetesResourceName(form.templateName)
                    ? 'error'
                    : 'default'
                }
                onChange={(_event, value) =>
                  setForm((current) => ({ ...current, templateName: value }))
                }
                placeholder="e.g. gpu-a100-training-standard"
              />
              <KubernetesResourceNameHelper
                value={form.templateName}
                id="blueprint-template-name-helper"
              />
            </FormGroup>
            <FormGroup label="Description" fieldId="blueprint-description" isRequired>
              <TextArea
                id="blueprint-description"
                value={form.description}
                onChange={(_event, value) =>
                  setForm((current) => ({ ...current, description: value }))
                }
                resizeOrientation="vertical"
                rows={3}
                placeholder="Describe what this template provides and which workloads it supports."
              />
            </FormGroup>
          </Form>
        )
      case 'hardware':
        return (
          <HardwareSelectionCards
            selectedId={form.hardwareProfileId}
            onSelect={(hardwareProfileId) =>
              setForm((current) => ({ ...current, hardwareProfileId }))
            }
          />
        )
      case 'os-image':
        return (
          <OsImageSelectionCards
            options={osImageOptions}
            selectedId={form.osImage}
            onSelect={(osImage) => setForm((current) => ({ ...current, osImage }))}
          />
        )
      case 'network':
        return (
          <Form autoComplete="off" className="provider-setup-template__network-form">
            <Grid hasGutter>
              <GridItem span={12} md={6}>
                <FormGroup label="Subnet CIDR" fieldId="blueprint-subnet-cidr" isRequired>
                  <TextInput
                    id="blueprint-subnet-cidr"
                    value={form.subnetCidr}
                    onChange={(_event, value) =>
                      setForm((current) => ({ ...current, subnetCidr: value }))
                    }
                  />
                </FormGroup>
              </GridItem>
              <GridItem span={12} md={6}>
                <FormGroup label="VLAN ID" fieldId="blueprint-vlan-id" isRequired>
                  <TextInput
                    id="blueprint-vlan-id"
                    value={form.vlanId}
                    onChange={(_event, value) =>
                      setForm((current) => ({ ...current, vlanId: value }))
                    }
                  />
                </FormGroup>
              </GridItem>
              <GridItem span={12} md={6}>
                <FormGroup label="Default gateway" fieldId="blueprint-default-gateway" isRequired>
                  <TextInput
                    id="blueprint-default-gateway"
                    value={form.defaultGateway}
                    onChange={(_event, value) =>
                      setForm((current) => ({ ...current, defaultGateway: value }))
                    }
                  />
                </FormGroup>
              </GridItem>
              <GridItem span={12} md={6}>
                <FormGroup label="MTU" fieldId="blueprint-mtu" isRequired>
                  <TextInput
                    id="blueprint-mtu"
                    value={form.mtu}
                    onChange={(_event, value) => setForm((current) => ({ ...current, mtu: value }))}
                  />
                </FormGroup>
              </GridItem>
            </Grid>
            <FormGroup
              label="Switch port profile"
              fieldId="blueprint-switch-port-profile"
              className="provider-setup-template__switch-profile-group"
              isRequired
            >
              <div className="provider-setup-template__switch-profile-options">
                <Radio
                  id="blueprint-switch-trunk"
                  name="blueprint-switch-port-profile"
                  label="Trunk — Tagged VLAN"
                  isChecked={form.switchPortProfile === 'trunk'}
                  onChange={() =>
                    setForm((current) => ({ ...current, switchPortProfile: 'trunk' }))
                  }
                />
                <Radio
                  id="blueprint-switch-access"
                  name="blueprint-switch-port-profile"
                  label="Access — Untagged"
                  isChecked={form.switchPortProfile === 'access'}
                  onChange={() =>
                    setForm((current) => ({ ...current, switchPortProfile: 'access' }))
                  }
                />
              </div>
            </FormGroup>
          </Form>
        )
      case 'rate-card':
        return (
          <Form autoComplete="off" className="provider-setup-template__rate-card-form">
            <Content component="p" className="provider-setup-template__rate-card-lede">
              Attach baseline unit pricing to this template before commercialization. Rates inherit
              into catalog items at publish time.
            </Content>
            <Grid hasGutter>
              <GridItem span={12} md={4}>
                <FormGroup label="Hourly rate (USD)" fieldId="blueprint-hourly-rate" isRequired>
                  <TextInput
                    id="blueprint-hourly-rate"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.hourlyRate}
                    onChange={(_event, value) =>
                      setForm((current) => ({ ...current, hourlyRate: value }))
                    }
                  />
                </FormGroup>
              </GridItem>
              <GridItem span={12} md={4}>
                <FormGroup label="Monthly rate (USD)" fieldId="blueprint-monthly-rate" isRequired>
                  <TextInput
                    id="blueprint-monthly-rate"
                    type="number"
                    min={0}
                    step="1"
                    value={form.monthlyRate}
                    onChange={(_event, value) =>
                      setForm((current) => ({ ...current, monthlyRate: value }))
                    }
                  />
                </FormGroup>
              </GridItem>
              <GridItem span={12} md={4}>
                <FormGroup label="Currency" fieldId="blueprint-currency" isRequired>
                  <TextInput
                    id="blueprint-currency"
                    value={form.currency}
                    onChange={(_event, value) =>
                      setForm((current) => ({ ...current, currency: value }))
                    }
                  />
                </FormGroup>
              </GridItem>
            </Grid>
            <Content component="p" className="provider-setup-template__rate-card-summary">
              Billing unit: per instance
            </Content>
          </Form>
        )
      case 'review':
        return (
          <div className="provider-setup-template__review-step">
            <DescriptionList isCompact className="provider-setup-template__review-list">
              <DescriptionListGroup>
                <DescriptionListTerm>Template name</DescriptionListTerm>
                <DescriptionListDescription>{form.templateName}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Description</DescriptionListTerm>
                <DescriptionListDescription>
                  {form.description.trim() || '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Hardware profile</DescriptionListTerm>
                <DescriptionListDescription>
                  {getHardwareProfileLabel(form.hardwareProfileId)}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>OS image</DescriptionListTerm>
                <DescriptionListDescription>{getOsImageLabel(form.osImage)}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Subnet CIDR</DescriptionListTerm>
                <DescriptionListDescription>{form.subnetCidr}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>VLAN ID</DescriptionListTerm>
                <DescriptionListDescription>{form.vlanId}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Default gateway</DescriptionListTerm>
                <DescriptionListDescription>{form.defaultGateway}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>MTU</DescriptionListTerm>
                <DescriptionListDescription>{form.mtu}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Switch port profile</DescriptionListTerm>
                <DescriptionListDescription>
                  {getSwitchPortProfileLabel(form.switchPortProfile)}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Rate card</DescriptionListTerm>
                <DescriptionListDescription>
                  {parseRateCardFromForm(form)
                    ? formatRateCardSummary(parseRateCardFromForm(form)!)
                    : '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
            {reviewSaveState === 'validating' ? (
              <Content component="p" className="provider-setup-template__review-status" aria-live="polite">
                <Spinner size="sm" aria-label="Validating template" />
                Validating template configuration…
              </Content>
            ) : null}
            {reviewSaveState === 'ready' ? (
              <Content component="p" className="provider-setup-template__review-status provider-setup-template__review-status--ready">
                {isEditing ? (
                  <>
                    Template <strong>{form.templateName}</strong> updated.
                  </>
                ) : (
                  <>
                    Template <strong>{form.templateName}</strong> saved. Close this wizard and use
                    Create a catalog item on the Bare metal templates page.
                  </>
                )}
              </Content>
            ) : null}
          </div>
        )
      default:
        return null
    }
  }

  function getReviewFooter() {
    if (reviewSaveState === 'idle') {
      return {
        nextButtonText: isEditing ? 'Save changes' : 'Save template',
        onNext: handleStartSave,
      }
    }

    if (reviewSaveState === 'validating') {
      return {
        nextButtonText: (
          <span className="provider-setup-template__validating-footer-label">
            <Spinner size="sm" aria-label="Validating template" />
            <span>Validating…</span>
          </span>
        ),
        isNextDisabled: true,
        isBackDisabled: true,
      }
    }

    return {
      nextButtonText: 'Done',
      onNext: handleDone,
      isBackDisabled: true,
    }
  }

  return (
    <Modal
      variant={ModalVariant.medium}
      width="64rem"
      maxWidth="64rem"
      isOpen={isOpen}
      onEscapePress={handleClose}
      aria-labelledby="blueprint-designer-title"
      className="provider-setup-template__designer-modal"
    >
      {isOpen ? (
        <Wizard
          key="blueprint-designer-wizard"
          className="provider-setup-template__designer-wizard"
          height="40rem"
          onClose={handleClose}
          header={
            <WizardHeader
              title={title}
              titleId="blueprint-designer-title"
              className="provider-setup-template__designer-header"
              onClose={handleClose}
              closeButtonAriaLabel={isEditing ? 'Close template editor' : 'Close template creator'}
            />
          }
        >
            {BLUEPRINT_DESIGNER_STEPS.map((step) => (
              <WizardStep
                key={step.id}
                name={step.label}
                id={`blueprint-step-${step.id}`}
                footer={
                  step.id === 'review'
                    ? getReviewFooter()
                    : step.id === 'rate-card'
                      ? { isNextDisabled: !parseRateCardFromForm(form) }
                      : step.id === 'identity'
                        ? {
                            isNextDisabled:
                              !isValidKubernetesResourceName(form.templateName) ||
                              !form.description.trim(),
                          }
                        : undefined
                }
              >
                <div className="provider-setup-template__wizard-step-body">
                  {renderStepContent(step.id)}
                </div>
              </WizardStep>
            ))}
        </Wizard>
      ) : null}
    </Modal>
  )
}
