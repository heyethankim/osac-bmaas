import { useState } from 'react'
import {
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  Icon,
  MenuToggle,
} from '@patternfly/react-core'
import { FolderOpenIcon } from '@patternfly/react-icons/dist/esm/icons/folder-open-icon'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import { CreateTenantProjectWizard } from '../tenant-admin/CreateTenantProjectWizard'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import { getWorkspaceOrganization } from '../../tenantAdmin/organizations'
import {
  TENANT_PROJECTS_TEAMS_DEMO,
  type TenantProject,
} from '../../tenantAdmin/projects'
import { addTenantProject } from '../../tenantAdmin/storage'
import {
  ALL_PROJECTS_SCOPE_ID,
  getProjectScopeLabel,
  type ProjectScopeId,
} from '../../tenantUser/projectScope'

type ProjectScopeSwitcherProps = {
  tenantSlug: string
  projects: readonly TenantProject[]
  selectedScopeId: ProjectScopeId
  onChange: (scopeId: ProjectScopeId) => void
  organization: RegisteredOrganization | null
  onProjectsChange: (projects: TenantProject[]) => void
  id?: string
}

export function ProjectScopeSwitcher({
  tenantSlug,
  projects,
  selectedScopeId,
  onChange,
  organization,
  onProjectsChange,
  id = 'project-scope-switcher',
}: ProjectScopeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false)
  const resolvedOrganization = organization ?? getWorkspaceOrganization(tenantSlug)
  const selectedLabel = getProjectScopeLabel(tenantSlug, selectedScopeId)

  const openCreateWizard = () => {
    setIsOpen(false)
    setIsCreateWizardOpen(true)
  }

  const handleCreateProject = (project: TenantProject) => {
    addTenantProject(tenantSlug, project)
    onProjectsChange([...projects, project])
    onChange(project.id)
    setIsCreateWizardOpen(false)
  }

  return (
    <div className="project-scope-switcher">
      <Dropdown
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        onSelect={(_event, value) => {
          if (value == null) {
            return
          }
          onChange(String(value) as ProjectScopeId)
          setIsOpen(false)
        }}
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            id={id}
            isExpanded={isOpen}
            onClick={() => setIsOpen((open) => !open)}
            aria-label={`Project: ${selectedLabel}`}
            className="project-scope-switcher__toggle"
            icon={
              <Icon className="project-scope-switcher__icon">
                <FolderOpenIcon aria-hidden />
              </Icon>
            }
          >
            Project: {selectedLabel}
          </MenuToggle>
        )}
      >
        <DropdownList>
          <DropdownItem
            value={ALL_PROJECTS_SCOPE_ID}
            isSelected={selectedScopeId === ALL_PROJECTS_SCOPE_ID}
          >
            All projects
          </DropdownItem>
          {projects.map((project) => (
            <DropdownItem
              key={project.id}
              value={project.id}
              isSelected={selectedScopeId === project.id}
            >
              {project.name}
            </DropdownItem>
          ))}
          <Divider component="li" key="create-project-separator" />
          <DropdownItem icon={<PlusIcon />} onClick={openCreateWizard}>
            {TENANT_PROJECTS_TEAMS_DEMO.createProjectLabel}
          </DropdownItem>
        </DropdownList>
      </Dropdown>

      <CreateTenantProjectWizard
        isOpen={isCreateWizardOpen}
        organization={resolvedOrganization}
        onClose={() => setIsCreateWizardOpen(false)}
        onCreate={handleCreateProject}
      />
    </div>
  )
}
