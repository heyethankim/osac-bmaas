import {
  getEffectiveProjectMembers,
  type TenantProject,
  type TenantProjectScopeTreeRow,
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

/** Projects the signed-in tenant user can access (direct membership or inherited). */
export function getTenantUserAccessibleProjects(
  projects: readonly TenantProject[],
  userEmail: string,
): TenantProject[] {
  return projects.filter((project) => isProjectMemberEmail(projects, project, userEmail))
}

export function buildTenantUserProjectTreeRows(
  allProjects: readonly TenantProject[],
  accessibleProjects: readonly TenantProject[],
): TenantProjectScopeTreeRow[] {
  const accessibleIds = new Set(accessibleProjects.map((project) => project.id))
  const rows: TenantProjectScopeTreeRow[] = []

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
      rows.push({ project, depth })
      appendRows(project.id, depth + 1)
    }
  }

  appendRows(null, 0)
  return rows
}
