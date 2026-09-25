import { useState, type ReactNode } from 'react'
import { MinusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/minus-circle-icon'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import {
  Button,
  Card,
  CardBody,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  FileUpload,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Label,
  Radio,
  TextArea,
  TextInput,
  Title,
} from '@patternfly/react-core'
import { NetworkInventoryCreateWizardShell } from '../../networking/NetworkInventoryCreateWizardShell'
import { KubernetesResourceNameField } from '../../shared/KubernetesResourceNameHelper'
import { isValidKubernetesResourceName } from '../../../shared/kubernetesResourceName'
import type { NetworkInventoryCreateStep } from '../../../networking/networkInventoryCreateWizard'
import {
  addSecret,
  buildSecretSummaryFromPairs,
  generateTenantSecretId,
  TENANT_SECRET_TYPE_OPTIONS,
  updateSecret,
  type SecretVaultScope,
  type TenantSecret,
  type TenantSecretUsage,
} from '../../../tenant/secrets'
import {
  buildTenantSecretData,
  getTenantSecretTypeLabel,
  getTenantSecretTypeOption,
  type TenantSecretType,
} from '../../../tenant/secretTypes'
import { SecretFieldInput } from './SecretFieldInput'
import {
  applySecretTypeToForm,
  createDemoSecretFormState,
  createKeyValuePair,
  createPrefillGeneralSecretFormState,
  formatLabelsInput,
  formPairsToStored,
  parseLabelsInput,
  secretFormStateFromTenantSecret,
  type KeyValuePair,
  type TenantSecretFormState,
} from './secretFormTypes'

type CreateTenantSecretFlowProps = {
  tenantSlug: string
  scope?: SecretVaultScope
  initialType?: TenantSecretType
  editingSecret?: TenantSecret | null
  presentation?: 'page' | 'modal'
  isOpen?: boolean
  usage?: TenantSecretUsage
  onClose: () => void
  onCreated: (secret: TenantSecret) => void
  onUpdated?: (secret: TenantSecret) => void
}

const GENERAL_STEP_ID = 'general'
const SECRET_DATA_STEP_ID = 'secret-data'
const REVIEW_STEP_ID = 'review'

const WIZARD_STEPS: readonly NetworkInventoryCreateStep[] = [
  { id: GENERAL_STEP_ID, label: 'General' },
  { id: SECRET_DATA_STEP_ID, label: 'Secret data' },
  { id: REVIEW_STEP_ID, label: 'Review' },
]

function isGeneralStepValid(form: TenantSecretFormState): boolean {
  return isValidKubernetesResourceName(form.name)
}

function isSecretDataStepValid(form: TenantSecretFormState): boolean {
  if (!form.type) {
    return false
  }

  const option = getTenantSecretTypeOption(form.type)
  const pairs = form.pairs.filter((pair) => pair.key.trim() && pair.value.trim())

  if (pairs.length === 0) {
    return false
  }

  if (option.requiredKeys.length > 0) {
    return option.requiredKeys.every((requiredKey) =>
      pairs.some((pair) => pair.key.trim() === requiredKey),
    )
  }

  return true
}

function KeyValuePairsEditor({
  pairs,
  type,
  allowAddRemove,
  keysLocked,
  onChange,
  onUploadedFileNameChange,
}: {
  pairs: KeyValuePair[]
  type: TenantSecretType
  allowAddRemove: boolean
  keysLocked: boolean
  onChange: (pairs: KeyValuePair[]) => void
  onUploadedFileNameChange: (fileName: string) => void
}) {
  const option = getTenantSecretTypeOption(type)

  const updatePair = (id: string, patch: Partial<KeyValuePair>) => {
    onChange(pairs.map((pair) => (pair.id === id ? { ...pair, ...patch } : pair)))
  }

  const removePair = (id: string) => {
    if (pairs.length === 1) {
      onChange([createKeyValuePair({ key: option.requiredKeys[0] ?? '' })])
      return
    }
    onChange(pairs.filter((pair) => pair.id !== id))
  }

  return (
    <div className="tenant-secrets__pair-list">
      {pairs.map((pair, index) => (
        <div key={pair.id} className="tenant-secrets__pair-row">
          <FormGroup
            label={keysLocked ? 'Required key' : 'Key'}
            fieldId={`secret-key-${pair.id}`}
            isRequired
          >
            <TextInput
              id={`secret-key-${pair.id}`}
              value={pair.key}
              isDisabled={keysLocked}
              onChange={(_event, value) => updatePair(pair.id, { key: value })}
            />
          </FormGroup>
          <FormGroup label="Value" fieldId={`secret-value-${pair.id}`} isRequired>
            <div className="tenant-secrets__radio-group">
              <Radio
                id={`secret-value-mode-paste-${pair.id}`}
                name={`secret-value-mode-${pair.id}`}
                label="Enter value"
                isChecked={pair.valueMode === 'paste'}
                onChange={() => updatePair(pair.id, { valueMode: 'paste' })}
              />
              <Radio
                id={`secret-value-mode-upload-${pair.id}`}
                name={`secret-value-mode-${pair.id}`}
                label="Upload file"
                isChecked={pair.valueMode === 'upload-file'}
                onChange={() => updatePair(pair.id, { valueMode: 'upload-file' })}
              />
            </div>
            <div className="tenant-secrets__pair-value-row">
              <div className="tenant-secrets__pair-value-control">
                {pair.valueMode === 'paste' ? (
                  option.preferUpload || pair.value.includes('\n') ? (
                    <TextArea
                      id={`secret-value-${pair.id}`}
                      value={pair.value}
                      onChange={(_event, value) => updatePair(pair.id, { value })}
                      rows={6}
                      aria-label={`Secret value ${index + 1}`}
                    />
                  ) : (
                    <SecretFieldInput
                      id={`secret-value-${pair.id}`}
                      value={pair.value}
                      onChange={(_event, value) => updatePair(pair.id, { value })}
                      aria-label={`Secret value ${index + 1}`}
                    />
                  )
                ) : (
                  <FileUpload
                    id={`secret-value-file-${pair.id}`}
                    type="text"
                    value={pair.value}
                    filename={pair.valueFileName}
                    filenamePlaceholder="Drag and drop a file or upload one"
                    browseButtonText="Upload"
                    clearButtonText="Remove"
                    onFileInputChange={(_event, file) => {
                      updatePair(pair.id, { valueFileName: file.name })
                      onUploadedFileNameChange(file.name)
                    }}
                    onReadStarted={() => undefined}
                    onReadFinished={(_event, file) => {
                      file.text().then((text) => {
                        updatePair(pair.id, { value: text })
                      })
                    }}
                    onClearClick={() => {
                      updatePair(pair.id, { value: '', valueFileName: '' })
                      onUploadedFileNameChange('')
                    }}
                  />
                )}
              </div>
              {allowAddRemove && pairs.length > 1 ? (
                <Button
                  variant="plain"
                  className="tenant-secrets__pair-remove"
                  icon={<MinusCircleIcon />}
                  aria-label={`Remove key/value pair ${index + 1}`}
                  onClick={() => removePair(pair.id)}
                />
              ) : null}
            </div>
          </FormGroup>
        </div>
      ))}
      {allowAddRemove ? (
        <Button
          variant="link"
          icon={<PlusCircleIcon />}
          className="tenant-secrets__add-row"
          onClick={() => onChange([...pairs, createKeyValuePair()])}
        >
          Add key/value
        </Button>
      ) : null}
    </div>
  )
}

export function CreateTenantSecretFlow({
  tenantSlug,
  scope = 'tenant',
  initialType: _initialType,
  editingSecret = null,
  presentation = 'page',
  isOpen = true,
  usage = 'general',
  onClose,
  onCreated,
  onUpdated,
}: CreateTenantSecretFlowProps) {
  const isEditMode = editingSecret !== null
  const [formState, setFormState] = useState<TenantSecretFormState>(() =>
    editingSecret
      ? secretFormStateFromTenantSecret(editingSecret)
      : createPrefillGeneralSecretFormState(),
  )
  const [labelsInput, setLabelsInput] = useState(() =>
    formatLabelsInput(
      editingSecret ? editingSecret.labels : createPrefillGeneralSecretFormState().labels,
    ),
  )

  const typeOption = formState.type ? getTenantSecretTypeOption(formState.type) : null
  const wizardTitle = isEditMode ? `Edit ${editingSecret.name}` : 'Create secret'

  const resetFlow = () => {
    const next = editingSecret
      ? secretFormStateFromTenantSecret(editingSecret)
      : createPrefillGeneralSecretFormState()
    setFormState(next)
    setLabelsInput(formatLabelsInput(next.labels))
  }

  const handleClose = () => {
    resetFlow()
    onClose()
  }

  const generalValid = isGeneralStepValid(formState)
  const secretDataValid = isSecretDataStepValid(formState)

  const handleTypeChange = (type: TenantSecretType) => {
    if (isEditMode) {
      setFormState((current) => applySecretTypeToForm(current, type, { keepValues: true }))
      return
    }

    const demo = createDemoSecretFormState(type)
    setFormState((current) => ({
      ...demo,
      // Keep General step values the user already entered.
      name: current.name.trim() || demo.name,
      description: current.description.trim() || demo.description,
      labels: current.labels.length > 0 ? current.labels : demo.labels,
    }))
    setLabelsInput((current) =>
      current.trim() ? current : formatLabelsInput(demo.labels),
    )
  }

  const handleSave = () => {
    if (!formState.type) {
      return
    }

    const labels = parseLabelsInput(labelsInput)
    const pairs = formPairsToStored(formState.pairs)
    const data = buildTenantSecretData(formState.type, pairs, formState.uploadedFileName)
    const summary =
      formState.description.trim() || buildSecretSummaryFromPairs(pairs)

    if (isEditMode && editingSecret) {
      const updated: TenantSecret = {
        ...editingSecret,
        name: formState.name.trim(),
        type: formState.type,
        summary,
        description: formState.description.trim(),
        labels,
        data,
      }
      updateSecret(scope, tenantSlug, updated)
      onUpdated?.(updated)
      handleClose()
      return
    }

    const created: TenantSecret = {
      id: generateTenantSecretId(),
      name: formState.name.trim(),
      type: formState.type,
      usage,
      createdAt: new Date().toISOString(),
      summary,
      description: formState.description.trim(),
      labels,
      data,
    }
    addSecret(scope, tenantSlug, created)
    onCreated(created)
    handleClose()
  }

  const renderStepContent = (stepId: string): ReactNode => {
    if (stepId === GENERAL_STEP_ID) {
      return (
        <Form className="tenant-secrets__form">
          <Content component="p" className="tenant-secrets__step-lede">
            Name this secret and optionally add a description and labels.
          </Content>
          <FormGroup label="Name" fieldId="secret-general-name" isRequired>
            <KubernetesResourceNameField
              id="secret-general-name"
              value={formState.name}
              onChange={(value) => setFormState((current) => ({ ...current, name: value }))}
            />
          </FormGroup>
          <FormGroup label="Description" fieldId="secret-general-description">
            <TextArea
              id="secret-general-description"
              value={formState.description}
              onChange={(_event, value) =>
                setFormState((current) => ({ ...current, description: value }))
              }
              rows={3}
            />
          </FormGroup>
          <FormGroup label="Labels" fieldId="secret-general-labels">
            <TextInput
              id="secret-general-labels"
              value={labelsInput}
              placeholder="cluster-launch, production"
              onChange={(_event, value) => {
                setLabelsInput(value)
                setFormState((current) => ({
                  ...current,
                  labels: parseLabelsInput(value),
                }))
              }}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Comma-separated labels (for example: cluster-launch, production).
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </Form>
      )
    }

    if (stepId === SECRET_DATA_STEP_ID) {
      return (
        <Form className="tenant-secrets__form">
          <Content component="p" className="tenant-secrets__step-lede">
            Select a secret type, then enter or upload its key(s) and values.
          </Content>
          <FormGroup label="Secret type" fieldId="secret-data-type" isRequired>
            <div
              className="tenant-secrets__type-cards"
              role="radiogroup"
              aria-label="Secret type"
              id="secret-data-type"
            >
              {TENANT_SECRET_TYPE_OPTIONS.map((option) => {
                const isSelected = formState.type === option.id
                const titleId = `secret-type-${option.id}-title`

                return (
                  <Card
                    key={option.id}
                    isCompact
                    isSelectable={!isEditMode}
                    isSelected={isSelected}
                    className={[
                      'tenant-secrets__type-card',
                      isEditMode ? 'tenant-secrets__type-card--readonly' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-labelledby={titleId}
                    onClick={isEditMode ? undefined : () => handleTypeChange(option.id)}
                    onKeyDown={
                      isEditMode
                        ? undefined
                        : (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              handleTypeChange(option.id)
                            }
                          }
                    }
                  >
                    <CardBody className="tenant-secrets__type-card-body">
                      {isSelected ? (
                        <Label
                          color="grey"
                          isCompact
                          className="tenant-secrets__type-card-badge"
                        >
                          Selected
                        </Label>
                      ) : null}
                      <Title
                        id={titleId}
                        headingLevel="h3"
                        size="md"
                        className="tenant-secrets__type-card-title"
                      >
                        {option.label}
                      </Title>
                      <Content component="p" className="tenant-secrets__type-card-description">
                        {option.description}
                      </Content>
                    </CardBody>
                  </Card>
                )
              })}
            </div>
          </FormGroup>

          {typeOption && formState.type ? (
            <>
              {typeOption.requiredKeys.length > 0 ? (
                <FormGroup label="Required key(s)">
                  <div className="tenant-secrets__required-keys">
                    {typeOption.requiredKeys.map((key) => (
                      <Label key={key} color="blue" isCompact>
                        <code>{key}</code>
                      </Label>
                    ))}
                  </div>
                </FormGroup>
              ) : null}

              <KeyValuePairsEditor
                pairs={formState.pairs}
                type={formState.type}
                allowAddRemove={!typeOption.singlePair}
                keysLocked={typeOption.requiredKeys.length > 0}
                onChange={(pairs) => setFormState((current) => ({ ...current, pairs }))}
                onUploadedFileNameChange={(uploadedFileName) =>
                  setFormState((current) => ({ ...current, uploadedFileName }))
                }
              />
            </>
          ) : (
            <Content component="p" className="tenant-secrets__helper">
              Select a secret type to continue.
            </Content>
          )}
        </Form>
      )
    }

    if (stepId === REVIEW_STEP_ID) {
      return (
        <>
          <Content component="p" className="tenant-secrets__step-lede">
            Confirm the secret details before {isEditMode ? 'saving' : 'creating'}.
          </Content>
          <DescriptionList isCompact className="tenant-secrets__review-list">
            <DescriptionListGroup>
              <DescriptionListTerm>Name</DescriptionListTerm>
              <DescriptionListDescription>
                {formState.name.trim() || '—'}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Description</DescriptionListTerm>
              <DescriptionListDescription>
                {formState.description.trim() || '—'}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Labels</DescriptionListTerm>
              <DescriptionListDescription>
                {formState.labels.length > 0 ? (
                  <div className="tenant-secrets__required-keys">
                    {formState.labels.map((label) => (
                      <Label key={label} color="grey" isCompact>
                        {label}
                      </Label>
                    ))}
                  </div>
                ) : (
                  '—'
                )}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Type</DescriptionListTerm>
              <DescriptionListDescription>
                {formState.type ? getTenantSecretTypeLabel(formState.type) : '—'}
              </DescriptionListDescription>
            </DescriptionListGroup>
            {formState.pairs
              .filter((pair) => pair.key.trim())
              .flatMap((pair) => [
                <DescriptionListGroup
                  key={`${pair.id}-key`}
                  className="tenant-secrets__review-pair-start"
                >
                  <DescriptionListTerm>Key</DescriptionListTerm>
                  <DescriptionListDescription>{pair.key.trim()}</DescriptionListDescription>
                </DescriptionListGroup>,
                <DescriptionListGroup key={`${pair.id}-value`}>
                  <DescriptionListTerm>Value</DescriptionListTerm>
                  <DescriptionListDescription>
                    {pair.value.trim()
                      ? 'Value provided (hidden for security)'
                      : 'No value provided'}
                  </DescriptionListDescription>
                </DescriptionListGroup>,
              ])}
          </DescriptionList>
        </>
      )
    }

    return null
  }

  const getStepFooter = (stepId: string) => {
    if (stepId === GENERAL_STEP_ID) {
      return {
        isNextDisabled: !generalValid,
        nextButtonText: 'Next',
      }
    }

    if (stepId === SECRET_DATA_STEP_ID) {
      return {
        isNextDisabled: !secretDataValid,
        nextButtonText: 'Next',
      }
    }

    if (stepId === REVIEW_STEP_ID) {
      return {
        nextButtonText: isEditMode ? 'Save' : 'Create secret',
        onNext: handleSave,
        isNextDisabled: !generalValid || !secretDataValid,
      }
    }

    return undefined
  }

  return (
    <NetworkInventoryCreateWizardShell
      isOpen={isOpen}
      presentation={presentation}
      parentLabel="Secrets"
      title={wizardTitle}
      titleId="create-secret-wizard-title"
      description={
        isEditMode
          ? 'Update this secret’s general details and data.'
          : 'Add a secret in three steps: general details, secret data, then review.'
      }
      steps={WIZARD_STEPS}
      renderStepContent={renderStepContent}
      getStepFooter={getStepFooter}
      onClose={handleClose}
      className="tenant-secrets__wizard"
      leaveConfirmPrimaryActionLabel={isEditMode ? 'Discard changes' : 'Leave'}
    />
  )
}
