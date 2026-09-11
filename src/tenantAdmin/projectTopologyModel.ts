import type { EdgeModel, Model, NodeModel } from '@patternfly/react-topology'
import { NodeShape, NodeStatus } from '@patternfly/react-topology'
import type { TenantInstance } from '../tenantUser/instances'
import {
  getChildTenantProjects,
  getInstancesForTenantProject,
  getTenantProjectMemberCountLabel,
  getTenantRootProject,
  isTenantRootProject,
  type TenantProject,
} from './projects'

const NODE_DIAMETER = 75
const TOPOLOGY_LAYOUT = 'Dagre'
/** Group hull inset — node bounds exclude labels/kebab, so this must stay generous. */
const TOPOLOGY_GROUP_PADDING = 56

/** Dagre spacing tuned for compact top-down project trees (labels sit below nodes). */
export const PROJECT_TOPOLOGY_DAGRE_OPTIONS = {
  nodeDistance: 24,
  linkDistance: 16,
  ranksep: 20,
  rankdir: 'TB' as const,
}

function getServicesSummary(instances: readonly TenantInstance[], project: TenantProject): string {
  const count = getInstancesForTenantProject(instances, project).length
  if (count === 0) {
    return 'No services'
  }
  return count === 1 ? '1 service' : `${count} services`
}

function collectVisibleDescendantIds(
  projects: readonly TenantProject[],
  parentId: string,
  visibleIds: ReadonlySet<string>,
): string[] {
  const ids: string[] = []

  for (const child of getChildTenantProjects(projects, parentId)) {
    if (!visibleIds.has(child.id)) {
      continue
    }
    ids.push(child.id)
    ids.push(...collectVisibleDescendantIds(projects, child.id, visibleIds))
  }

  return ids
}

export function buildProjectTopologyModel(
  projectCatalog: readonly TenantProject[],
  visibleIds: ReadonlySet<string>,
  highlightedIds: ReadonlySet<string>,
  instances: readonly TenantInstance[],
  showActionsMenu = false,
  creatingProjectId: string | null = null,
): Model {
  const nodes: NodeModel[] = []
  const edges: EdgeModel[] = []
  const root = getTenantRootProject(projectCatalog)

  for (const project of projectCatalog) {
    if (!visibleIds.has(project.id)) {
      continue
    }

    const isRoot = isTenantRootProject(project)
    const isCreating = creatingProjectId === project.id
    nodes.push({
      id: project.id,
      type: 'node',
      label: project.name,
      width: NODE_DIAMETER,
      height: NODE_DIAMETER,
      shape: isRoot ? NodeShape.rect : NodeShape.circle,
      status: NodeStatus.default,
      data: {
        projectId: project.id,
        isRoot,
        isCreating,
        isHighlighted: highlightedIds.has(project.id),
        secondaryLabel: isCreating
          ? 'Creating project…'
          : `${getServicesSummary(instances, project)} · ${getTenantProjectMemberCountLabel(projectCatalog, project)}`,
        showActionsMenu: showActionsMenu && !isCreating,
      },
    })

    if (project.parentProjectId && visibleIds.has(project.parentProjectId)) {
      edges.push({
        id: `edge-${project.parentProjectId}-${project.id}`,
        type: 'edge',
        source: project.parentProjectId,
        target: project.id,
      })
    }
  }

  if (root && visibleIds.has(root.id)) {
    for (const branchRoot of getChildTenantProjects(projectCatalog, root.id)) {
      if (!visibleIds.has(branchRoot.id)) {
        continue
      }

      const descendants = collectVisibleDescendantIds(projectCatalog, branchRoot.id, visibleIds)
      if (descendants.length === 0) {
        continue
      }

      nodes.push({
        id: `group-${branchRoot.id}`,
        type: 'group',
        group: true,
        label: branchRoot.name,
        children: [branchRoot.id, ...descendants],
        style: {
          padding: TOPOLOGY_GROUP_PADDING,
        },
      })
    }
  }

  return {
    nodes,
    edges,
    graph: {
      id: 'tenant-projects-topology',
      type: 'graph',
      layout: TOPOLOGY_LAYOUT,
    },
  }
}

export const PROJECT_TOPOLOGY_LAYOUT = TOPOLOGY_LAYOUT
