import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-left-icon'
import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import { CheckIcon } from '@patternfly/react-icons/dist/esm/icons/check-icon'
import { EnvelopeIcon } from '@patternfly/react-icons/dist/esm/icons/envelope-icon'
import { TimesIcon } from '@patternfly/react-icons/dist/esm/icons/times-icon'
import { UserPlusIcon } from '@patternfly/react-icons/dist/esm/icons/user-plus-icon'
import { UsersIcon } from '@patternfly/react-icons/dist/esm/icons/users-icon'
import {
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  Modal,
  ModalVariant,
  HelperText,
  HelperTextItem,
  Slider,
  type SliderOnChangeEvent,
  TextArea,
  TextInput,
  Wizard,
  WizardHeader,
  WizardStep,
} from '@patternfly/react-core'
import { KubernetesResourceNameField } from '../shared/KubernetesResourceNameHelper'
import { ResourceCreatePageShell } from '../shared/ResourceCreatePageShell'
import { useWizardLeaveConfirm } from '../shared/useWizardLeaveConfirm'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import {
  CREATE_PROJECT_WIZARD_DEMO,
  CREATE_PROJECT_WIZARD_STEPS,
  DEFAULT_CREATE_PROJECT_WIZARD_FORM,
  formFromTenantProject,
  generateProjectWizardMemberId,
  getProjectMemberInitials,
  getTenantProjectMemberRoleShortLabel,
  isProjectMemberEmailValid,
  TENANT_PROJECT_MEMBER_ROLES,
  type CreateProjectWizardForm,
  type CreateProjectWizardStepId,
  type TenantProjectWizardMember,
} from '../../tenantAdmin/createProjectWizard'
import {
  generateTenantProjectId,
  generateUniqueTenantProjectName,
  getAvailableInstanceQuotaForProject,
  getEffectiveProjectMembers,
  getTenantProjectById,
  resolveOrganizationExternalIpPool,
  resolveOrganizationExternalIpPools,
  TENANT_PROJECTS_TEAMS_DEMO,
  type TenantProject,
} from '../../tenantAdmin/projects'
import { isValidKubernetesResourceName } from '../../shared/kubernetesResourceName'
import { CatalogEditChangesSummary } from '../provider-admin/CatalogEditChangesSummary'
import {
  buildProjectEditSnapshotFromForm,
  buildProjectEditSnapshotFromProject,
  getProjectEditChanges,
  getProjectEditModifiedStepIds,
} from '../../tenantAdmin/projectEditDiff'

type CreateTenantProjectWizardProps = {
  isOpen: boolean
  /** `page` replaces the projects landing (breadcrumb back). Default `modal`. */
  presentation?: 'modal' | 'page'
  organization: RegisteredOrganization
  projects?: readonly TenantProject[]
  parentProject?: TenantProject | null
  breadcrumbAncestors?: Array<{ label: string; onClick?: () => void }>
  onOpenParentProject?: (project: TenantProject) => void
  onClose: () => void
  onCreate: (project: TenantProject) => void
  editingProject?: TenantProject | null
  onUpdate?: (project: TenantProject) => void
}

export function CreateTenantProjectWizard({
  isOpen,
  presentation = 'modal',
  organization,
  projects = [],
  parentProject = null,
  breadcrumbAncestors,
  onOpenParentProject,
  onClose,
  onCreate,
  editingProject = null,
  onUpdate,
}: CreateTenantProjectWizardProps) {
  const [form, setForm] = useState<CreateProjectWizardForm>(() =>
    editingProject ? formFromTenantProject(editingProject) : DEFAULT_CREATE_PROJECT_WIZARD_FORM,
  )
  const isEditMode = editingProject !== null

  const resolvedParentProject = useMemo(() => {
    if (isEditMode && editingProject?.parentProjectId) {
      return getTenantProjectById(projects, editingProject.parentProjectId)
    }
    return parentProject
  }, [editingProject, isEditMode, parentProject, projects])

  const maxInstanceQuota = useMemo(
    () =>
      getAvailableInstanceQuotaForProject(
        projects,
        organization,
        resolvedParentProject,
        editingProject?.id,
      ),
    [editingProject?.id, organization, projects, resolvedParentProject],
  )

  const inheritedMembers = useMemo(() => {
    if (!resolvedParentProject) {
      return []
    }
    return getEffectiveProjectMembers(projects, resolvedParentProject)
  }, [projects, resolvedParentProject])

  const instanceQuotaMin = maxInstanceQuota > 0 ? 1 : 0
  const instanceQuotaMax = Math.max(1, maxInstanceQuota)

  const handleInstanceQuotaChange = (
    _event: SliderOnChangeEvent,
    value: number,
    inputValue?: number,
  ) => {
    const next = inputValue === undefined ? Math.round(value) : Math.round(inputValue)
    const clamped = Math.min(instanceQuotaMax, Math.max(instanceQuotaMin, next))

    setForm((current) => ({
      ...current,
      instanceQuota: clamped,
    }))
  }

  const instanceQuotaRangeLabel =
    maxInstanceQuota < 1
      ? resolvedParentProject
        ? `No instance quota available from ${resolvedParentProject.name}.`
        : 'No instance quota available.'
      : instanceQuotaMin === instanceQuotaMax
        ? `${instanceQuotaMax} instance${instanceQuotaMax === 1 ? '' : 's'} available`
        : `${instanceQuotaMin}–${instanceQuotaMax} instances available`

  const organizationPools = useMemo(
    () => resolveOrganizationExternalIpPools(organization),
    [organization],
  )
  const organizationPool = useMemo(() => {
    return (
      organizationPools.find((pool) => pool.id === form.externalIpPoolId) ??
      organizationPools[0] ??
      null
    )
  }, [organizationPools, form.externalIpPoolId])

  const editBaseline = useMemo(() => {
    if (!isEditMode || !editingProject || !isOpen) {
      return null
    }

    return buildProjectEditSnapshotFromProject(
      editingProject,
      organization,
      resolvedParentProject?.name ?? null,
    )
  }, [editingProject, isEditMode, isOpen, organization, resolvedParentProject?.name])

  const currentEditSnapshot = useMemo(() => {
    if (!isEditMode) {
      return null
    }

    return buildProjectEditSnapshotFromForm(
      form,
      organization,
      resolvedParentProject?.name ?? null,
    )
  }, [form, isEditMode, organization, resolvedParentProject?.name])

  const editChanges = useMemo(() => {
    if (!editBaseline || !currentEditSnapshot) {
      return []
    }

    return getProjectEditChanges(editBaseline, currentEditSnapshot)
  }, [currentEditSnapshot, editBaseline])

  const modifiedStepIds = useMemo(
    () => getProjectEditModifiedStepIds(editChanges),
    [editChanges],
  )

  const canSaveProjectEdit = !isEditMode || editChanges.length > 0

  const resetWizard = () => {
    const defaultPool = resolveOrganizationExternalIpPool(organization)
    const defaultQuota = Math.max(
      1,
      Math.min(DEFAULT_CREATE_PROJECT_WIZARD_FORM.instanceQuota, maxInstanceQuota),
    )
    setForm({
      ...DEFAULT_CREATE_PROJECT_WIZARD_FORM,
      name: generateUniqueTenantProjectName(projects, parentProject),
      environmentType:
        parentProject?.environmentType ?? DEFAULT_CREATE_PROJECT_WIZARD_FORM.environmentType,
      instanceQuota: defaultQuota,
      externalIpPoolId: defaultPool?.id ?? organizationPools[0]?.id ?? '',
    })
  }

  const resetEditWizard = () => {
    if (!editingProject) {
      return
    }

    setForm(formFromTenantProject(editingProject))
  }

  const handleClose = () => {
    if (isEditMode) {
      resetEditWizard()
    } else {
      resetWizard()
    }
    onClose()
  }

  const { requestClose, leaveConfirmModal, wrapStepFooter } = useWizardLeaveConfirm({
    onLeave: handleClose,
    primaryActionLabel: isEditMode ? 'Discard changes' : 'Leave',
    titleId: 'create-tenant-project-leave-confirm',
  })

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (editingProject) {
      resetEditWizard()
      return
    }

    resetWizard()
  }, [editingProject, isOpen, maxInstanceQuota, parentProject?.id, projects])

  const handleCreateProject = () => {
    if (!isValidKubernetesResourceName(form.name)) {
      return
    }

    if (form.instanceQuota < 1 || form.instanceQuota > maxInstanceQuota) {
      return
    }

    onCreate({
      id: generateTenantProjectId(),
      name: form.name.trim(),
      description: form.description.trim(),
      environmentType: form.environmentType,
      instanceQuota: form.instanceQuota,
      externalIpPoolId: organizationPool?.id ?? null,
      externalIpPoolName: organizationPool?.name ?? null,
      externalIpPoolCidr: form.ipPoolSlice.trim(),
      catalogItems: [],
      members: form.members.map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
      })),
      parentProjectId: parentProject?.id ?? null,
      createdAt: new Date().toISOString(),
    })
    handleClose()
  }

  const handleUpdateProject = () => {
    if (!editingProject || !isValidKubernetesResourceName(form.name) || !canSaveProjectEdit) {
      return
    }

    if (form.instanceQuota < 1 || form.instanceQuota > maxInstanceQuota) {
      return
    }

    onUpdate?.({
      ...editingProject,
      name: form.name.trim(),
      description: form.description.trim(),
      environmentType: form.environmentType,
      instanceQuota: form.instanceQuota,
      externalIpPoolId: organizationPool?.id ?? null,
      externalIpPoolName: organizationPool?.name ?? null,
      externalIpPoolCidr: form.ipPoolSlice.trim(),
      members: form.members.map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
      })),
    })
    handleClose()
  }

  const handleAddMember = () => {
    if (!form.memberName.trim() || !isProjectMemberEmailValid(form.memberEmail)) {
      return
    }

    const member: TenantProjectWizardMember = {
      id: generateProjectWizardMemberId(),
      name: form.memberName.trim(),
      email: form.memberEmail.trim(),
      role: form.memberRole,
    }

    setForm((current) => ({
      ...current,
      members: [...current.members, member],
      memberName: '',
      memberEmail: '',
      memberRole: 'manager',
    }))
  }

  const handleRemoveMember = (memberId: string) => {
    setForm((current) => ({
      ...current,
      members: current.members.filter((member) => member.id !== memberId),
    }))
  }

  const renderProjectInfoStep = () => (
    <Form autoComplete="off" className="tenant-admin-projects-teams__wizard-form">
      {resolvedParentProject ? (
        <FormGroup label={CREATE_PROJECT_WIZARD_DEMO.parentProjectLabel} fieldId="new-project-parent">
          <TextInput
            id="new-project-parent"
            className="tenant-admin-projects-teams__wizard-parent-field"
            value={resolvedParentProject.name}
            readOnly
            readOnlyVariant="default"
            aria-readonly="true"
          />
        </FormGroup>
      ) : null}
      <FormGroup label="Project name" fieldId="new-project-name" isRequired>
        <KubernetesResourceNameField
          id="new-project-name"
          value={form.name}
          onChange={(value) => setForm((current) => ({ ...current, name: value }))}
          placeholder={CREATE_PROJECT_WIZARD_DEMO.projectNamePlaceholder}
          isRequired
        />
      </FormGroup>
      <FormGroup label="Description" fieldId="new-project-description">
        <TextArea
          id="new-project-description"
          value={form.description}
          onChange={(_event, value) => setForm((current) => ({ ...current, description: value }))}
          placeholder={CREATE_PROJECT_WIZARD_DEMO.descriptionPlaceholder}
          resizeOrientation="vertical"
        />
      </FormGroup>
      <FormGroup label="Instance quota" fieldId="new-project-instance-quota">
        {maxInstanceQuota < 1 ? (
          <Content component="p" className="tenant-admin-projects-teams__wizard-quota-empty">
            {instanceQuotaRangeLabel}
          </Content>
        ) : (
          <>
            <Slider
              id="new-project-instance-quota"
              className="tenant-admin-projects-teams__wizard-slider"
              value={form.instanceQuota}
              inputValue={form.instanceQuota}
              onChange={handleInstanceQuotaChange}
              min={instanceQuotaMin}
              max={instanceQuotaMax}
              step={1}
              showBoundaries={false}
              isInputVisible
              inputAriaLabel="Instance quota"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>{instanceQuotaRangeLabel}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </>
        )}
      </FormGroup>
      {organizationPools.length > 1 ? (
        <FormGroup label="External IP pool" fieldId="new-project-external-ip-pool" isRequired>
          <FormSelect
            id="new-project-external-ip-pool"
            value={form.externalIpPoolId}
            onChange={(_event, value) =>
              setForm((current) => ({ ...current, externalIpPoolId: value }))
            }
            aria-label="External IP pool"
          >
            {organizationPools.map((pool) => (
              <FormSelectOption
                key={pool.id}
                value={pool.id}
                label={`${pool.name} · ${pool.cidr}`}
              />
            ))}
          </FormSelect>
        </FormGroup>
      ) : null}
    </Form>
  )

  const renderTeamMembersStep = () => (
    <div className="tenant-admin-projects-teams__wizard-members">
      {resolvedParentProject && inheritedMembers.length > 0 ? (
        <Content component="p" className="tenant-admin-projects-teams__wizard-inherit-note">
          {TENANT_PROJECTS_TEAMS_DEMO.inheritedMembersHelp} {inheritedMembers.length} member
          {inheritedMembers.length === 1 ? '' : 's'} inherit access from {resolvedParentProject.name}.
        </Content>
      ) : null}
      <Form autoComplete="off" className="tenant-admin-projects-teams__wizard-form">
        <Flex
          alignItems={{ default: 'alignItemsFlexEnd' }}
          gap={{ default: 'gapMd' }}
          className="tenant-admin-projects-teams__wizard-member-form"
        >
          <FlexItem grow={{ default: 'grow' }}>
            <FormGroup label="Full name" fieldId="new-project-member-name">
              <TextInput
                id="new-project-member-name"
                value={form.memberName}
                onChange={(_event, value) =>
                  setForm((current) => ({ ...current, memberName: value }))
                }
                placeholder={CREATE_PROJECT_WIZARD_DEMO.memberNamePlaceholder}
              />
            </FormGroup>
          </FlexItem>
          <FlexItem grow={{ default: 'grow' }}>
            <FormGroup label="Email" fieldId="new-project-member-email">
              <TextInput
                id="new-project-member-email"
                type="email"
                value={form.memberEmail}
                onChange={(_event, value) =>
                  setForm((current) => ({ ...current, memberEmail: value }))
                }
                placeholder={CREATE_PROJECT_WIZARD_DEMO.memberEmailPlaceholder}
              />
            </FormGroup>
          </FlexItem>
        </Flex>
        <Flex alignItems={{ default: 'alignItemsFlexEnd' }} gap={{ default: 'gapMd' }}>
          <FlexItem grow={{ default: 'grow' }}>
            <FormGroup label="Role" fieldId="new-project-member-role">
              <FormSelect
                id="new-project-member-role"
                value={form.memberRole}
                onChange={(_event, value) =>
                  setForm((current) => ({
                    ...current,
                    memberRole: value as CreateProjectWizardForm['memberRole'],
                  }))
                }
                aria-label="Project member role"
              >
                {TENANT_PROJECT_MEMBER_ROLES.map((role) => (
                  <FormSelectOption key={role.id} value={role.id} label={role.label} />
                ))}
              </FormSelect>
            </FormGroup>
          </FlexItem>
          <FlexItem>
            <Button
              variant="primary"
              icon={<UserPlusIcon />}
              onClick={handleAddMember}
              isDisabled={
                !form.memberName.trim() || !isProjectMemberEmailValid(form.memberEmail)
              }
            >
              {CREATE_PROJECT_WIZARD_DEMO.addMemberLabel}
            </Button>
          </FlexItem>
        </Flex>
      </Form>

      {form.members.length > 0 ? (
        <div className="tenant-admin-projects-teams__wizard-member-list">
          {form.members.map((member) => (
            <Flex
              key={member.id}
              alignItems={{ default: 'alignItemsCenter' }}
              justifyContent={{ default: 'justifyContentSpaceBetween' }}
              gap={{ default: 'gapMd' }}
              className="tenant-admin-projects-teams__wizard-member-row"
            >
              <FlexItem grow={{ default: 'grow' }} className="tenant-admin-projects-teams__wizard-member-main">
                <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapMd' }}>
                  <FlexItem>
                    <span className="tenant-admin-projects-teams__wizard-member-avatar" aria-hidden>
                      {getProjectMemberInitials(member.name)}
                    </span>
                  </FlexItem>
                  <FlexItem className="tenant-admin-projects-teams__wizard-member-copy">
                    <span className="tenant-admin-projects-teams__wizard-member-name">
                      {member.name}
                    </span>
                    <span className="tenant-admin-projects-teams__wizard-member-email">
                      <code>{member.email}</code>
                    </span>
                  </FlexItem>
                </Flex>
              </FlexItem>
              <FlexItem className="tenant-admin-projects-teams__wizard-member-actions">
                <span className="tenant-admin-projects-teams__wizard-member-role">
                  {getTenantProjectMemberRoleShortLabel(member.role)}
                </span>
                <Button
                  variant="plain"
                  icon={<TimesIcon />}
                  aria-label={`Remove ${member.name}`}
                  onClick={() => handleRemoveMember(member.id)}
                />
              </FlexItem>
            </Flex>
          ))}
        </div>
      ) : (
        <EmptyState className="tenant-admin-projects-teams__wizard-members-empty">
          <UsersIcon className="tenant-admin-projects-teams__wizard-members-empty-icon" />
          <EmptyStateBody>{CREATE_PROJECT_WIZARD_DEMO.membersEmptyTitle}</EmptyStateBody>
        </EmptyState>
      )}

      <Content component="p" className="tenant-admin-projects-teams__wizard-invite-note">
        <EnvelopeIcon aria-hidden /> {CREATE_PROJECT_WIZARD_DEMO.membersInviteNote}
      </Content>
    </div>
  )

  const renderReviewStep = () => (
    <div className="tenant-admin-projects-teams__wizard-review">
      <Content component="p" className="tenant-admin-projects-teams__wizard-review-lede">
        {isEditMode ? CREATE_PROJECT_WIZARD_DEMO.reviewEditLede : CREATE_PROJECT_WIZARD_DEMO.reviewLede}
      </Content>

      {isEditMode ? (
        <CatalogEditChangesSummary changes={editChanges} />
      ) : (
        <DescriptionList isCompact className="tenant-admin-projects-teams__wizard-review-list">
          {resolvedParentProject ? (
            <DescriptionListGroup>
              <DescriptionListTerm>Parent project</DescriptionListTerm>
              <DescriptionListDescription>{resolvedParentProject.name}</DescriptionListDescription>
            </DescriptionListGroup>
          ) : null}
          <DescriptionListGroup>
            <DescriptionListTerm>Project name</DescriptionListTerm>
            <DescriptionListDescription>
              <code>{form.name.trim() || '—'}</code>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Description</DescriptionListTerm>
            <DescriptionListDescription>
              {form.description.trim() || CREATE_PROJECT_WIZARD_DEMO.reviewNoDescription}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Instance quota</DescriptionListTerm>
            <DescriptionListDescription>
              {form.instanceQuota} instance{form.instanceQuota === 1 ? '' : 's'}
              {resolvedParentProject ? ` from ${resolvedParentProject.name}` : ''}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>External IP pool</DescriptionListTerm>
            <DescriptionListDescription>
              {organizationPool
                ? `${organizationPool.name} (${form.ipPoolSlice.trim() || organizationPool.cidr})`
                : form.ipPoolSlice.trim() || '—'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Team members</DescriptionListTerm>
            <DescriptionListDescription>
              {form.members.length === 0 ? (
                CREATE_PROJECT_WIZARD_DEMO.reviewNoMembers
              ) : (
                <ul className="tenant-admin-projects-teams__wizard-review-members">
                  {form.members.map((member) => (
                    <li key={member.id}>
                      {member.name} · {member.email} ·{' '}
                      {getTenantProjectMemberRoleShortLabel(member.role)}
                    </li>
                  ))}
                </ul>
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      )}
    </div>
  )

  const renderStepContent = (stepId: CreateProjectWizardStepId) => {
    switch (stepId) {
      case 'project-info':
        return renderProjectInfoStep()
      case 'team-members':
        return renderTeamMembersStep()
      case 'review':
        return renderReviewStep()
      default:
        return null
    }
  }

  const getStepFooter = (stepId: CreateProjectWizardStepId) => {
    if (stepId === 'project-info') {
      return wrapStepFooter({
        isNextDisabled:
          !isValidKubernetesResourceName(form.name) ||
          maxInstanceQuota < 1 ||
          form.instanceQuota < 1 ||
          form.instanceQuota > maxInstanceQuota,
        nextButtonText: (
          <span className="tenant-admin-projects-teams__wizard-footer-label">
            <span>{CREATE_PROJECT_WIZARD_DEMO.continueLabel}</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
      })
    }

    if (stepId === 'team-members') {
      return wrapStepFooter({
        isCancelHidden: true,
        backButtonText: (
          <span className="tenant-admin-projects-teams__wizard-footer-label">
            <ArrowLeftIcon aria-hidden />
            <span>Back</span>
          </span>
        ),
        nextButtonText: (
          <span className="tenant-admin-projects-teams__wizard-footer-label">
            <span>{CREATE_PROJECT_WIZARD_DEMO.continueLabel}</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
      })
    }

    return wrapStepFooter({
      isCancelHidden: true,
      backButtonText: (
        <span className="tenant-admin-projects-teams__wizard-footer-label">
          <ArrowLeftIcon aria-hidden />
          <span>Back</span>
        </span>
      ),
      nextButtonText: (
        <span className="tenant-admin-projects-teams__wizard-footer-label">
          <CheckIcon aria-hidden />
          <span>{createActionLabel}</span>
        </span>
      ),
      onNext: isEditMode ? handleUpdateProject : handleCreateProject,
      isNextDisabled: isEditMode && !canSaveProjectEdit,
    })
  }

  const createPageAncestors = useMemo(() => {
    if (isEditMode && editingProject) {
      return [
        ...(breadcrumbAncestors ?? []),
        {
          label: 'Projects',
          onClick: requestClose,
        },
        {
          label: editingProject.name,
          onClick: onOpenParentProject
            ? () => {
                onOpenParentProject(editingProject)
              }
            : undefined,
        },
      ]
    }

    if (parentProject) {
      return [
        ...(breadcrumbAncestors ?? []),
        {
          label: 'Projects',
          onClick: requestClose,
        },
        {
          label: parentProject.name,
          onClick: onOpenParentProject
            ? () => {
                onOpenParentProject(parentProject)
              }
            : undefined,
        },
      ]
    }

    return breadcrumbAncestors
  }, [breadcrumbAncestors, editingProject, isEditMode, onOpenParentProject, parentProject, requestClose])

  const wizardTitle = isEditMode
    ? CREATE_PROJECT_WIZARD_DEMO.editProjectLabel
    : parentProject
      ? CREATE_PROJECT_WIZARD_DEMO.createNestedProjectLabel
      : 'New project'
  const createActionLabel = isEditMode
    ? CREATE_PROJECT_WIZARD_DEMO.saveProjectLabel
    : parentProject
      ? CREATE_PROJECT_WIZARD_DEMO.createNestedProjectLabel
      : CREATE_PROJECT_WIZARD_DEMO.createProjectLabel
  const isPage = presentation === 'page'

  const wizard = isOpen ? (
    <Wizard
      key={editingProject?.id ?? parentProject?.id ?? 'create-tenant-project-wizard'}
      className="tenant-admin-projects-teams__wizard"
      height={isPage ? '100%' : '40rem'}
      isPlain={isPage}
      onClose={isPage ? undefined : requestClose}
      header={
        isPage ? undefined : (
          <WizardHeader
            title={wizardTitle}
            titleId="create-tenant-project-wizard-title"
            onClose={requestClose}
            closeButtonAriaLabel={
              isEditMode ? 'Close edit project wizard' : 'Close new project wizard'
            }
          />
        )
      }
    >
      {CREATE_PROJECT_WIZARD_STEPS.map((step) => (
        <WizardStep
          key={step.id}
          name={
            isEditMode && modifiedStepIds.has(step.id)
              ? `${step.label} (modified)`
              : step.label
          }
          id={`create-project-step-${step.id}`}
          footer={getStepFooter(step.id)}
        >
          {renderStepContent(step.id)}
        </WizardStep>
      ))}
    </Wizard>
  ) : null

  if (isPage) {
    if (!isOpen) {
      return null
    }
    return (
      <ResourceCreatePageShell
        ancestors={createPageAncestors}
        parentLabel={parentProject || isEditMode ? undefined : 'Projects'}
        title={wizardTitle}
        titleId="create-tenant-project-wizard-title"
        onBack={requestClose}
      >
        {wizard}
        {leaveConfirmModal}
      </ResourceCreatePageShell>
    )
  }

  return (
    <>
      <Modal
        variant={ModalVariant.medium}
        width="64rem"
        maxWidth="64rem"
        isOpen={isOpen}
        onEscapePress={requestClose}
        aria-labelledby="create-tenant-project-wizard-title"
        className="tenant-admin-projects-teams__wizard-modal"
      >
        {wizard}
      </Modal>
      {leaveConfirmModal}
    </>
  )
}
