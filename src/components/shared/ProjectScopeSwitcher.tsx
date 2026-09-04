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
import { ProjectTreeDropdownItems } from './ProjectTreeDropdownItems'
import {
  TENANT_PROJECTS_TEAMS_DEMO,
  type TenantProject,
} from '../../tenantAdmin/projects'
import {
  ALL_PROJECTS_SCOPE_ID,
  getProjectScopeLabel,
  type ProjectScopeId,
} from '../../tenantUser/projectScope'
import { buildTenantUserProjectTreeRows } from '../../tenantUser/projects'

type ProjectScopeSwitcherProps = {
  tenantSlug: string
  projects: readonly TenantProject[]
  allProjects?: readonly TenantProject[]
  selectedScopeId: ProjectScopeId
  onChange: (scopeId: ProjectScopeId) => void
  onNavigateToCreateProject?: () => void
  id?: string
}

export function ProjectScopeSwitcher({
  tenantSlug,
  projects,
  allProjects,
  selectedScopeId,
  onChange,
  onNavigateToCreateProject,
  id = 'project-scope-switcher',
}: ProjectScopeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedLabel = getProjectScopeLabel(tenantSlug, selectedScopeId, projects)
  const treeRows = buildTenantUserProjectTreeRows(allProjects ?? projects, projects)

  const handleCreateProject = () => {
    setIsOpen(false)
    onNavigateToCreateProject?.()
  }

  return (
    <div className="project-scope-switcher pill-filter-select pill-filter-select--organization">
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
            className="project-scope-switcher__toggle pill-filter-select__toggle"
            icon={
              <Icon className="project-scope-switcher__icon pill-filter-select__icon">
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
          <ProjectTreeDropdownItems
            projects={projects}
            treeRows={treeRows}
            selectedProjectId={
              selectedScopeId === ALL_PROJECTS_SCOPE_ID ? null : selectedScopeId
            }
          />
          {onNavigateToCreateProject ? (
            <>
              <Divider component="li" key="create-project-separator" />
              <DropdownItem icon={<PlusIcon />} onClick={handleCreateProject}>
                {TENANT_PROJECTS_TEAMS_DEMO.createProjectLabel}
              </DropdownItem>
            </>
          ) : null}
        </DropdownList>
      </Dropdown>
    </div>
  )
}
