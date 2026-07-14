import { useMemo, useState } from 'react'
import {
  Button,
  Content,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  Flex,
  FlexItem,
  Title,
} from '@patternfly/react-core'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { AttachCatalogItemToProjectModal } from '../../components/tenant-admin/AttachCatalogItemToProjectModal'
import { CreateTenantProjectWizard } from '../../components/tenant-admin/CreateTenantProjectWizard'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import { getProviderCatalogDraft } from '../../providerSetup/storage'
import { resolveTenantCatalogView } from '../../tenantAdmin/catalog'
import { getProjectCatalogOptions, getWizardCatalogOptions } from '../../tenantAdmin/catalogItems'
import {
  getTenantProjectActions,
  getTenantProjectCatalogLabel,
  getTenantProjectMemberCountLabel,
  getTenantProjectPoolLabel,
  getTotalAllocatedInstanceQuota,
  TENANT_PROJECTS_TEAMS_DEMO,
  type TenantProject,
} from '../../tenantAdmin/projects'
import {
  addTenantProject,
  getTenantCatalogItems,
  removeTenantProject,
  setTenantProjectCatalogItems,
} from '../../tenantAdmin/storage'

type TenantAdminProjectsTeamsPageProps = {
  tenantSlug: string
  organization: RegisteredOrganization
  projects: TenantProject[]
  onProjectsChange: (projects: TenantProject[]) => void
}

export function TenantAdminProjectsTeamsPage({
  tenantSlug,
  organization,
  projects,
  onProjectsChange,
}: TenantAdminProjectsTeamsPageProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [attachProject, setAttachProject] = useState<TenantProject | null>(null)
  const allocatedInstanceQuota = getTotalAllocatedInstanceQuota(projects)
  const remainingInstanceQuota = Math.max(0, organization.maxInstances - allocatedInstanceQuota)

  const wizardCatalogOptions = useMemo(() => getWizardCatalogOptions(), [])

  const catalogOptions = useMemo(() => {
    const catalogDraft = getProviderCatalogDraft()
    const catalogView = resolveTenantCatalogView(organization, catalogDraft)

    return getProjectCatalogOptions(
      catalogView
        ? {
            catalogItemId: catalogView.catalogItemId,
            displayName: catalogView.displayName,
            rateCard: catalogView.rateCard,
          }
        : null,
      getTenantCatalogItems(tenantSlug),
    )
  }, [organization, tenantSlug])

  const sortedProjects = useMemo(
    () => [...projects].sort((left, right) => left.name.localeCompare(right.name)),
    [projects],
  )

  const handleCreateProject = (project: TenantProject) => {
    addTenantProject(tenantSlug, project)
    onProjectsChange([...projects, project])
  }

  const handleDeleteProject = (projectId: string) => {
    onProjectsChange(removeTenantProject(tenantSlug, projectId))
  }

  const handleSaveCatalogItems = (
    projectId: string,
    catalogItems: TenantProject['catalogItems'],
  ) => {
    onProjectsChange(setTenantProjectCatalogItems(tenantSlug, projectId, catalogItems))
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
              isDisabled={remainingInstanceQuota <= 0}
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
        <Table
          aria-label="Tenant projects"
          variant="compact"
          borders={false}
          className="tenant-admin-projects-teams__table"
        >
          <Thead>
            <Tr>
              <Th>Project</Th>
              <Th>Instance quota</Th>
              <Th>Catalog</Th>
              <Th>Team members</Th>
              <Th>IP pool</Th>
              <Th screenReaderText="Management" />
            </Tr>
          </Thead>
          <Tbody>
            {sortedProjects.map((project) => (
              <Tr key={project.id}>
                <Td modifier="wrap" dataLabel="Project">
                  {project.name}
                </Td>
                <Td modifier="wrap" dataLabel="Instance quota">
                  {project.instanceQuota} instances
                </Td>
                <Td modifier="wrap" dataLabel="Catalog">
                  {getTenantProjectCatalogLabel(project)}
                </Td>
                <Td modifier="wrap" dataLabel="Team members">
                  {getTenantProjectMemberCountLabel(project)}
                </Td>
                <Td modifier="wrap" dataLabel="IP pool">
                  {getTenantProjectPoolLabel(project)}
                </Td>
                <Td isActionCell className="tenant-admin-projects-teams__table-action">
                  <ActionsColumn
                    items={getTenantProjectActions(project, {
                      onAttachCatalog: setAttachProject,
                      onDelete: handleDeleteProject,
                    })}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
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
                isDisabled={remainingInstanceQuota <= 0}
              >
                {TENANT_PROJECTS_TEAMS_DEMO.createFirstProjectLabel}
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      )}

      <CreateTenantProjectWizard
        isOpen={isCreateModalOpen}
        organization={organization}
        allocatedInstanceQuota={allocatedInstanceQuota}
        catalogOptions={wizardCatalogOptions}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateProject}
      />

      <AttachCatalogItemToProjectModal
        project={attachProject}
        catalogOptions={catalogOptions}
        onClose={() => setAttachProject(null)}
        onSave={handleSaveCatalogItems}
      />
    </div>
  )
}
