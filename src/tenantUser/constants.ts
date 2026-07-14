export const TENANT_USER_ACCEPT_INVITATION_INTRO = {
  badge: 'Platform invitation',
  title: 'You\u2019ve been invited to join a project',
} as const

export const TENANT_USER_CATALOG_PAGE = {
  lede: 'Browse and provision catalog items assigned to your project.',
} as const

export const DEMO_TENANT_USER_PROJECT_INVITATION = {
  projectName: 'Machine Learning Dev Team',
  projectEnvironment: 'Development',
  role: 'Developer',
  roleDescription: 'Provision and manage instances',
  invitedByName: 'Priya Nair',
  invitedByEmail: 'pnair@northsummitbank.com',
  instanceQuota: 7,
  resourcesLabel: '80 vCPU \u2022 512 GB RAM',
  permissionsSummary:
    'As a Developer, you can provision and manage bare metal instances, manage SSH keys, and monitor your resource usage. You cannot modify project quotas or invite other members.',
  scopeNote: 'Your access is scoped to the Machine Learning Dev Team project only.',
} as const
