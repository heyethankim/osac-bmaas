import { useEffect, useMemo, useState } from 'react'
import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import { RhUiRobotIcon } from '@patternfly/react-icons/dist/esm/icons/rh-ui-robot-icon'
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  TextArea,
  TextInput,
} from '@patternfly/react-core'
import {
  buildDemoCreateServiceAccountForm,
  createTenantServiceAccount,
  isServiceAccountNameTaken,
  TENANT_SERVICE_ACCOUNTS_DEMO,
  updateTenantServiceAccount,
  validateServiceAccountName,
  type TenantServiceAccount,
} from '../../tenantAdmin/serviceAccounts'
import { DEMO_TENANT_ROOT_PROJECT_ID } from '../../tenantAdmin/projectIds'
import { getTenantProjects } from '../../tenantAdmin/storage'
import {
  NetworkInventoryCreateWizardShell,
  type NetworkInventoryCreateBreadcrumbAncestor,
} from '../networking/NetworkInventoryCreateWizardShell'
import { NETWORK_INVENTORY_CREATE_REVIEW_STEP } from '../../networking/networkInventoryCreateWizard'
import { useWorkspaceWizardStepUrl } from '../../shared/useWorkspaceWizardStepUrl'
import { KUBERNETES_RESOURCE_NAME_MAX_LENGTH } from '../../shared/kubernetesResourceName'

type CreateServiceAccountForm = {
  name: string
  description: string
  projectId: string | null
}

const CREATE_SERVICE_ACCOUNT_STEPS = [
  { id: 'details', label: 'Details' },
  NETWORK_INVENTORY_CREATE_REVIEW_STEP,
] as const

type CreateServiceAccountWizardProps = {
  isOpen: boolean
  tenantSlug: string
  mode?: 'create' | 'edit'
  editingAccount?: TenantServiceAccount | null
  onClose: () => void
  onCreated?: (account: TenantServiceAccount) => void
  onSaved?: (account: TenantServiceAccount) => void
  breadcrumbAncestors?: readonly NetworkInventoryCreateBreadcrumbAncestor[]
  parentLabel?: string
}

function formFromAccount(account: TenantServiceAccount): CreateServiceAccountForm {
  return {
    name: account.name,
    description: account.description,
    projectId: account.projectId,
  }
}

function formsEqual(left: CreateServiceAccountForm, right: CreateServiceAccountForm): boolean {
  return (
    left.name.trim().toLowerCase() === right.name.trim().toLowerCase() &&
    left.description.trim() === right.description.trim() &&
    left.projectId === right.projectId
  )
}

export function CreateServiceAccountWizard({
  isOpen,
  tenantSlug,
  mode = 'create',
  editingAccount = null,
  onClose,
  onCreated,
  onSaved,
  breadcrumbAncestors,
  parentLabel,
}: CreateServiceAccountWizardProps) {
  const isEditMode = mode === 'edit' && editingAccount !== null
  const projects = useMemo(() => getTenantProjects(tenantSlug), [tenantSlug])
  const defaultProjectId =
    projects.find((project) => project.id === DEMO_TENANT_ROOT_PROJECT_ID)?.id ??
    projects[0]?.id ??
    null
  const [form, setForm] = useState<CreateServiceAccountForm>(() =>
    isEditMode && editingAccount
      ? formFromAccount(editingAccount)
      : buildDemoCreateServiceAccountForm(tenantSlug, defaultProjectId),
  )
  const [editBaseline, setEditBaseline] = useState<CreateServiceAccountForm | null>(
    isEditMode && editingAccount ? formFromAccount(editingAccount) : null,
  )

  const selectedProject = projects.find((project) => project.id === form.projectId) ?? null
  const excludeId = isEditMode ? editingAccount?.id : undefined
  const nameError = form.name.trim() ? validateServiceAccountName(form.name) : null
  const nameTaken =
    Boolean(form.name.trim()) &&
    Boolean(form.projectId) &&
    !nameError &&
    isServiceAccountNameTaken(tenantSlug, form.name, form.projectId!, excludeId)
  const isDetailsStepValid =
    Boolean(form.name.trim()) &&
    !nameError &&
    !nameTaken &&
    Boolean(form.projectId) &&
    Boolean(selectedProject)
  const hasEditChanges = Boolean(editBaseline && !formsEqual(form, editBaseline))
  const canSubmit = isEditMode ? isDetailsStepValid && hasEditChanges : isDetailsStepValid

  const { startIndex: wizardStartIndex, onStepChange } = useWorkspaceWizardStepUrl(
    true,
    isOpen,
    CREATE_SERVICE_ACCOUNT_STEPS,
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }
    if (isEditMode && editingAccount) {
      const nextForm = formFromAccount(editingAccount)
      setForm(nextForm)
      setEditBaseline(nextForm)
      return
    }
    setForm(buildDemoCreateServiceAccountForm(tenantSlug, defaultProjectId))
    setEditBaseline(null)
  }, [defaultProjectId, editingAccount, isEditMode, isOpen, tenantSlug])

  const handleClose = () => {
    if (isEditMode && editingAccount) {
      setForm(formFromAccount(editingAccount))
      setEditBaseline(formFromAccount(editingAccount))
    } else {
      setForm(buildDemoCreateServiceAccountForm(tenantSlug, defaultProjectId))
      setEditBaseline(null)
    }
    onClose()
  }

  const handleCreate = () => {
    if (!selectedProject || !isDetailsStepValid) {
      return
    }

    const created = createTenantServiceAccount(tenantSlug, {
      name: form.name,
      description: form.description,
      projectId: selectedProject.id,
      projectName: selectedProject.name,
    })
    if (!created) {
      return
    }

    onCreated?.(created)
    handleClose()
  }

  const handleSave = () => {
    if (!isEditMode || !editingAccount || !selectedProject || !canSubmit) {
      return
    }

    const updated = updateTenantServiceAccount(tenantSlug, editingAccount.id, {
      name: form.name,
      description: form.description,
      projectId: selectedProject.id,
      projectName: selectedProject.name,
    })
    if (!updated) {
      return
    }

    onSaved?.(updated)
    handleClose()
  }

  function renderStepContent(stepId: string) {
    if (stepId === 'details') {
      return (
        <div className="tenant-admin-service-accounts__wizard-step">
          <Form autoComplete="off" className="tenant-admin-service-accounts__wizard-form">
            <FormGroup label="Name" fieldId="create-service-account-name" isRequired>
              <TextInput
                id="create-service-account-name"
                value={form.name}
                validated={nameError || nameTaken ? 'error' : 'default'}
                onChange={(_event, value) => setForm((current) => ({ ...current, name: value }))}
                placeholder="e.g. jenkins-deployer"
                maxLength={KUBERNETES_RESOURCE_NAME_MAX_LENGTH}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant={nameError || nameTaken ? 'error' : 'default'}>
                    {nameTaken
                      ? 'Name already used in this project.'
                      : nameError
                        ? nameError
                        : 'Lowercase letters, numbers, and hyphens.'}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
            <FormGroup label="Project" fieldId="create-service-account-project" isRequired>
              <FormSelect
                id="create-service-account-project"
                value={form.projectId ?? ''}
                onChange={(_event, value) => {
                  const nextProjectId = value || null
                  setForm((current) => {
                    if (
                      !isEditMode &&
                      nextProjectId &&
                      isServiceAccountNameTaken(tenantSlug, current.name, nextProjectId)
                    ) {
                      return buildDemoCreateServiceAccountForm(tenantSlug, nextProjectId)
                    }
                    return { ...current, projectId: nextProjectId }
                  })
                }}
                aria-label="Project"
              >
                <FormSelectOption value="" label="Select a project" isDisabled />
                {projects.map((project) => (
                  <FormSelectOption
                    key={project.id}
                    value={project.id}
                    label={project.name}
                  />
                ))}
              </FormSelect>
            </FormGroup>
            <FormGroup label="Description" fieldId="create-service-account-description">
              <TextArea
                id="create-service-account-description"
                value={form.description}
                onChange={(_event, value) =>
                  setForm((current) => ({ ...current, description: value }))
                }
                placeholder="Optional"
                rows={3}
                resizeOrientation="vertical"
              />
            </FormGroup>
          </Form>
        </div>
      )
    }

    return (
      <DescriptionList isCompact className="tenant-admin-service-accounts__wizard-review">
        <DescriptionListGroup>
          <DescriptionListTerm>Name</DescriptionListTerm>
          <DescriptionListDescription>
            <code>{form.name.trim().toLowerCase() || '—'}</code>
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Project</DescriptionListTerm>
          <DescriptionListDescription>
            {selectedProject?.name ?? '—'}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Description</DescriptionListTerm>
          <DescriptionListDescription>
            {form.description.trim() || '—'}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    )
  }

  function getStepFooter(stepId: string) {
    if (stepId === 'details') {
      return { isNextDisabled: !isDetailsStepValid }
    }

    if (stepId === 'review') {
      return {
        nextButtonText: (
          <span className="tenant-admin-service-accounts__wizard-footer-label">
            <RhUiRobotIcon aria-hidden />
            <span>{isEditMode ? 'Save changes' : TENANT_SERVICE_ACCOUNTS_DEMO.createLabel}</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
        onNext: isEditMode ? handleSave : handleCreate,
        isNextDisabled: !canSubmit,
      }
    }

    return undefined
  }

  return (
    <NetworkInventoryCreateWizardShell
      isOpen={isOpen}
      ancestors={breadcrumbAncestors}
      parentLabel={
        parentLabel ??
        (breadcrumbAncestors?.length ? undefined : TENANT_SERVICE_ACCOUNTS_DEMO.title)
      }
      title={isEditMode ? 'Edit service account' : TENANT_SERVICE_ACCOUNTS_DEMO.createLabel}
      titleId="create-service-account-wizard-title"
      description={
        isEditMode ? 'Update this account for a project.' : 'Add an account for a project.'
      }
      steps={CREATE_SERVICE_ACCOUNT_STEPS}
      renderStepContent={renderStepContent}
      getStepFooter={getStepFooter}
      onClose={handleClose}
      leaveConfirmPrimaryActionLabel={isEditMode ? 'Discard changes' : 'Leave'}
      className="tenant-admin-service-accounts__wizard"
      startIndex={wizardStartIndex}
      onStepChange={onStepChange}
    />
  )
}
