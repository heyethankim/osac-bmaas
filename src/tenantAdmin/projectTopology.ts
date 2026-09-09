import type { TenantProject } from './projects'

export function getProjectTopologyVisibleIds(
  filteredProjects: readonly TenantProject[],
  getAncestors: (projectId: string) => TenantProject[],
): Set<string> {
  const visibleIds = new Set(filteredProjects.map((project) => project.id))

  for (const project of filteredProjects) {
    for (const ancestor of getAncestors(project.id)) {
      visibleIds.add(ancestor.id)
    }
  }

  return visibleIds
}
