import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Content,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Title,
} from '@patternfly/react-core'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { CreateTenantProjectWizard } from '../../components/tenant-admin/CreateTenantProjectWizard'
import { TenantProjectDetailsPage } from '../../components/tenant-admin/TenantProjectDetailsPage'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import { formatCatalogTableResultCount } from '../../catalog/tableResultCount'
import {
  getTenantProjectActions,
  getTenantProjectMemberCountLabel,
  getTenantProjectPoolLabel,
  getTenantProjectServicesLabel,
  TENANT_PROJECTS_TEAMS_DEMO,
  type TenantProject,
  type TenantProjectMember,
} from '../../tenantAdmin/projects'
import {
  addTenantProject,
  addTenantProjectMember,
  removeTenantProject,
  removeTenantProjectMember,
} from '../../tenantAdmin/storage'
import type { TenantInstance } from '../../tenantUser/instances'
import {
  getTenantInstanceProjectIds,
  withInstanceProjectIds,
} from '../../tenantUser/instances'
import { updateTenantUserInstance } from '../../tenantUser/storage'

type TenantAdminProjectsTeamsPageProps = {
  tenantSlug: string
  organization: RegisteredOrganization
  projects: TenantProject[]
  instances: readonly TenantInstance[]
  onProjectsChange: (projects: TenantProject[]) => void
  onInstancesChange: (
    updater: (instances: readonly TenantInstance[]) => readonly TenantInstance[],
  ) => void
  onNavigateToInstance: (instance: TenantInstance) => void
  /** Opens this project's detail page when navigating from another workspace view. */
  openProjectId?: string | null
  onOpenProjectConsumed?: () => void
}

export function TenantAdminProjectsTeamsPage({
  tenantSlug,
  organization,
  projects,
  instances,
  onProjectsChange,
  onInstancesChange,
  onNavigateToInstance,
  openProjectId = null,
  onOpenProjectConsumed,
}: TenantAdminProjectsTeamsPageProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<TenantProject | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [projectPendingDelete, setProjectPendingDelete] = useState<TenantProject | null>(null)

  const sortedProjects = useMemo(
    () => [...projects].sort((left, right) => left.name.localeCompare(right.name)),
    [projects],
  )

  useEffect(() => {
    if (!openProjectId) {
      return
    }

    const match = projects.find((project) => project.id === openProjectId) ?? null
    if (match) {
      setSelectedProject(match)
      setIsDetailsOpen(true)
    }
    onOpenProjectConsumed?.()
  }, [openProjectId, projects, onOpenProjectConsumed])

  useEffect(() => {
    if (!selectedProject) {
      return
    }

    const next = projects.find((project) => project.id === selectedProject.id) ?? null
    if (!next) {
      setSelectedProject(null)
      setIsDetailsOpen(false)
      return
    }

    if (next !== selectedProject) {
      setSelectedProject(next)
    }
  }, [projects, selectedProject])

  const openDetails = (project: TenantProject) => {
    setSelectedProject(project)
    setIsDetailsOpen(true)
  }

  const closeDetails = () => {
    setIsDetailsOpen(false)
  }

  const handleCreateProject = (project: TenantProject) => {
    addTenantProject(tenantSlug, project)
    onProjectsChange([...projects, project])
  }

  const openDeleteProject = (projectId: string) => {
    const project =
      projects.find((entry) => entry.id === projectId) ??
      (selectedProject?.id === projectId ? selectedProject : null)
    if (!project) {
      return
    }
    setProjectPendingDelete(project)
  }

  const closeDeleteProject = () => {
    setProjectPendingDelete(null)
  }

  const handleConfirmDeleteProject = () => {
    if (!projectPendingDelete) {
      return
    }

    const projectId = projectPendingDelete.id
    onProjectsChange(removeTenantProject(tenantSlug, projectId))
    setProjectPendingDelete(null)
    if (selectedProject?.id === projectId) {
      setSelectedProject(null)
      setIsDetailsOpen(false)
    }
  }

  const deleteConfirmModal = (
    <Modal
      variant={ModalVariant.small}
      isOpen={projectPendingDelete !== null}
      onClose={closeDeleteProject}
      aria-labelledby="delete-project-title"
      aria-describedby="delete-project-description"
    >
      <ModalHeader
        title="Delete project?"
        titleIconVariant="warning"
        labelId="delete-project-title"
      />
      <ModalBody>
        <Content component="p" id="delete-project-description">
          {projectPendingDelete ? (
            <>
              <strong>{projectPendingDelete.name}</strong> will be permanently removed. This cannot
              be undone.
            </>
          ) : (
            'This project will be permanently removed. This cannot be undone.'
          )}
        </Content>
      </ModalBody>
      <ModalFooter>
        <Button variant="danger" onClick={handleConfirmDeleteProject}>
          Delete
        </Button>
        <Button variant="link" onClick={closeDeleteProject}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )

  const handleAddMember = (projectId: string, member: TenantProjectMember) => {
    onProjectsChange(addTenantProjectMember(tenantSlug, projectId, member))
  }

  const handleRemoveMember = (projectId: string, memberId: string) => {
    onProjectsChange(removeTenantProjectMember(tenantSlug, projectId, memberId))
  }

  const handleAddService = (projectId: string, instanceId: string) => {
    onInstancesChange((current) => {
      const target = current.find((instance) => instance.id === instanceId)
      if (!target) {
        return current
      }

      const nextIds = [...new Set([...getTenantInstanceProjectIds(target), projectId])]
      return updateTenantUserInstance(
        tenantSlug,
        instanceId,
        withInstanceProjectIds(target, nextIds, projects, organization.name),
        [...current],
      )
    })
  }

  if (isCreateModalOpen) {
    return (
      <>
        <CreateTenantProjectWizard
          presentation="page"
          isOpen={isCreateModalOpen}
          organization={organization}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateProject}
        />
        {deleteConfirmModal}
      </>
    )
  }

  if (isDetailsOpen && selectedProject) {
    return (
      <>
        <TenantProjectDetailsPage
          project={selectedProject}
          instances={instances}
          onBack={closeDetails}
          onDelete={openDeleteProject}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          onAddService={handleAddService}
          onNavigateToInstance={onNavigateToInstance}
        />
        {deleteConfirmModal}
      </>
    )
  }

  return (
    <div className="tenant-admin-workspace-page tenant-admin-projects-teams">
      {sortedProjects.length > 0 ? (
        <Flex
          className="tenant-admin-projects-teams__header"
          alignItems={{ default: 'alignItemsFlexStart' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          gap={{ default: 'gapMd' }}
        >
          <FlexItem>
            <Title headingLevel="h1" size="3xl" className="tenant-admin-projects-teams__title">
              Projects & teams
            </Title>
            <Content component="p" className="tenant-admin-projects-teams__lede">
              {TENANT_PROJECTS_TEAMS_DEMO.lede}
            </Content>
          </FlexItem>
          <FlexItem alignSelf={{ default: 'alignSelfFlexStart' }}>
            <Button
              variant="primary"
              icon={<PlusIcon />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              {TENANT_PROJECTS_TEAMS_DEMO.createProjectLabel}
            </Button>
          </FlexItem>
        </Flex>
      ) : (
        <>
          <Title headingLevel="h1" size="3xl" className="tenant-admin-projects-teams__title">
            Projects & teams
          </Title>
          <Content component="p" className="tenant-admin-projects-teams__lede">
            {TENANT_PROJECTS_TEAMS_DEMO.lede}
          </Content>
        </>
      )}

      {sortedProjects.length > 0 ? (
        <div className="catalog-table-panel">
          <Content component="p" className="catalog-table-result-count">
            {formatCatalogTableResultCount(sortedProjects.length, 'project')}
          </Content>
          <Table
            aria-label="Tenant projects"
            className="catalog-data-table tenant-admin-projects-teams__table"
          >
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Services</Th>
                <Th>Project members</Th>
                <Th>IP pool</Th>
                <Th>Instance quota</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {sortedProjects.map((project) => (
                <Tr key={project.id}>
                  <Td dataLabel="Name">
                    <Content component="p" className="tenant-admin-projects-teams__primary-cell">
                      <Button
                        variant="link"
                        isInline
                        className="catalog-table-name-link"
                        onClick={() => openDetails(project)}
                      >
                        {project.name}
                      </Button>
                    </Content>
                    <Content component="p" className="tenant-admin-projects-teams__meta-cell">
                      {project.id}
                    </Content>
                  </Td>
                  <Td dataLabel="Services">
                    {getTenantProjectServicesLabel(instances, project)}
                  </Td>
                  <Td dataLabel="Project members">
                    {getTenantProjectMemberCountLabel(project)}
                  </Td>
                  <Td dataLabel="IP pool">{getTenantProjectPoolLabel(project)}</Td>
                  <Td dataLabel="Instance quota">{project.instanceQuota} instances</Td>
                  <Td isActionCell className="tenant-admin-projects-teams__table-action">
                    <ActionsColumn
                      items={getTenantProjectActions(project, {
                        onViewDetails: openDetails,
                        onDelete: openDeleteProject,
                      })}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      ) : (
        <EmptyState className="tenant-admin-projects-teams__empty">
          <Title headingLevel="h2" size="lg">
            {TENANT_PROJECTS_TEAMS_DEMO.emptyTitle}
          </Title>
          <EmptyStateBody className="tenant-admin-projects-teams__empty-body">
            {TENANT_PROJECTS_TEAMS_DEMO.emptyBody}
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button
                variant="primary"
                icon={<PlusIcon />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                {TENANT_PROJECTS_TEAMS_DEMO.createFirstProjectLabel}
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      )}

      {deleteConfirmModal}
    </div>
  )
}
