import { useMemo, type CSSProperties } from 'react'
import { DropdownItem, Label } from '@patternfly/react-core'
import {
  buildTenantProjectScopeTreeRows,
  TENANT_PROJECTS_TEAMS_DEMO,
  type TenantProject,
} from '../../tenantAdmin/projects'

type ProjectTreeDropdownItemsProps = {
  projects: readonly TenantProject[]
  selectedProjectId?: string | null
}

export function ProjectTreeDropdownItems({
  projects,
  selectedProjectId = null,
}: ProjectTreeDropdownItemsProps) {
  const treeRows = useMemo(() => buildTenantProjectScopeTreeRows(projects), [projects])

  return (
    <>
      {treeRows.map(({ project, depth }) => (
        <DropdownItem
          key={project.id}
          value={project.id}
          isSelected={selectedProjectId === project.id}
          className="project-tree-dropdown__item"
        >
          <span
            className="project-tree-dropdown__row"
            style={{ '--tenant-project-tree-depth': depth } as CSSProperties}
          >
            <span className="project-tree-dropdown__name">{project.name}</span>
            {project.parentProjectId ? (
              <Label color="grey" isCompact className="project-tree-dropdown__nested-badge">
                {TENANT_PROJECTS_TEAMS_DEMO.nestedBadgeLabel}
              </Label>
            ) : null}
          </span>
        </DropdownItem>
      ))}
    </>
  )
}
