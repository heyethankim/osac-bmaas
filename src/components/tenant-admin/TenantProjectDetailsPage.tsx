import { useMemo, useState } from 'react'
import {
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Title,
} from '@patternfly/react-core'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import { TrashIcon } from '@patternfly/react-icons/dist/esm/icons/trash-icon'
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'
import { CATALOG_SERVICE_LABELS } from '../../providerSetup/templateDemo'
import { AddProjectMemberModal } from './AddProjectMemberModal'
import { EntityDetailsPageShell } from '../shared/EntityDetailsPageShell'
import { EntityDetailsActionsDropdown } from '../shared/EntityDetailsActionsDropdown'
import {
  getProjectMemberInitials,
  getTenantProjectMemberRoleShortLabel,
  CREATE_PROJECT_WIZARD_DEMO,
} from '../../tenantAdmin/createProjectWizard'
import {
  getInstancesForTenantProject,
  getTenantProjectEnvironmentLabel,
  getTenantProjectPoolLabel,
  TENANT_PROJECTS_TEAMS_DEMO,
  type TenantProject,
  type TenantProjectMember,
} from '../../tenantAdmin/projects'
import {
  formatTenantInstanceCreatedAt,
  getTenantInstanceServiceId,
  getTenantInstanceStatusLabel,
  type TenantInstance,
} from '../../tenantUser/instances'

type TenantProjectDetailsPageProps = {
  project: TenantProject
  instances: readonly TenantInstance[]
  onBack: () => void
  onDelete: (projectId: string) => void
  onAddMember: (projectId: string, member: TenantProjectMember) => void
  onRemoveMember: (projectId: string, memberId: string) => void
  onNavigateToInstance: (instance: TenantInstance) => void
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

export function TenantProjectDetailsPage({
  project,
  instances,
  onBack,
  onDelete,
  onAddMember,
  onRemoveMember,
  onNavigateToInstance,
}: TenantProjectDetailsPageProps) {
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [memberPendingRemove, setMemberPendingRemove] = useState<TenantProjectMember | null>(null)

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
        parentLabel="Projects & teams"
        onBack={onBack}
        title={project.name}
        titleId="tenant-project-details-title"
        actions={
          <EntityDetailsActionsDropdown
            onRemove={() => onDelete(project.id)}
            removeLabel="Delete"
          />
        }
      >
        <div className="entity-details-page__columns">
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
              <DescriptionListGroup>
                <DescriptionListTerm>Environment</DescriptionListTerm>
                <DescriptionListDescription>
                  {getTenantProjectEnvironmentLabel(project.environmentType)}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Project ID</DescriptionListTerm>
                <DescriptionListDescription>{project.id}</DescriptionListDescription>
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
                  {project.instanceQuota} instances
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
              <Content component="p" className="tenant-admin-project-details__empty">
                {TENANT_PROJECTS_TEAMS_DEMO.servicesEmpty}
              </Content>
            ) : (
              <ul className="tenant-admin-project-details__list" aria-label="Project services">
                {projectInstances.map((instance) => {
                  const serviceId = getTenantInstanceServiceId(instance)
                  return (
                    <li key={instance.id} className="tenant-admin-project-details__list-item">
                      <div className="tenant-admin-project-details__service-row">
                        <span className="tenant-admin-project-details__service-icon" aria-hidden>
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
                          <Content component="p" className="tenant-admin-project-details__meta">
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

          <div className="entity-details-page__column">
            <div className="entity-details-page__section-header">
              <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
                Project members ({project.members.length})
              </Title>
              <Button
                variant="link"
                isInline
                icon={<PlusIcon />}
                onClick={() => setIsAddMemberOpen(true)}
              >
                {TENANT_PROJECTS_TEAMS_DEMO.addMemberLabel}
              </Button>
            </div>

            {project.members.length === 0 ? (
              <Content component="p" className="tenant-admin-project-details__empty">
                {TENANT_PROJECTS_TEAMS_DEMO.membersEmpty}
              </Content>
            ) : (
              <ul className="tenant-admin-project-details__list" aria-label="Project members">
                {project.members.map((member) => (
                  <li key={member.id} className="tenant-admin-project-details__list-item">
                    <div className="tenant-admin-project-details__member-row">
                      <span className="tenant-admin-project-details__avatar" aria-hidden>
                        {getProjectMemberInitials(member.name)}
                      </span>
                      <div className="tenant-admin-project-details__member-copy">
                        <Content component="p" className="tenant-admin-project-details__primary">
                          {member.name}
                        </Content>
                        <Button
                          variant="link"
                          isInline
                          component="a"
                          href={`mailto:${member.email}`}
                          className="tenant-admin-project-details__email-link"
                        >
                          {member.email}
                        </Button>
                      </div>
                      <Label isCompact color="blue">
                        {getTenantProjectMemberRoleShortLabel(member.role)}
                      </Label>
                      <Button
                        variant="plain"
                        icon={<TrashIcon />}
                        aria-label={`${TENANT_PROJECTS_TEAMS_DEMO.removeMemberLabel} ${member.name}`}
                        onClick={() => setMemberPendingRemove(member)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
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
