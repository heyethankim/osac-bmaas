import { ToggleGroup, ToggleGroupItem } from '@patternfly/react-core'
import { ListIcon } from '@patternfly/react-icons/dist/esm/icons/list-icon'
import { ProjectDiagramIcon } from '@patternfly/react-icons/dist/esm/icons/project-diagram-icon'
import type { ProjectsViewMode } from '../../catalog/viewMode'

type ProjectsViewToggleProps = {
  viewMode: ProjectsViewMode
  onChange: (viewMode: ProjectsViewMode) => void
  className?: string
}

export function ProjectsViewToggle({ viewMode, onChange, className }: ProjectsViewToggleProps) {
  return (
    <ToggleGroup
      aria-label="Projects view"
      className={['catalog-view-toggle', className].filter(Boolean).join(' ')}
    >
      <ToggleGroupItem
        icon={<ProjectDiagramIcon />}
        aria-label="Topology view"
        buttonId="projects-view-topology"
        isSelected={viewMode === 'topology'}
        onChange={() => onChange('topology')}
      />
      <ToggleGroupItem
        icon={<ListIcon />}
        aria-label="List view"
        buttonId="projects-view-list"
        isSelected={viewMode === 'list'}
        onChange={() => onChange('list')}
      />
    </ToggleGroup>
  )
}
