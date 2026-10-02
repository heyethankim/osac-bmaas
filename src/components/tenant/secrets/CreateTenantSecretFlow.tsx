import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MinusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/minus-circle-icon'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import {
  Button,
  Card,
  CardBody,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  FileUpload,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Label,
  MenuToggle,
  Radio,
  TextArea,
  TextInput,
  Title,
} from '@patternfly/react-core'
import { NetworkInventoryCreateWizardShell } from '../../networking/NetworkInventoryCreateWizardShell'
import { KubernetesResourceNameField } from '../../shared/KubernetesResourceNameHelper'
import { ProjectTreeDropdownItems } from '../../shared/ProjectTreeDropdownItems'
import { CreateTenantProjectWizard } from '../../tenant-admin/CreateTenantProjectWizard'
import { isValidKubernetesResourceName } from '../../../shared/kubernetesResourceName'
import {
  getWorkspaceStepParam,
  resolveWorkspaceWizardStartIndex,
  syncWorkspaceStepParam,
} from '../../../shared/workspaceNavUrl'
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
import { getWorkspaceOrganization } from '../../../tenantAdmin/organizations'
import {
  DEMO_TENANT_ROOT_PROJECT_ID,
  getTenantProjectById,
  getTenantRootProject,
  TENANT_PROJECTS_TEAMS_DEMO,
  type TenantProject,
} from '../../../tenantAdmin/projects'
import { addTenantProject, ensureTenantDemoProjects } from '../../../tenantAdmin/storage'
import { buildTenantUserProjectTreeRows } from '../../../tenantUser/projects'

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

function isGeneralStepValid(
  form: TenantSecretFormState,
  options?: { requireProject?: boolean },
): boolean {
  if (!isValidKubernetesResourceName(form.name)) {
    return false
  }
  if (options?.requireProject && !form.projectId.trim()) {
    return false
  }
  return true
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
  onChange,
  onUploadedFileNameChange,
}: {
  pairs: KeyValuePair[]
  type: TenantSecretType
  onChange: (pairs: KeyValuePair[]) => void
  onUploadedFileNameChange: (fileName: string) => void
}) {
  const option = getTenantSecretTypeOption(type)
  const requiredKeySet = new Set(option.requiredKeys)
  const hasRequiredKeys = option.requiredKeys.length > 0
  const requiredPairs = hasRequiredKeys
    ? option.requiredKeys.map((requiredKey) => {
        const existing = pairs.find((pair) => pair.key.trim() === requiredKey)
        return (
          existing ??
          createKeyValuePair({
            key: requiredKey,
            valueMode: option.preferUpload ? 'upload-file' : 'paste',
          })
        )
      })
    : []
  const additionalPairs = hasRequiredKeys
    ? pairs.filter((pair) => !requiredKeySet.has(pair.key.trim()))
    : pairs

  const syncPairs = (nextRequired: KeyValuePair[], nextAdditional: KeyValuePair[]) => {
    onChange(hasRequiredKeys ? [...nextRequired, ...nextAdditional] : nextAdditional)
  }

  const updatePair = (id: string, patch: Partial<KeyValuePair>) => {
    const nextRequired = requiredPairs.map((pair) =>
      pair.id === id ? { ...pair, ...patch } : pair,
    )
    const nextAdditional = additionalPairs.map((pair) =>
      pair.id === id ? { ...pair, ...patch } : pair,
    )
    syncPairs(nextRequired, nextAdditional)
  }

  const removeAdditionalPair = (id: string) => {
    if (!hasRequiredKeys && additionalPairs.length === 1) {
      onChange([createKeyValuePair()])
      return
    }
    syncPairs(
      requiredPairs,
      additionalPairs.filter((pair) => pair.id !== id),
    )
  }

  const addAdditionalPair = () => {
    syncPairs(requiredPairs, [...additionalPairs, createKeyValuePair()])
  }

  const renderValueModeRadios = (pair: KeyValuePair, ariaPrefix: string) => (
    <div className="tenant-secrets__radio-group">
      <Radio
        id={`${ariaPrefix}-mode-paste-${pair.id}`}
        name={`${ariaPrefix}-mode-${pair.id}`}
        label="Enter value"
        isChecked={pair.valueMode === 'paste'}
        onChange={() => updatePair(pair.id, { valueMode: 'paste' })}
      />
      <Radio
        id={`${ariaPrefix}-mode-upload-${pair.id}`}
        name={`${ariaPrefix}-mode-${pair.id}`}
        label="Upload file"
        isChecked={pair.valueMode === 'upload-file'}
        onChange={() => updatePair(pair.id, { valueMode: 'upload-file' })}
      />
    </div>
  )

  const renderValueInput = (pair: KeyValuePair, index: number, ariaPrefix: string) =>
    pair.valueMode === 'paste' ? (
      option.preferUpload || pair.value.includes('\n') ? (
        <TextArea
          id={`${ariaPrefix}-value-${pair.id}`}
          value={pair.value}
          onChange={(_event, value) => updatePair(pair.id, { value })}
          rows={6}
          aria-label={`${ariaPrefix} value ${index + 1}`}
        />
      ) : (
        <SecretFieldInput
          id={`${ariaPrefix}-value-${pair.id}`}
          value={pair.value}
          onChange={(_event, value) => updatePair(pair.id, { value })}
          aria-label={`${ariaPrefix} value ${index + 1}`}
        />
      )
    ) : (
      <FileUpload
        id={`${ariaPrefix}-file-${pair.id}`}
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
    )

  if (!hasRequiredKeys) {
    return (
      <div className="tenant-secrets__pair-list">
        {additionalPairs.map((pair, index) => (
          <div key={pair.id} className="tenant-secrets__pair-row">
            <FormGroup label="Key" fieldId={`secret-key-${pair.id}`} isRequired>
              <TextInput
                id={`secret-key-${pair.id}`}
                value={pair.key}
                onChange={(_event, value) => updatePair(pair.id, { key: value })}
              />
            </FormGroup>
            <FormGroup label="Value" fieldId={`secret-value-${pair.id}`} isRequired>
              {renderValueModeRadios(pair, 'secret')}
              <div className="tenant-secrets__pair-value-row">
                <div className="tenant-secrets__pair-value-control">
                  {renderValueInput(pair, index, 'secret')}
                </div>
                {additionalPairs.length > 1 ? (
                  <Button
                    variant="plain"
                    className="tenant-secrets__pair-remove"
                    icon={<MinusCircleIcon />}
                    aria-label={`Remove key/value pair ${index + 1}`}
                    onClick={() => removeAdditionalPair(pair.id)}
                  />
                ) : null}
              </div>
            </FormGroup>
          </div>
        ))}
        <Button
          variant="link"
          icon={<PlusCircleIcon />}
          className="tenant-secrets__add-row"
          onClick={addAdditionalPair}
        >
          Add key/value
        </Button>
      </div>
    )
  }

  return (
    <div className="tenant-secrets__pair-list">
      {requiredPairs.map((pair, index) => (
        <div key={pair.id} className="tenant-secrets__pair-row tenant-secrets__pair-row--required">
          <FormGroup label="Required key" fieldId={`secret-required-key-${pair.id}`} isRequired>
            <TextInput
              id={`secret-required-key-${pair.id}`}
              value={pair.key}
              isDisabled
              aria-label={`Required key ${pair.key}`}
            />
          </FormGroup>
          <FormGroup label="Value" fieldId={`secret-required-value-${pair.id}`} isRequired>
            {renderValueModeRadios(pair, 'secret-required')}
            <div className="tenant-secrets__pair-value-control">
              {renderValueInput(pair, index, 'secret-required')}
            </div>
          </FormGroup>
        </div>
      ))}

      <div className="tenant-secrets__additional-keys">
        <Title headingLevel="h3" size="md" className="tenant-secrets__additional-keys-title">
          Additional keys
        </Title>
        {additionalPairs.map((pair, index) => (
          <div key={pair.id} className="tenant-secrets__pair-row">
            <FormGroup label="Key" fieldId={`secret-additional-key-${pair.id}`} isRequired>
              <TextInput
                id={`secret-additional-key-${pair.id}`}
                value={pair.key}
                onChange={(_event, value) => updatePair(pair.id, { key: value })}
              />
            </FormGroup>
            <FormGroup label="Value" fieldId={`secret-additional-value-${pair.id}`} isRequired>
              {renderValueModeRadios(pair, 'secret-additional')}
              <div className="tenant-secrets__pair-value-row">
                <div className="tenant-secrets__pair-value-control">
                  {renderValueInput(pair, index, 'secret-additional')}
                </div>
                <Button
                  variant="plain"
                  className="tenant-secrets__pair-remove"
                  icon={<MinusCircleIcon />}
                  aria-label={`Remove additional key/value pair ${index + 1}`}
                  onClick={() => removeAdditionalPair(pair.id)}
                />
              </div>
            </FormGroup>
          </div>
        ))}
        <Button
          variant="link"
          icon={<PlusCircleIcon />}
          className="tenant-secrets__add-row"
          onClick={addAdditionalPair}
        >
          Add key
        </Button>
      </div>
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
  const [searchParams, setSearchParams] = useSearchParams()
  const isEditMode = editingSecret !== null
  const syncStepToUrl = !isEditMode && presentation === 'page'
  const showProjectSelector = scope === 'tenant'
  const [projects, setProjects] = useState<TenantProject[]>(() =>
    showProjectSelector && tenantSlug ? ensureTenantDemoProjects(tenantSlug) : [],
  )
  const organization = useMemo(
    () => (showProjectSelector && tenantSlug ? getWorkspaceOrganization(tenantSlug) : null),
    [showProjectSelector, tenantSlug],
  )
  const defaultProjectId = useMemo(() => {
    if (!showProjectSelector || projects.length === 0) {
      return ''
    }
    return getTenantRootProject(projects)?.id ?? projects[0]?.id ?? DEMO_TENANT_ROOT_PROJECT_ID
  }, [projects, showProjectSelector])

  const [formState, setFormState] = useState<TenantSecretFormState>(() => {
    if (editingSecret) {
      const fromSecret = secretFormStateFromTenantSecret(editingSecret)
      if (showProjectSelector && !fromSecret.projectId) {
        return { ...fromSecret, projectId: defaultProjectId }
      }
      return fromSecret
    }
    const prefill = createPrefillGeneralSecretFormState()
    return showProjectSelector ? { ...prefill, projectId: defaultProjectId } : prefill
  })
  const [labelsInput, setLabelsInput] = useState(() =>
    formatLabelsInput(
      editingSecret ? editingSecret.labels : createPrefillGeneralSecretFormState().labels,
    ),
  )
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false)
  const [isCreateProjectWizardOpen, setIsCreateProjectWizardOpen] = useState(false)

  const typeOption = formState.type ? getTenantSecretTypeOption(formState.type) : null
  const wizardTitle = isEditMode ? `Edit ${editingSecret.name}` : 'Create secret'
  const wizardStartIndex = syncStepToUrl
    ? resolveWorkspaceWizardStartIndex(WIZARD_STEPS, getWorkspaceStepParam(searchParams))
    : undefined
  const selectedProject = getTenantProjectById(projects, formState.projectId)
  const selectedProjectLabel = selectedProject?.name ?? 'Select a project'
  const projectTreeRows = useMemo(
    () => buildTenantUserProjectTreeRows(projects, projects),
    [projects],
  )
  const createProjectParent = useMemo(() => {
    if (selectedProject) {
      return selectedProject
    }
    return getTenantRootProject(projects)
  }, [projects, selectedProject])
  const canCreateProjectInline = Boolean(showProjectSelector && organization)

  const selectProject = (projectId: string) => {
    setFormState((current) => ({ ...current, projectId }))
  }

  const handleOpenCreateProject = () => {
    setIsProjectMenuOpen(false)
    if (canCreateProjectInline) {
      setIsCreateProjectWizardOpen(true)
    }
  }

  const handleInlineProjectCreated = (project: TenantProject) => {
    if (tenantSlug) {
      addTenantProject(tenantSlug, project)
    }
    setProjects((current) => [...current, project])
    selectProject(project.id)
    setIsCreateProjectWizardOpen(false)
  }

  useEffect(() => {
    if (!showProjectSelector || !tenantSlug) {
      setProjects([])
      return
    }
    setProjects(ensureTenantDemoProjects(tenantSlug))
  }, [showProjectSelector, tenantSlug])

  useEffect(() => {
    if (!showProjectSelector || !defaultProjectId) {
      return
    }
    setFormState((current) => {
      if (current.projectId && projects.some((project) => project.id === current.projectId)) {
        return current
      }
      return { ...current, projectId: defaultProjectId }
    })
  }, [defaultProjectId, projects, showProjectSelector])

  useEffect(() => {
    if (!syncStepToUrl || !isOpen) {
      return
    }

    const stepFromUrl = getWorkspaceStepParam(searchParams)
    const isValidStep = Boolean(
      stepFromUrl && WIZARD_STEPS.some((step) => step.id === stepFromUrl),
    )
    if (isValidStep) {
      return
    }

    const firstStepId = WIZARD_STEPS[0]?.id
    if (firstStepId) {
      syncWorkspaceStepParam(setSearchParams, firstStepId, { replace: true })
    }
  }, [isOpen, searchParams, setSearchParams, syncStepToUrl])

  const resetFlow = () => {
    const next = editingSecret
      ? secretFormStateFromTenantSecret(editingSecret)
      : createPrefillGeneralSecretFormState()
    const withProject =
      showProjectSelector && !next.projectId
        ? { ...next, projectId: defaultProjectId }
        : next
    setFormState(withProject)
    setLabelsInput(formatLabelsInput(withProject.labels))
  }

  const handleClose = () => {
    resetFlow()
    onClose()
  }

  const generalValid = isGeneralStepValid(formState, {
    requireProject: showProjectSelector && projects.length > 0,
  })
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
      projectId: current.projectId || defaultProjectId,
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
    const projectId = showProjectSelector ? formState.projectId.trim() || null : null

    if (isEditMode && editingSecret) {
      const updated: TenantSecret = {
        ...editingSecret,
        name: formState.name.trim(),
        type: formState.type,
        summary,
        description: formState.description.trim(),
        labels,
        data,
        projectId,
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
      projectId,
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
            {showProjectSelector
              ? 'Choose a project, name this secret, and optionally add a description and labels.'
              : 'Name this secret and optionally add a description and labels.'}
          </Content>
          {showProjectSelector ? (
            <FormGroup
              label="Project"
              fieldId="secret-general-project"
              isRequired={projects.length > 0}
            >
              <div className="tenant-user-launch-wizard__project-control">
                <Dropdown
                  isOpen={isProjectMenuOpen}
                  onOpenChange={setIsProjectMenuOpen}
                  onSelect={(_event, value) => {
                    if (value == null) {
                      return
                    }
                    selectProject(String(value))
                    setIsProjectMenuOpen(false)
                  }}
                  toggle={(toggleRef) => (
                    <MenuToggle
                      ref={toggleRef}
                      id="secret-general-project"
                      isExpanded={isProjectMenuOpen}
                      onClick={() => setIsProjectMenuOpen((open) => !open)}
                      className="bmaas-dropdown-toggle tenant-user-launch-wizard__project-toggle"
                      aria-label={`Project: ${selectedProjectLabel}`}
                      isDisabled={projects.length === 0 && !canCreateProjectInline}
                    >
                      {selectedProjectLabel}
                    </MenuToggle>
                  )}
                >
                  <DropdownList>
                    <ProjectTreeDropdownItems
                      projects={projects}
                      treeRows={projectTreeRows}
                      selectedProjectId={formState.projectId || null}
                    />
                    {canCreateProjectInline ? (
                      <>
                        {projects.length > 0 ? (
                          <Divider component="li" key="create-project-separator" />
                        ) : null}
                        <DropdownItem icon={<PlusIcon />} onClick={handleOpenCreateProject}>
                          {TENANT_PROJECTS_TEAMS_DEMO.createProjectLabel}
                        </DropdownItem>
                      </>
                    ) : null}
                  </DropdownList>
                </Dropdown>
              </div>
              {projects.length === 0 ? (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      Create a project on the Projects page before adding a secret.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              ) : null}
            </FormGroup>
          ) : null}
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
            <KeyValuePairsEditor
              pairs={formState.pairs}
              type={formState.type}
              onChange={(pairs) => setFormState((current) => ({ ...current, pairs }))}
              onUploadedFileNameChange={(uploadedFileName) =>
                setFormState((current) => ({ ...current, uploadedFileName }))
              }
            />
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
            {showProjectSelector ? (
              <DescriptionListGroup>
                <DescriptionListTerm>Project</DescriptionListTerm>
                <DescriptionListDescription>
                  {selectedProject?.name || formState.projectId.trim() || '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
            ) : null}
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
    <>
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
        startIndex={wizardStartIndex}
        onStepChange={
          syncStepToUrl
            ? (stepId) => syncWorkspaceStepParam(setSearchParams, stepId, { replace: true })
            : undefined
        }
      />
      {canCreateProjectInline && organization ? (
        <CreateTenantProjectWizard
          isOpen={isCreateProjectWizardOpen}
          presentation="modal"
          organization={organization}
          projects={projects}
          parentProject={createProjectParent}
          allowParentSelection
          onClose={() => setIsCreateProjectWizardOpen(false)}
          onCreate={handleInlineProjectCreated}
        />
      ) : null}
    </>
  )
}
