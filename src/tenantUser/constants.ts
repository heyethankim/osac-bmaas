export const TENANT_USER_ACCEPT_INVITATION_INTRO = {
  badge: 'Platform invitation',
  organizationTitle: 'You\u2019ve been invited to join a workspace',
  projectTitle: 'You\u2019ve been invited to join a project',
} as const

export const TENANT_USER_CATALOG_PAGE = {
  organizationLede: 'Browse and provision catalog items available to your organization.',
  projectLede: 'Browse and provision catalog items assigned to your project.',
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
    'As a Developer, you can provision and manage instances across Bare Metal, Cluster, VM, and Models services, manage SSH keys, and monitor your resource usage. You cannot modify organization quotas or invite other members.',
  projectPermissionsSummary:
    'As a Developer, you can provision and manage instances across Bare Metal, Cluster, VM, and Models services, manage SSH keys, and monitor your resource usage. You cannot modify project quotas or invite other members.',
  organizationScopeNote: 'Your access is scoped to this organization workspace.',
  projectScopeNotePrefix: 'Your access is scoped to the',
  projectScopeNoteSuffix: 'project only.',
} as const
