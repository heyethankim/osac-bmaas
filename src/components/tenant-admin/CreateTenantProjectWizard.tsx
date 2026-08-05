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
  Checkbox,
  Content,
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
import { KubernetesResourceNameHelper } from '../shared/KubernetesResourceNameHelper'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import type { AttachableCatalogOption } from '../../tenantAdmin/catalogItems'
import { getTenantCatalogGovernanceSpecSummary, TENANT_CATALOG_GOVERNANCE_ITEMS } from '../../tenantAdmin/catalogManager'
import {
  CREATE_PROJECT_WIZARD_DEMO,
  CREATE_PROJECT_WIZARD_STEPS,
  DEFAULT_CREATE_PROJECT_WIZARD_FORM,
  generateProjectWizardMemberId,
  getProjectMemberInitials,
  getTenantProjectMemberRoleShortLabel,
  isCatalogItemSelected,
  isProjectMemberEmailValid,
  toggleWizardCatalogItemSelection,
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
  type TenantProject,
} from '../../tenantAdmin/projects'
import { isValidKubernetesResourceName } from '../../shared/kubernetesResourceName'

type CreateTenantProjectWizardProps = {
  isOpen: boolean
  organization: RegisteredOrganization
  catalogOptions: AttachableCatalogOption[]
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
  organization,
  catalogOptions,
  onClose,
  onCreate,
}: CreateTenantProjectWizardProps) {
  const [form, setForm] = useState<CreateProjectWizardForm>(DEFAULT_CREATE_PROJECT_WIZARD_FORM)

  const organizationPool = useMemo(
    () => resolveOrganizationExternalIpPool(organization),
    [organization],
  )

  const resetWizard = () => {
    setForm(DEFAULT_CREATE_PROJECT_WIZARD_FORM)
  }

  const handleClose = () => {
    resetWizard()
    onClose()
  }

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
      instanceQuota: form.instanceQuota,
      externalIpPoolId: organizationPool?.id ?? null,
      externalIpPoolName: organizationPool?.name ?? null,
      externalIpPoolCidr: form.ipPoolSlice.trim(),
      catalogItems: form.catalogItems,
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
        <TextInput
          id="new-project-name"
          value={form.name}
          validated={
            form.name.trim() && !isValidKubernetesResourceName(form.name) ? 'error' : 'default'
          }
          onChange={(_event, value) => setForm((current) => ({ ...current, name: value }))}
          placeholder={CREATE_PROJECT_WIZARD_DEMO.projectNamePlaceholder}
        />
        <KubernetesResourceNameHelper value={form.name} id="new-project-name-helper" />
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
                        setForm((current) => ({ ...current, environmentType: environment.id }))
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
    </Form>
  )

  const renderCatalogStep = () => (
    <div className="tenant-admin-projects-teams__wizard-catalog">
      <Content component="p" className="tenant-admin-projects-teams__wizard-catalog-lede">
        {CREATE_PROJECT_WIZARD_DEMO.catalogLede}
      </Content>

      {catalogOptions.length === 0 ? (
        <EmptyState className="tenant-admin-projects-teams__wizard-catalog-empty">
          <EmptyStateBody>{CREATE_PROJECT_WIZARD_DEMO.catalogEmptyTitle}</EmptyStateBody>
        </EmptyState>
      ) : (
        <div
          className="tenant-admin-projects-teams__catalog-grid"
          role="group"
          aria-label="Catalog items"
        >
          {catalogOptions.map((option) => {
            const governanceItem = TENANT_CATALOG_GOVERNANCE_ITEMS.find(
              (item) => item.id === option.id,
            )

            return (
              <Card
                key={option.id}
                isCompact
                className="tenant-admin-projects-teams__catalog-card"
              >
                <CardBody className="tenant-admin-projects-teams__catalog-card-body">
                  <Flex
                    alignItems={{ default: 'alignItemsCenter' }}
                    justifyContent={{ default: 'justifyContentSpaceBetween' }}
                    className="tenant-admin-projects-teams__catalog-option"
                  >
                    <FlexItem>
                      <span className="tenant-admin-projects-teams__catalog-radio-label">
                        <span className="tenant-admin-projects-teams__catalog-title">
                          {option.displayName}
                        </span>
                        <span className="tenant-admin-projects-teams__catalog-badge">
                          {option.sourceLabel}
                        </span>
                        {governanceItem ? (
                          <span className="tenant-admin-projects-teams__catalog-specs">
                            {getTenantCatalogGovernanceSpecSummary(governanceItem)}
                          </span>
                        ) : null}
                      </span>
                    </FlexItem>
                    <FlexItem>
                      <Checkbox
                        id={`new-project-catalog-${option.id}`}
                        isChecked={isCatalogItemSelected(form.catalogItems, option.id)}
                        onChange={(_event, isChecked) =>
                          setForm((current) => ({
                            ...current,
                            catalogItems: toggleWizardCatalogItemSelection(
                              current.catalogItems,
                              { id: option.id, displayName: option.displayName },
                              isChecked,
                            ),
                          }))
                        }
                        aria-label={option.displayName}
                      />
                    </FlexItem>
                  </Flex>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </div>
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

  const renderStepContent = (stepId: CreateProjectWizardStepId) => {
    switch (stepId) {
      case 'project-info':
        return renderProjectInfoStep()
      case 'catalog':
        return renderCatalogStep()
      case 'team-members':
        return renderTeamMembersStep()
      default:
        return null
    }
  }

  const getStepFooter = (stepId: CreateProjectWizardStepId) => {
    if (stepId === 'project-info') {
      return {
        isNextDisabled: !isValidKubernetesResourceName(form.name),
        nextButtonText: (
          <span className="tenant-admin-projects-teams__wizard-footer-label">
            <span>{CREATE_PROJECT_WIZARD_DEMO.continueLabel}</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
      }
    }

    if (stepId === 'catalog') {
      return {
        isCancelHidden: true,
        backButtonText: (
          <span className="tenant-admin-projects-teams__wizard-footer-label">
            <ArrowLeftIcon aria-hidden />
            <span>Back</span>
          </span>
        ),
        isNextDisabled: catalogOptions.length === 0 || form.catalogItems.length === 0,
        nextButtonText: (
          <span className="tenant-admin-projects-teams__wizard-footer-label">
            <span>{CREATE_PROJECT_WIZARD_DEMO.continueLabel}</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
      }
    }

    return {
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
    }
  }

  return (
    <Modal
      variant={ModalVariant.medium}
      width="64rem"
      maxWidth="64rem"
      isOpen={isOpen}
      onEscapePress={handleClose}
      aria-labelledby="create-tenant-project-wizard-title"
      className="tenant-admin-projects-teams__wizard-modal"
    >
      {isOpen ? (
        <Wizard
          key="create-tenant-project-wizard"
          className="tenant-admin-projects-teams__wizard"
          height="40rem"
          onClose={handleClose}
          header={
            <WizardHeader
              title="New project"
              titleId="create-tenant-project-wizard-title"
              onClose={handleClose}
              closeButtonAriaLabel="Close new project wizard"
            />
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
      ) : null}
    </Modal>
  )
}
