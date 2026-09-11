import {
  getEffectiveProjectMembers,
  getTenantRootProject,
  type TenantProject,
  type TenantProjectTreeRow,
} from '../tenantAdmin/projects'

export function normalizeMemberEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isProjectMemberEmail(
  projects: readonly TenantProject[],
  project: TenantProject,
  userEmail: string,
): boolean {
  const normalizedEmail = normalizeMemberEmail(userEmail)
  return getEffectiveProjectMembers(projects, project).some(
    (member) => normalizeMemberEmail(member.email) === normalizedEmail,
  )
}

export function getProjectMembershipForEmail(
  projects: readonly TenantProject[],
  project: TenantProject,
  userEmail: string,
) {
  const normalizedEmail = normalizeMemberEmail(userEmail)
  return (
    getEffectiveProjectMembers(projects, project).find(
      (member) => normalizeMemberEmail(member.email) === normalizedEmail,
    ) ?? null
  )
}

export function isProjectManagerEmail(
  projects: readonly TenantProject[],
  project: TenantProject,
  userEmail: string,
): boolean {
  return getProjectMembershipForEmail(projects, project, userEmail)?.role === 'manager'
}

/** True when the tenant user has manager access on at least one project. */
export function isTenantUserProjectManager(
  projects: readonly TenantProject[],
  userEmail: string,
): boolean {
  return projects.some((project) => isProjectManagerEmail(projects, project, userEmail))
}

export function resolveTenantUserDisplayName(
  projects: readonly TenantProject[],
  email: string,
): string {
  const normalizedEmail = normalizeMemberEmail(email)

  for (const project of projects) {
    for (const member of project.members) {
      if (
        normalizeMemberEmail(member.email) === normalizedEmail &&
        normalizeMemberEmail(member.name) !== normalizedEmail
      ) {
        return member.name
      }
    }
  }

  return email
}

/** Projects the signed-in tenant user can access (direct membership or inherited). */
export function getTenantUserAccessibleProjects(
  projects: readonly TenantProject[],
  userEmail: string,
): TenantProject[] {
  return projects.filter((project) => isProjectMemberEmail(projects, project, userEmail))
}

/** Membership-scoped projects plus the structural Root row for the Projects page tree. */
export function getTenantUserProjectsPageProjects(
  projects: readonly TenantProject[],
  userEmail: string,
): TenantProject[] {
  const accessibleProjects = getTenantUserAccessibleProjects(projects, userEmail)
  const root = getTenantRootProject(projects)

  if (!root || accessibleProjects.some((project) => project.id === root.id)) {
    return accessibleProjects
  }

  return [root, ...accessibleProjects]
}

export function buildTenantUserProjectTreeRows(
  allProjects: readonly TenantProject[],
  accessibleProjects: readonly TenantProject[],
  expandedProjectIds?: ReadonlySet<string>,
): TenantProjectTreeRow[] {
  const accessibleIds = new Set(accessibleProjects.map((project) => project.id))
  const alwaysExpanded = expandedProjectIds === undefined
  const rows: TenantProjectTreeRow[] = []

  const appendRows = (parentId: string | null, depth: number) => {
    const siblings = allProjects
      .filter((project) => accessibleIds.has(project.id))
      .filter((project) => {
        const projectParentId = project.parentProjectId ?? null
        if (parentId === null) {
          return projectParentId === null || !accessibleIds.has(projectParentId)
        }
        return projectParentId === parentId
      })
      .sort((left, right) => left.name.localeCompare(right.name))

    for (const project of siblings) {
      const hasChildren = allProjects.some(
        (child) =>
          accessibleIds.has(child.id) && (child.parentProjectId ?? null) === project.id,
      )
      const isExpanded = alwaysExpanded || expandedProjectIds.has(project.id)

      rows.push({ project, depth, hasChildren, isExpanded })

      if (hasChildren && isExpanded) {
        appendRows(project.id, depth + 1)
      }
    }
  }

  appendRows(null, 0)
  return rows
}
