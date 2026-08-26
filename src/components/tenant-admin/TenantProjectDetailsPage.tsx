import { useMemo, useState } from 'react'
import {
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Dropdown,
  DropdownItem,
  DropdownList,
  Label,
  MenuToggle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Title,
} from '@patternfly/react-core'
import { EllipsisVIcon } from '@patternfly/react-icons/dist/esm/icons/ellipsis-v-icon'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'
import { CATALOG_SERVICE_LABELS } from '../../providerSetup/templateDemo'
import { AddProjectMemberModal } from './AddProjectMemberModal'
import { EntityDetailsPageShell } from '../shared/EntityDetailsPageShell'
import { EntityDetailsActionsDropdown } from '../shared/EntityDetailsActionsDropdown'
import {
  getTenantProjectMemberRoleLabelColor,
  getTenantProjectMemberRoleShortLabel,
  CREATE_PROJECT_WIZARD_DEMO,
} from '../../tenantAdmin/createProjectWizard'
import {
  getChildTenantProjects,
  getEffectiveProjectMembers,
  getInstancesForTenantProject,
  getTenantProjectAncestors,
  getTenantProjectById,
  getTenantProjectEnvironmentLabel,
  getTenantProjectInstanceQuotaLabel,
  getTenantProjectMemberCountLabel,
  getTenantProjectPoolLabel,
  getTenantProjectServicesLabel,
  TENANT_PROJECTS_TEAMS_DEMO,
  type EffectiveTenantProjectMember,
  type TenantProject,
  type TenantProjectMember,
} from '../../tenantAdmin/projects'
import { normalizeMemberEmail } from '../../tenantUser/projects'
import {
  formatTenantInstanceCreatedAt,
  getTenantInstanceServiceId,
  getTenantInstanceStatusLabel,
  type TenantInstance,
} from '../../tenantUser/instances'

type TenantProjectDetailsPageProps = {
  project: TenantProject
  projects: readonly TenantProject[]
  instances: readonly TenantInstance[]
  onBack: () => void
  onOpenProject: (project: TenantProject) => void
  onCreateNested: (project: TenantProject) => void
  onEdit: (project: TenantProject) => void
  onDelete: (projectId: string) => void
  onAddMember: (projectId: string, member: TenantProjectMember) => void
  onRemoveMember: (projectId: string, memberId: string) => void
  onNavigateToInstance: (instance: TenantInstance) => void
  readOnly?: boolean
  currentUserEmail?: string
}

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getInstanceStatusColor(
  status: TenantInstance['status'],
): 'green' | 'blue' | 'orange' | 'red' | 'grey' {
  switch (status) {
    case 'running':
      return 'green'
    case 'provisioning':
    case 'restarting':
      return 'blue'
    case 'stopped':
      return 'grey'
    case 'failed':
      return 'red'
    default:
      return 'grey'
  }
}

function ProjectMemberRowActions({
  member,
  onRequestRemove,
}: {
  member: TenantProjectMember
  onRequestRemove: (member: TenantProjectMember) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onSelect={() => setIsOpen(false)}
      popperProps={{ position: 'right' }}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          variant="plain"
          isExpanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          icon={<EllipsisVIcon />}
          aria-label={`Actions for ${member.name}`}
        />
      )}
    >
      <DropdownList>
        <DropdownItem value="remove" isDanger onClick={() => onRequestRemove(member)}>
          {TENANT_PROJECTS_TEAMS_DEMO.removeMemberLabel}
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  )
}

function ProjectMemberPersonRow({
  member,
  parentProject,
  onRequestRemove,
  currentUserEmail,
  readOnly = false,
}: {
  member: EffectiveTenantProjectMember
  parentProject: TenantProject | null
  onRequestRemove: (member: TenantProjectMember) => void
  currentUserEmail?: string
  readOnly?: boolean
}) {
  const isCurrentUser =
    currentUserEmail !== undefined &&
    normalizeMemberEmail(member.email) === normalizeMemberEmail(currentUserEmail)

  return (
    <li
      className={`provider-admin-organizations__account-person${
        isCurrentUser ? ' provider-admin-organizations__account-person--current-user' : ''
      }`}
    >
      <div className="provider-admin-organizations__account-person-main">
        <Content component="p" className="provider-admin-organizations__primary-cell">
          {member.name}
        </Content>
        <Content component="p" className="provider-admin-organizations__secondary-cell">
          {member.email}
        </Content>
        {member.inherited ? (
          <Content component="p" className="provider-admin-organizations__secondary-cell">
            Inherited from {member.inheritedFromProjectName ?? parentProject?.name ?? 'parent'}
          </Content>
        ) : null}
        <Label
          isCompact
          color={getTenantProjectMemberRoleLabelColor(member.role)}
          className="provider-admin-organizations__account-person-role"
        >
          {getTenantProjectMemberRoleShortLabel(member.role)}
        </Label>
      </div>
      {readOnly || member.inherited ? null : (
        <ProjectMemberRowActions member={member} onRequestRemove={onRequestRemove} />
      )}
    </li>
  )
}

export function TenantProjectDetailsPage({
  project,
  projects,
  instances,
  onBack,
  onOpenProject,
  onCreateNested,
  onEdit,
  onDelete,
  onAddMember,
  onRemoveMember,
  onNavigateToInstance,
  readOnly = false,
  currentUserEmail,
}: TenantProjectDetailsPageProps) {
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [memberPendingRemove, setMemberPendingRemove] = useState<TenantProjectMember | null>(null)

  const parentProject = useMemo(
    () =>
      project.parentProjectId ? getTenantProjectById(projects, project.parentProjectId) : null,
    [project.parentProjectId, projects],
  )

  const breadcrumbAncestors = useMemo(
    () =>
      getTenantProjectAncestors(projects, project.id)
        .filter((ancestor) =>
          readOnly && currentUserEmail
            ? getEffectiveProjectMembers(projects, ancestor).some(
                (member) =>
                  normalizeMemberEmail(member.email) === normalizeMemberEmail(currentUserEmail),
              )
            : true,
        )
        .map((ancestor) => ({
          label: ancestor.name,
          onClick: () => onOpenProject(ancestor),
        })),
    [currentUserEmail, onOpenProject, project.id, projects, readOnly],
  )

  const nestedProjects = useMemo(() => {
    const children = getChildTenantProjects(projects, project.id)
    if (!readOnly || !currentUserEmail) {
      return children
    }

    return children.filter((nestedProject) =>
      getEffectiveProjectMembers(projects, nestedProject).some(
        (member) => normalizeMemberEmail(member.email) === normalizeMemberEmail(currentUserEmail),
      ),
    )
  }, [currentUserEmail, project.id, projects, readOnly])

  const effectiveMembers = useMemo(
    () => getEffectiveProjectMembers(projects, project),
    [project, projects],
  )

  const currentUserMembership = useMemo(() => {
    if (!readOnly || !currentUserEmail) {
      return null
    }

    return (
      effectiveMembers.find(
        (member) =>
          normalizeMemberEmail(member.email) === normalizeMemberEmail(currentUserEmail),
      ) ?? null
    )
  }, [currentUserEmail, effectiveMembers, readOnly])

  const projectInstances = useMemo(
    () => getInstancesForTenantProject(instances, project),
    [instances, project],
  )

  const closeRemoveMember = () => {
    setMemberPendingRemove(null)
  }

  const handleConfirmRemoveMember = () => {
    if (!memberPendingRemove) {
      return
    }
    onRemoveMember(project.id, memberPendingRemove.id)
    setMemberPendingRemove(null)
  }

  return (
    <>
      <EntityDetailsPageShell
        className="tenant-admin-project-details"
        parentLabel="Projects"
        breadcrumbAncestors={breadcrumbAncestors}
        onBack={onBack}
        title={project.name}
        titleId="tenant-project-details-title"
        description={TENANT_PROJECTS_TEAMS_DEMO.detailsLede}
        actions={
          readOnly ? undefined : (
            <EntityDetailsActionsDropdown
              onEdit={() => onEdit(project)}
              onRemove={() => onDelete(project.id)}
              removeLabel="Delete"
            />
          )
        }
      >
        <div className="entity-details-page__columns entity-details-page__columns--with-rail">
          <div className="entity-details-page__main-stack">
            <div className="entity-details-page__columns entity-details-page__columns--2">
              <div className="entity-details-page__column">
                <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
                  Overview
                </Title>
                <DescriptionList
                  isCompact
                  className="entity-details-page__dl"
                  aria-label="Project overview"
                >
                  <DescriptionListGroup>
                    <DescriptionListTerm>Description</DescriptionListTerm>
                    <DescriptionListDescription>
                      {project.description.trim() || CREATE_PROJECT_WIZARD_DEMO.reviewNoDescription}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  {parentProject ? (
                    <DescriptionListGroup>
                      <DescriptionListTerm>Parent project</DescriptionListTerm>
                      <DescriptionListDescription>
                        <Button variant="link" isInline onClick={() => onOpenProject(parentProject)}>
                          {parentProject.name}
                        </Button>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  ) : null}
                  {currentUserMembership ? (
                    <DescriptionListGroup>
                      <DescriptionListTerm>Your role</DescriptionListTerm>
                      <DescriptionListDescription>
                        {getTenantProjectMemberRoleShortLabel(currentUserMembership.role)}
                        {currentUserMembership.inherited
                          ? ` (inherited from ${
                              currentUserMembership.inheritedFromProjectName ??
                              parentProject?.name ??
                              'parent'
                            })`
                          : ''}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  ) : null}
                  <DescriptionListGroup>
                    <DescriptionListTerm>Project ID</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code>{project.id}</code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Created</DescriptionListTerm>
                    <DescriptionListDescription>
                      {formatCreatedAt(project.createdAt)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Instance quota</DescriptionListTerm>
                    <DescriptionListDescription>
                      {getTenantProjectInstanceQuotaLabel(projects, project)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>IP pool</DescriptionListTerm>
                    <DescriptionListDescription>
                      {getTenantProjectPoolLabel(project)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </div>

              <div className="entity-details-page__column">
                <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
                  Services ({projectInstances.length})
                </Title>
                {projectInstances.length === 0 ? (
                  <Content component="p" className="provider-admin-organizations__secondary-cell">
                    {TENANT_PROJECTS_TEAMS_DEMO.servicesEmpty}
                  </Content>
                ) : (
                  <ul className="tenant-admin-project-details__list" aria-label="Project services">
                    {projectInstances.map((instance) => {
                      const serviceId = getTenantInstanceServiceId(instance)
                      return (
                        <li key={instance.id} className="tenant-admin-project-details__list-item">
                          <div className="tenant-admin-project-details__service-row">
                            <span
                              className="tenant-admin-project-details__service-icon"
                              aria-hidden
                            >
                              {getCatalogServiceIcon(serviceId)}
                            </span>
                            <div className="tenant-admin-project-details__service-copy">
                              <Button
                                variant="link"
                                isInline
                                className="tenant-admin-project-details__service-link"
                                onClick={() => onNavigateToInstance(instance)}
                              >
                                {instance.name}
                              </Button>
                              <Content
                                component="p"
                                className="tenant-admin-project-details__meta"
                              >
                                {CATALOG_SERVICE_LABELS[serviceId]} ·{' '}
                                {formatTenantInstanceCreatedAt(instance.createdAt)}
                              </Content>
                            </div>
                            <Label color={getInstanceStatusColor(instance.status)} isCompact>
                              {getTenantInstanceStatusLabel(instance.status)}
                            </Label>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="entity-details-page__column entity-details-page__conditions-band">
              <div className="entity-details-page__section-header">
                <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
                  {TENANT_PROJECTS_TEAMS_DEMO.nestedProjectsTitle} ({nestedProjects.length})
                </Title>
                {readOnly ? null : (
                  <Button
                    variant="link"
                    isInline
                    icon={<PlusCircleIcon />}
                    className="provider-admin-organizations__accounts-add"
                    onClick={() => onCreateNested(project)}
                  >
                    {TENANT_PROJECTS_TEAMS_DEMO.createNestedProjectLabel}
                  </Button>
                )}
              </div>
              {nestedProjects.length === 0 ? (
                <Content component="p" className="provider-admin-organizations__secondary-cell">
                  {TENANT_PROJECTS_TEAMS_DEMO.nestedProjectsEmpty}
                </Content>
              ) : (
                <ul className="tenant-admin-project-details__list" aria-label="Nested projects">
                  {nestedProjects.map((nestedProject) => (
                    <li key={nestedProject.id} className="tenant-admin-project-details__list-item">
                      <div className="tenant-admin-project-details__nested-row">
                        <div>
                          <Button
                            variant="link"
                            isInline
                            className="tenant-admin-project-details__service-link"
                            onClick={() => onOpenProject(nestedProject)}
                          >
                            {nestedProject.name}
                          </Button>
                          <Content component="p" className="tenant-admin-project-details__meta">
                            {getTenantProjectEnvironmentLabel(nestedProject.environmentType)} ·{' '}
                            {getTenantProjectInstanceQuotaLabel(projects, nestedProject)} ·{' '}
                            {getTenantProjectMemberCountLabel(projects, nestedProject)} ·{' '}
                            {getTenantProjectServicesLabel(instances, nestedProject)}
                          </Content>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="entity-details-page__rail-stack">
            <div className="entity-details-page__column entity-details-page__column--config">
              <div className="entity-details-page__column-block">
                <div className="entity-details-page__section-header entity-details-page__section-header--config provider-admin-organizations__accounts-header">
                  <Title
                    headingLevel="h2"
                    size="md"
                    className="entity-details-page__section-title entity-details-page__section-title--config"
                  >
                    Project members ({effectiveMembers.length})
                  </Title>
                  {readOnly ? null : (
                    <Button
                      variant="link"
                      isInline
                      icon={<PlusCircleIcon />}
                      className="provider-admin-organizations__accounts-add"
                      onClick={() => setIsAddMemberOpen(true)}
                    >
                      {TENANT_PROJECTS_TEAMS_DEMO.addMemberLabel}
                    </Button>
                  )}
                </div>
                {effectiveMembers.length === 0 ? (
                  <Content component="p" className="provider-admin-organizations__secondary-cell">
                    {TENANT_PROJECTS_TEAMS_DEMO.membersEmpty}
                  </Content>
                ) : (
                  <ul
                    className="provider-admin-organizations__account-people"
                    aria-label="Project members"
                  >
                    {effectiveMembers.map((member) => (
                      <ProjectMemberPersonRow
                        key={member.id}
                        member={member}
                        parentProject={parentProject}
                        onRequestRemove={setMemberPendingRemove}
                        currentUserEmail={currentUserEmail}
                        readOnly={readOnly}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </EntityDetailsPageShell>

      <AddProjectMemberModal
        project={isAddMemberOpen ? project : null}
        onClose={() => setIsAddMemberOpen(false)}
        onAdd={onAddMember}
      />

      <Modal
        variant={ModalVariant.small}
        isOpen={memberPendingRemove !== null}
        onClose={closeRemoveMember}
        aria-labelledby="remove-project-member-title"
        aria-describedby="remove-project-member-description"
      >
        <ModalHeader
          title="Remove member?"
          titleIconVariant="warning"
          labelId="remove-project-member-title"
        />
        <ModalBody>
          <Content component="p" id="remove-project-member-description">
            {memberPendingRemove ? (
              <>
                <strong>{memberPendingRemove.name}</strong> will be removed from{' '}
                <strong>{project.name}</strong>.
              </>
            ) : (
              'This member will be removed from the project.'
            )}
          </Content>
        </ModalBody>
        <ModalFooter>
          <Button variant="danger" onClick={handleConfirmRemoveMember}>
            Remove
          </Button>
          <Button variant="link" onClick={closeRemoveMember}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
