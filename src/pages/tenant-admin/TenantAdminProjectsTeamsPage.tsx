import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  Button,
  Content,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  Flex,
  FlexItem,
  FormSelect,
  FormSelectOption,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  SearchInput,
  Title,
  Label,
} from '@patternfly/react-core'
import { AngleDownIcon } from '@patternfly/react-icons/dist/esm/icons/angle-down-icon'
import { AngleRightIcon } from '@patternfly/react-icons/dist/esm/icons/angle-right-icon'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { CreateTenantProjectWizard } from '../../components/tenant-admin/CreateTenantProjectWizard'
import { TenantProjectDetailsPage } from '../../components/tenant-admin/TenantProjectDetailsPage'
import { CatalogFilterEmptyState } from '../../components/catalog/CatalogFilterEmptyState'
import { CatalogFilterResultsSummary } from '../../components/catalog/CatalogFilterResultsSummary'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import {
  buildProjectFilterParts,
  buildTenantProjectTreeRows,
  collectDescendantProjectIds,
  getAutoExpandedProjectIds,
  getChildTenantProjects,
  getTenantProjectActions,
  getTenantProjectAncestors,
  getTenantProjectById,
  getTenantProjectInstanceQuotaLabel,
  getTenantProjectMemberCountLabel,
  getTenantProjectPoolLabel,
  getTenantProjectServicesLabel,
  matchesProjectEnvironmentFilter,
  PROJECT_ENVIRONMENT_FILTER_OPTIONS,
  projectMatchesSearch,
  TENANT_PROJECTS_TEAMS_DEMO,
  type ProjectEnvironmentFilter,
  type TenantProject,
  type TenantProjectMember,
} from '../../tenantAdmin/projects'
import {
  addTenantProject,
  addTenantProjectMember,
  removeTenantProject,
  removeTenantProjectMember,
  updateTenantProject,
} from '../../tenantAdmin/storage'
import { assignTenantUserInstanceToProject } from '../../tenantUser/storage'
import type { TenantInstance } from '../../tenantUser/instances'

type TenantAdminProjectsTeamsPageProps = {
  tenantSlug: string
  organization: RegisteredOrganization
  projects: TenantProject[]
  instances: readonly TenantInstance[]
  onProjectsChange: (projects: TenantProject[]) => void
  onInstancesChange: (instances: TenantInstance[]) => void
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
  const [editingProject, setEditingProject] = useState<TenantProject | null>(null)
  const [nestedCreateParent, setNestedCreateParent] = useState<TenantProject | null>(null)
  const [returnToProjectAfterWizard, setReturnToProjectAfterWizard] = useState<TenantProject | null>(
    null,
  )
  const [selectedProject, setSelectedProject] = useState<TenantProject | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [projectPendingDelete, setProjectPendingDelete] = useState<TenantProject | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [selectedEnvironment, setSelectedEnvironment] = useState<ProjectEnvironmentFilter>('all')
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(() => new Set())

  const sortedProjects = useMemo(
    () => [...projects].sort((left, right) => left.name.localeCompare(right.name)),
    [projects],
  )

  const filteredProjects = useMemo(() => {
    return sortedProjects.filter((project) => {
      if (!matchesProjectEnvironmentFilter(project, selectedEnvironment)) {
        return false
      }

      return projectMatchesSearch(project, searchValue)
    })
  }, [searchValue, selectedEnvironment, sortedProjects])

  const treeRows = useMemo(
    () =>
      buildTenantProjectTreeRows(
        sortedProjects,
        searchValue,
        selectedEnvironment,
        expandedProjectIds,
      ),
    [expandedProjectIds, searchValue, selectedEnvironment, sortedProjects],
  )

  const filterDescriptionParts = useMemo(
    () => buildProjectFilterParts(searchValue, selectedEnvironment),
    [searchValue, selectedEnvironment],
  )

  const clearAllFilters = () => {
    setSearchValue('')
    setSelectedEnvironment('all')
  }

  useEffect(() => {
    const autoExpanded = getAutoExpandedProjectIds(projects, searchValue, selectedEnvironment)
    const parentsWithChildren = sortedProjects
      .filter((project) => getChildTenantProjects(sortedProjects, project.id).length > 0)
      .map((project) => project.id)

    setExpandedProjectIds((current) => {
      const next = new Set([...current, ...autoExpanded, ...parentsWithChildren])
      if (next.size === current.size && [...next].every((id) => current.has(id))) {
        return current
      }
      return next
    })
  }, [projects, searchValue, selectedEnvironment, sortedProjects])

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

  const closeCreateWizard = () => {
    setIsCreateModalOpen(false)
    setEditingProject(null)
    setNestedCreateParent(null)

    if (returnToProjectAfterWizard) {
      const latest =
        getTenantProjectById(projects, returnToProjectAfterWizard.id) ?? returnToProjectAfterWizard
      setSelectedProject(latest)
      setIsDetailsOpen(true)
      setReturnToProjectAfterWizard(null)
    }
  }

  const openCreateProject = (parent: TenantProject | null = null, fromDetails = false) => {
    setEditingProject(null)
    setNestedCreateParent(parent)
    if (fromDetails && parent) {
      setReturnToProjectAfterWizard(parent)
      setIsDetailsOpen(false)
    } else {
      setReturnToProjectAfterWizard(null)
    }
    setIsCreateModalOpen(true)
  }

  const openEditProject = (project: TenantProject, fromDetails = false) => {
    setEditingProject(project)
    setNestedCreateParent(null)
    if (fromDetails) {
      setReturnToProjectAfterWizard(project)
      setIsDetailsOpen(false)
    } else {
      setReturnToProjectAfterWizard(null)
    }
    setIsCreateModalOpen(true)
  }

  const handleCreateProject = (project: TenantProject) => {
    addTenantProject(tenantSlug, project)
    onProjectsChange([...projects, project])
  }

  const handleUpdateProject = (project: TenantProject) => {
    onProjectsChange(updateTenantProject(tenantSlug, project))
  }

  const toggleProjectExpanded = (projectId: string) => {
    setExpandedProjectIds((current) => {
      const next = new Set(current)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
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

  const nestedDeleteCount = projectPendingDelete
    ? collectDescendantProjectIds(projects, projectPendingDelete.id).length
    : 0

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
              <strong>{projectPendingDelete.name}</strong> will be permanently removed.
              {nestedDeleteCount > 0 ? (
                <>
                  {' '}
                  This will also delete {nestedDeleteCount} nested project
                  {nestedDeleteCount === 1 ? '' : 's'}.
                </>
              ) : null}{' '}
              This cannot be undone.
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

  const handleAssignService = (projectId: string, instanceId: string) => {
    onInstancesChange(
      assignTenantUserInstanceToProject(
        tenantSlug,
        instanceId,
        projectId,
        projects,
        organization.name,
        [...instances],
      ),
    )
  }

  if (isCreateModalOpen) {
    const editBreadcrumbAncestors = editingProject
      ? getTenantProjectAncestors(projects, editingProject.id).map((ancestor) => ({
          label: ancestor.name,
          onClick: () => {
            setIsCreateModalOpen(false)
            setEditingProject(null)
            setReturnToProjectAfterWizard(null)
            openDetails(ancestor)
          },
        }))
      : undefined

    return (
      <>
        <CreateTenantProjectWizard
          presentation="page"
          isOpen={isCreateModalOpen}
          organization={organization}
          projects={projects}
          parentProject={nestedCreateParent}
          breadcrumbAncestors={editBreadcrumbAncestors}
          editingProject={editingProject}
          onOpenParentProject={(project) => {
            setIsCreateModalOpen(false)
            setEditingProject(null)
            setNestedCreateParent(null)
            setReturnToProjectAfterWizard(null)
            openDetails(project)
          }}
          onClose={closeCreateWizard}
          onCreate={handleCreateProject}
          onUpdate={handleUpdateProject}
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
          projects={projects}
          instances={instances}
          onBack={closeDetails}
          onOpenProject={openDetails}
          onCreateNested={(parent) => openCreateProject(parent, true)}
          onEdit={(project) => openEditProject(project, true)}
          onDelete={openDeleteProject}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          onAssignService={handleAssignService}
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
              Projects
            </Title>
            <Content component="p" className="tenant-admin-projects-teams__lede">
              {TENANT_PROJECTS_TEAMS_DEMO.lede}
            </Content>
          </FlexItem>
          <FlexItem alignSelf={{ default: 'alignSelfFlexStart' }}>
            <Button
              variant="primary"
              icon={<PlusIcon />}
              onClick={() => openCreateProject()}
            >
              {TENANT_PROJECTS_TEAMS_DEMO.createProjectLabel}
            </Button>
          </FlexItem>
        </Flex>
      ) : (
        <>
          <Title headingLevel="h1" size="3xl" className="tenant-admin-projects-teams__title">
            Projects
          </Title>
          <Content component="p" className="tenant-admin-projects-teams__lede">
            {TENANT_PROJECTS_TEAMS_DEMO.lede}
          </Content>
        </>
      )}

      {sortedProjects.length > 0 ? (
        <div className="catalog-view-toolbar">
          <div className="catalog-view-toolbar__start">
            <FormSelect
              className="catalog-status-filter"
              id="tenant-projects-environment-filter"
              value={selectedEnvironment}
              onChange={(_event, value) =>
                setSelectedEnvironment(value as ProjectEnvironmentFilter)
              }
              aria-label="Filter projects by environment"
            >
              {PROJECT_ENVIRONMENT_FILTER_OPTIONS.map((option) => (
                <FormSelectOption key={option.value} value={option.value} label={option.label} />
              ))}
            </FormSelect>
            <SearchInput
              className="catalog-search"
              placeholder="Search projects"
              value={searchValue}
              onChange={(_event, value) => setSearchValue(value)}
              onClear={() => setSearchValue('')}
              aria-label="Search projects"
            />
          </div>
        </div>
      ) : null}

      {sortedProjects.length === 0 ? (
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
                onClick={() => openCreateProject()}
              >
                {TENANT_PROJECTS_TEAMS_DEMO.createFirstProjectLabel}
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      ) : treeRows.length === 0 ? (
        <CatalogFilterEmptyState
          title="No projects match your filters"
          description="Try a different environment or search term."
          onClearFilters={clearAllFilters}
        />
      ) : (
        <div className="catalog-table-panel">
          <CatalogFilterResultsSummary
            filteredCount={filteredProjects.length}
            totalCount={sortedProjects.length}
            singular="project"
            filterParts={filterDescriptionParts}
            onClearFilters={clearAllFilters}
          />
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
              {treeRows.map(({ project, depth, hasChildren, isExpanded }) => {
                const parentProject = project.parentProjectId
                  ? getTenantProjectById(projects, project.parentProjectId)
                  : null

                return (
                  <Tr key={project.id}>
                    <Td dataLabel="Name">
                      <div
                        className="tenant-admin-projects-teams__tree-row"
                        style={
                          {
                            '--tenant-project-tree-depth': depth,
                          } as CSSProperties
                        }
                      >
                        <div className="tenant-admin-projects-teams__name-cell">
                          {hasChildren ? (
                            <Button
                              variant="plain"
                              className="tenant-admin-projects-teams__tree-toggle"
                              aria-label={
                                isExpanded
                                  ? `Collapse ${project.name}`
                                  : `Expand ${project.name}`
                              }
                              aria-expanded={isExpanded}
                              onClick={() => toggleProjectExpanded(project.id)}
                            >
                              {isExpanded ? (
                                <AngleDownIcon aria-hidden />
                              ) : (
                                <AngleRightIcon aria-hidden />
                              )}
                            </Button>
                          ) : (
                            <span className="tenant-admin-projects-teams__tree-spacer" aria-hidden />
                          )}
                          <div className="tenant-admin-projects-teams__name-copy">
                            <Content
                              component="p"
                              className="tenant-admin-projects-teams__primary-cell"
                            >
                              <Button
                                variant="link"
                                isInline
                                className="catalog-table-name-link"
                                onClick={() => openDetails(project)}
                              >
                                {project.name}
                              </Button>
                              {parentProject ? (
                                <Label
                                  color="grey"
                                  isCompact
                                  className="tenant-admin-projects-teams__nested-badge"
                                >
                                  {TENANT_PROJECTS_TEAMS_DEMO.nestedBadgeLabel}
                                </Label>
                              ) : null}
                            </Content>
                            <Content
                              component="p"
                              className="tenant-admin-projects-teams__meta-cell"
                            >
                              {project.id}
                            </Content>
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td dataLabel="Services">
                      {getTenantProjectServicesLabel(instances, project)}
                    </Td>
                    <Td dataLabel="Project members">
                      {getTenantProjectMemberCountLabel(projects, project)}
                    </Td>
                    <Td dataLabel="IP pool">{getTenantProjectPoolLabel(project)}</Td>
                    <Td dataLabel="Instance quota">
                      {getTenantProjectInstanceQuotaLabel(projects, project)}
                    </Td>
                    <Td isActionCell className="tenant-admin-projects-teams__table-action">
                      <ActionsColumn
                        items={getTenantProjectActions(project, {
                          onViewDetails: openDetails,
                          onCreateNested: (parent) => openCreateProject(parent),
                          onEdit: openEditProject,
                          onDelete: openDeleteProject,
                        })}
                      />
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
        </div>
      )}

      {deleteConfirmModal}
    </div>
  )
}
