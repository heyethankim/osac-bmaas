export const TENANT_USER_CATALOG_PAGE = {
  organizationLede: 'Browse and provision catalog items available to your tenant.',
  projectLede: 'Browse and provision catalog items assigned to your project.',
} as const

export const TENANT_USER_PROJECTS_PAGE = {
  lede: 'Projects you belong to. Open a project to see services, catalog items, and teammates.',
} as const

export const DEMO_TENANT_USER_PROJECT_INVITATION = {
  projectEnvironment: 'Development',
  role: 'Developer',
  roleDescription: 'Provision and manage instances',
  invitedByName: 'Priya Nair',
  invitedByEmail: 'pnair@northsummitbank.com',
  instanceQuota: 7,
  resourcesLabel: '80 vCPU \u2022 512 GB RAM',
  organizationPermissionsSummary:
    'As a Developer, you can provision and manage instances across Bare Metal, Cluster, VM, and Models services, manage SSH keys, and monitor your resource usage. You cannot modify tenant quotas or invite other members.',
  projectPermissionsSummary:
    'As a Developer, you can provision and manage instances across Bare Metal, Cluster, VM, and Models services, manage SSH keys, and monitor your resource usage. You cannot modify project quotas or invite other members.',
  organizationScopeNote: 'Your access is scoped to this tenant workspace.',
  projectScopeNotePrefix: 'Your access is scoped to the',
  projectScopeNoteSuffix: 'project only.',
} as const
