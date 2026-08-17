import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowLeftIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-left-icon'
import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import { CheckIcon } from '@patternfly/react-icons/dist/esm/icons/check-icon'
import { CubeIcon } from '@patternfly/react-icons/dist/esm/icons/cube-icon'
import { EnvelopeIcon } from '@patternfly/react-icons/dist/esm/icons/envelope-icon'
import { FlaskIcon } from '@patternfly/react-icons/dist/esm/icons/flask-icon'
import { LayerGroupIcon } from '@patternfly/react-icons/dist/esm/icons/layer-group-icon'
import { TachometerAltIcon } from '@patternfly/react-icons/dist/esm/icons/tachometer-alt-icon'
import { TimesIcon } from '@patternfly/react-icons/dist/esm/icons/times-icon'
import { UserPlusIcon } from '@patternfly/react-icons/dist/esm/icons/user-plus-icon'
import { UsersIcon } from '@patternfly/react-icons/dist/esm/icons/users-icon'
import {
  Button,
  Card,
  CardBody,
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
  FormSelect,
  FormSelectOption,
  Modal,
  ModalVariant,
  Radio,
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
  generateProjectWizardMemberId,
  getProjectMemberInitials,
  getTenantProjectMemberRoleShortLabel,
  isProjectMemberEmailValid,
  TENANT_PROJECT_ENVIRONMENTS,
  TENANT_PROJECT_MEMBER_ROLES,
  type CreateProjectWizardForm,
  type CreateProjectWizardStepId,
  type TenantProjectEnvironment,
  type TenantProjectWizardMember,
} from '../../tenantAdmin/createProjectWizard'
import {
  generateTenantProjectId,
  resolveOrganizationExternalIpPool,
  resolveOrganizationExternalIpPools,
  type TenantProject,
} from '../../tenantAdmin/projects'
import { isValidKubernetesResourceName } from '../../shared/kubernetesResourceName'

type CreateTenantProjectWizardProps = {
  isOpen: boolean
  /** `page` replaces the projects landing (breadcrumb back). Default `modal`. */
  presentation?: 'modal' | 'page'
  organization: RegisteredOrganization
  onClose: () => void
  onCreate: (project: TenantProject) => void
}

const ENVIRONMENT_ICONS: Record<TenantProjectEnvironment, ReactNode> = {
  development: <FlaskIcon aria-hidden />,
  staging: <CubeIcon aria-hidden />,
  production: <LayerGroupIcon aria-hidden />,
  research: <TachometerAltIcon aria-hidden />,
}

export function CreateTenantProjectWizard({
  isOpen,
  presentation = 'modal',
  organization,
  onClose,
  onCreate,
}: CreateTenantProjectWizardProps) {
  const [form, setForm] = useState<CreateProjectWizardForm>(DEFAULT_CREATE_PROJECT_WIZARD_FORM)

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

  const resetWizard = () => {
    const defaultPool = resolveOrganizationExternalIpPool(organization)
    setForm({
      ...DEFAULT_CREATE_PROJECT_WIZARD_FORM,
      externalIpPoolId: defaultPool?.id ?? organizationPools[0]?.id ?? '',
    })
  }

  const handleClose = () => {
    resetWizard()
    onClose()
  }

  const { requestClose, leaveConfirmModal, wrapStepFooter } = useWizardLeaveConfirm({
    onLeave: handleClose,
    primaryActionLabel: 'Leave',
    titleId: 'create-tenant-project-leave-confirm',
  })

  useEffect(() => {
    if (isOpen) {
      resetWizard()
    }
  }, [isOpen])

  const handleCreateProject = () => {
    if (!isValidKubernetesResourceName(form.name)) {
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
      createdAt: new Date().toISOString(),
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
      memberRole: 'developer',
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
      <FormGroup label="Environment type" fieldId="new-project-environment">
        <div
          className="tenant-admin-projects-teams__environment-grid"
          role="radiogroup"
          aria-label="Environment type"
        >
          {TENANT_PROJECT_ENVIRONMENTS.map((environment) => (
            <Card
              key={environment.id}
              isCompact
              className="tenant-admin-projects-teams__environment-card"
            >
              <CardBody className="tenant-admin-projects-teams__environment-card-body">
                <Flex
                  alignItems={{ default: 'alignItemsCenter' }}
                  justifyContent={{ default: 'justifyContentSpaceBetween' }}
                  className="tenant-admin-projects-teams__environment-option"
                >
                  <FlexItem>
                    <span className="tenant-admin-projects-teams__environment-radio-label">
                      <span className="tenant-admin-projects-teams__environment-icon">
                        {ENVIRONMENT_ICONS[environment.id]}
                      </span>
                      <span className="tenant-admin-projects-teams__environment-label">
                        {environment.label}
                      </span>
                    </span>
                  </FlexItem>
                  <FlexItem>
                    <Radio
                      id={`new-project-environment-${environment.id}`}
                      name="new-project-environment"
                      isChecked={form.environmentType === environment.id}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          environmentType: environment.id,
                        }))
                      }
                      aria-label={environment.label}
                    />
                  </FlexItem>
                </Flex>
              </CardBody>
            </Card>
          ))}
        </div>
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

  const environmentLabel =
    TENANT_PROJECT_ENVIRONMENTS.find((entry) => entry.id === form.environmentType)?.label ??
    form.environmentType

  const renderReviewStep = () => (
    <div className="tenant-admin-projects-teams__wizard-review">
      <Content component="p" className="tenant-admin-projects-teams__wizard-review-lede">
        {CREATE_PROJECT_WIZARD_DEMO.reviewLede}
      </Content>

      <DescriptionList
        isHorizontal
        isCompact
        className="tenant-admin-projects-teams__wizard-review-list"
      >
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
          <DescriptionListTerm>Environment</DescriptionListTerm>
          <DescriptionListDescription>{environmentLabel}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Instance quota</DescriptionListTerm>
          <DescriptionListDescription>{form.instanceQuota}</DescriptionListDescription>
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
        isNextDisabled: !isValidKubernetesResourceName(form.name),
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
          <span>{CREATE_PROJECT_WIZARD_DEMO.createProjectLabel}</span>
        </span>
      ),
      onNext: handleCreateProject,
    })
  }

  const wizardTitle = 'New project'
  const isPage = presentation === 'page'

  const wizard = isOpen ? (
    <Wizard
      key="create-tenant-project-wizard"
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
            closeButtonAriaLabel="Close new project wizard"
          />
        )
      }
    >
      {CREATE_PROJECT_WIZARD_STEPS.map((step) => (
        <WizardStep
          key={step.id}
          name={step.label}
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
        parentLabel="Projects & teams"
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
