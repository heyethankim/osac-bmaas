import {
  getAssignableTenantRole,
  type AssignableTenantRoleId,
} from './administrators'
import { DEMO_TENANT_ROOT_PROJECT_ID } from './projectIds'
import { getTenantProjects } from './storage'
import {
  addTenantSecret,
  buildTenantSecretData,
  deleteTenantSecret,
  ensureTenantDemoSecrets,
  getSecretById,
  type TenantSecret,
} from '../tenant/secrets'
import {
  isValidKubernetesResourceName,
  KUBERNETES_RESOURCE_NAME_MAX_LENGTH,
} from '../shared/kubernetesResourceName'

export const TENANT_SERVICE_ACCOUNTS_DEMO = {
  title: 'Service accounts',
  lede: 'Create non-human accounts for CI systems and other automation.',
  createLabel: 'Create service account',
  emptyTitle: 'No service accounts yet',
  emptyBody: 'Create one for a tool or pipeline that needs access.',
  emptyFilteredTitle: 'No service accounts match your filters',
  emptyFilteredBody: 'Try a different project or search term, or clear filters.',
  createKeyLabel: 'Create key',
  bindRoleLabel: 'Grant role',
  keysSectionHelp: 'Keys authenticate as this account.',
  rolesSectionHelp: 'Grant a tenant role so this account can access resources.',
} as const

export type ServiceAccountRoleBinding = {
  id: string
  roleId: AssignableTenantRoleId
  createdAt: string
}

export type TenantServiceAccount = {
  id: string
  name: string
  description: string
  /** Always project-scoped (OCP/K8s namespace equivalent). */
  projectId: string
  projectName: string
  createdAt: string
  labels: string[]
  /** Token secrets in the tenant vault linked to this service account. */
  tokenSecretIds: string[]
  /** RoleBindings granting this SA access (managed separately from the identity). */
  roleBindings: ServiceAccountRoleBinding[]
}

export type ServiceAccountProjectFilter = 'all' | string

const STORAGE_KEY_PREFIX = 'bmaas-tenant-service-accounts-v2-'

export const DEMO_CI_PIPELINE_SERVICE_ACCOUNT_ID = 'demo-sa-ci-pipeline'
export const DEMO_OBSERVABILITY_SERVICE_ACCOUNT_ID = 'demo-sa-observability'
export const DEMO_CI_PIPELINE_TOKEN_SECRET_ID = 'demo-sa-token-ci-pipeline'
export const DEMO_OBSERVABILITY_TOKEN_SECRET_ID = 'demo-sa-token-observability'

const SERVICE_ACCOUNT_SECRET_LABEL = 'service-account'
const SERVICE_ACCOUNT_NAME_LABEL_PREFIX = 'kubernetes.io/service-account.name='

function getStorageKey(tenantSlug: string): string {
  return `${STORAGE_KEY_PREFIX}${tenantSlug}`
}

function isAssignableTenantRoleId(value: unknown): value is AssignableTenantRoleId {
  return (
    value === 'tenant-administrator' || value === 'tenant-reader' || value === 'tenant-user'
  )
}

function isRoleBinding(value: unknown): value is ServiceAccountRoleBinding {
  if (!value || typeof value !== 'object') {
    return false
  }
  const entry = value as ServiceAccountRoleBinding
  return (
    typeof entry.id === 'string' &&
    isAssignableTenantRoleId(entry.roleId) &&
    typeof entry.createdAt === 'string'
  )
}

function isTenantServiceAccount(value: unknown): value is TenantServiceAccount {
  if (!value || typeof value !== 'object') {
    return false
  }

  const entry = value as TenantServiceAccount
  return (
    typeof entry.id === 'string' &&
    typeof entry.name === 'string' &&
    typeof entry.description === 'string' &&
    typeof entry.projectId === 'string' &&
    typeof entry.projectName === 'string' &&
    typeof entry.createdAt === 'string' &&
    Array.isArray(entry.labels) &&
    entry.labels.every((label) => typeof label === 'string') &&
    Array.isArray(entry.tokenSecretIds) &&
    entry.tokenSecretIds.every((id) => typeof id === 'string') &&
    Array.isArray(entry.roleBindings) &&
    entry.roleBindings.every(isRoleBinding)
  )
}

function readStoredAccounts(tenantSlug: string): TenantServiceAccount[] | null {
  try {
    const raw = window.localStorage.getItem(getStorageKey(tenantSlug))
    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return null
    }

    return parsed.filter(isTenantServiceAccount)
  } catch {
    return null
  }
}

function writeStoredAccounts(tenantSlug: string, accounts: readonly TenantServiceAccount[]): void {
  window.localStorage.setItem(getStorageKey(tenantSlug), JSON.stringify(accounts))
}

function createSecretToken(): string {
  const random = Array.from(crypto.getRandomValues(new Uint8Array(18)))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  return `osa_sa_${random}`
}

function serviceAccountNameLabel(name: string): string {
  return `${SERVICE_ACCOUNT_NAME_LABEL_PREFIX}${name}`
}

function buildTokenSecret(input: {
  id: string
  accountName: string
  projectId: string
  token: string
  createdAt: string
}): TenantSecret {
  return {
    id: input.id,
    name: `${input.accountName}-token`,
    type: 'single-value',
    usage: 'general',
    createdAt: input.createdAt,
    summary: `API token for service account ${input.accountName}`,
    description: `Token secret for service account ${input.accountName}`,
    labels: [SERVICE_ACCOUNT_SECRET_LABEL, serviceAccountNameLabel(input.accountName)],
    projectId: input.projectId,
    data: buildTenantSecretData('single-value', [{ key: 'token', value: input.token }]),
  }
}

function ensureDemoTokenSecrets(tenantSlug: string): void {
  ensureTenantDemoSecrets(tenantSlug)

  const demos = [
    {
      id: DEMO_CI_PIPELINE_TOKEN_SECRET_ID,
      accountName: 'ci-pipeline',
      token: 'osa_sa_demo_ci_pipeline_token_7f3a91c2e8b04d6a',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    },
    {
      id: DEMO_OBSERVABILITY_TOKEN_SECRET_ID,
      accountName: 'observability-exporter',
      token: 'osa_sa_demo_observability_token_b2c9e14f0a775d31',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    },
  ] as const

  for (const demo of demos) {
    if (getSecretById('tenant', tenantSlug, demo.id)) {
      continue
    }
    addTenantSecret(
      tenantSlug,
      buildTokenSecret({
        id: demo.id,
        accountName: demo.accountName,
        projectId: DEMO_TENANT_ROOT_PROJECT_ID,
        token: demo.token,
        createdAt: demo.createdAt,
      }),
    )
  }
}

function buildDemoServiceAccounts(tenantSlug: string): TenantServiceAccount[] {
  const projects = getTenantProjects(tenantSlug)
  const rootProject =
    projects.find((project) => project.id === DEMO_TENANT_ROOT_PROJECT_ID) ?? projects[0]
  if (!rootProject) {
    return []
  }

  ensureDemoTokenSecrets(tenantSlug)
  const now = Date.now()

  return [
    {
      id: DEMO_CI_PIPELINE_SERVICE_ACCOUNT_ID,
      name: 'ci-pipeline',
      description: 'GitHub Actions and Tekton jobs that call the API.',
      projectId: rootProject.id,
      projectName: rootProject.name,
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 12).toISOString(),
      labels: ['ci'],
      tokenSecretIds: [DEMO_CI_PIPELINE_TOKEN_SECRET_ID],
      roleBindings: [
        {
          id: 'binding-ci-tenant-user',
          roleId: 'tenant-user',
          createdAt: new Date(now - 1000 * 60 * 60 * 24 * 12).toISOString(),
        },
      ],
    },
    {
      id: DEMO_OBSERVABILITY_SERVICE_ACCOUNT_ID,
      name: 'observability-exporter',
      description: 'Read-only metrics and inventory export for the observability stack.',
      projectId: rootProject.id,
      projectName: rootProject.name,
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 5).toISOString(),
      labels: ['observability'],
      tokenSecretIds: [DEMO_OBSERVABILITY_TOKEN_SECRET_ID],
      roleBindings: [
        {
          id: 'binding-obs-tenant-reader',
          roleId: 'tenant-reader',
          createdAt: new Date(now - 1000 * 60 * 60 * 24 * 5).toISOString(),
        },
      ],
    },
  ]
}

export function ensureTenantDemoServiceAccounts(tenantSlug: string): TenantServiceAccount[] {
  const existing = readStoredAccounts(tenantSlug)
  if (existing) {
    ensureDemoTokenSecrets(tenantSlug)
    return sortServiceAccounts(existing)
  }

  const seeded = buildDemoServiceAccounts(tenantSlug)
  writeStoredAccounts(tenantSlug, seeded)
  return sortServiceAccounts(seeded)
}

export function listTenantServiceAccounts(tenantSlug: string): TenantServiceAccount[] {
  return ensureTenantDemoServiceAccounts(tenantSlug)
}

export function getTenantServiceAccountById(
  tenantSlug: string,
  id: string,
): TenantServiceAccount | null {
  return listTenantServiceAccounts(tenantSlug).find((account) => account.id === id) ?? null
}

export function isServiceAccountNameTaken(
  tenantSlug: string,
  name: string,
  projectId: string,
  excludeId?: string,
): boolean {
  const normalized = name.trim().toLowerCase()
  if (!normalized) {
    return false
  }

  return listTenantServiceAccounts(tenantSlug).some(
    (account) =>
      account.id !== excludeId &&
      account.projectId === projectId &&
      account.name.trim().toLowerCase() === normalized,
  )
}

export function validateServiceAccountName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) {
    return 'Enter a name.'
  }
  if (trimmed.length > KUBERNETES_RESOURCE_NAME_MAX_LENGTH) {
    return `At most ${KUBERNETES_RESOURCE_NAME_MAX_LENGTH} characters.`
  }
  if (!isValidKubernetesResourceName(trimmed)) {
    return 'Use lowercase letters, numbers, and hyphens.'
  }
  return null
}

export type CreateTenantServiceAccountInput = {
  name: string
  description: string
  projectId: string
  projectName: string
  labels?: string[]
}

export function createTenantServiceAccount(
  tenantSlug: string,
  input: CreateTenantServiceAccountInput,
): TenantServiceAccount | null {
  const name = input.name.trim().toLowerCase()
  if (
    validateServiceAccountName(name) ||
    !input.projectId ||
    isServiceAccountNameTaken(tenantSlug, name, input.projectId)
  ) {
    return null
  }

  const account: TenantServiceAccount = {
    id: `sa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    description: input.description.trim(),
    projectId: input.projectId,
    projectName: input.projectName,
    createdAt: new Date().toISOString(),
    labels: (input.labels ?? []).map((label) => label.trim()).filter(Boolean),
    tokenSecretIds: [],
    roleBindings: [],
  }

  const next = sortServiceAccounts([...listTenantServiceAccounts(tenantSlug), account])
  writeStoredAccounts(tenantSlug, next)
  return account
}

export type UpdateTenantServiceAccountInput = {
  name: string
  description: string
  projectId: string
  projectName: string
  labels?: string[]
}

export function updateTenantServiceAccount(
  tenantSlug: string,
  id: string,
  input: UpdateTenantServiceAccountInput,
): TenantServiceAccount | null {
  const current = listTenantServiceAccounts(tenantSlug)
  const index = current.findIndex((account) => account.id === id)
  if (index < 0) {
    return null
  }

  const name = input.name.trim().toLowerCase()
  if (
    validateServiceAccountName(name) ||
    !input.projectId ||
    isServiceAccountNameTaken(tenantSlug, name, input.projectId, id)
  ) {
    return null
  }

  const existing = current[index]!
  const updated: TenantServiceAccount = {
    ...existing,
    name,
    description: input.description.trim(),
    projectId: input.projectId,
    projectName: input.projectName,
    labels:
      input.labels !== undefined
        ? input.labels.map((label) => label.trim()).filter(Boolean)
        : existing.labels,
  }
  const next = [...current]
  next[index] = updated
  const sorted = sortServiceAccounts(next)
  writeStoredAccounts(tenantSlug, sorted)
  return updated
}

export function deleteTenantServiceAccount(tenantSlug: string, id: string): TenantServiceAccount[] {
  const account = getTenantServiceAccountById(tenantSlug, id)
  if (account) {
    for (const secretId of account.tokenSecretIds) {
      deleteTenantSecret(tenantSlug, secretId)
    }
  }

  const next = listTenantServiceAccounts(tenantSlug).filter((entry) => entry.id !== id)
  writeStoredAccounts(tenantSlug, next)
  return next
}

function replaceAccount(
  tenantSlug: string,
  account: TenantServiceAccount,
): TenantServiceAccount {
  const current = listTenantServiceAccounts(tenantSlug)
  const next = current.map((entry) => (entry.id === account.id ? account : entry))
  writeStoredAccounts(tenantSlug, sortServiceAccounts(next))
  return account
}

export function createServiceAccountToken(
  tenantSlug: string,
  accountId: string,
): { account: TenantServiceAccount; secret: TenantSecret; token: string } | null {
  const account = getTenantServiceAccountById(tenantSlug, accountId)
  if (!account) {
    return null
  }

  const token = createSecretToken()
  const createdAt = new Date().toISOString()
  const secret = buildTokenSecret({
    id: `sa-token-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    accountName: account.name,
    projectId: account.projectId,
    token,
    createdAt,
  })
  addTenantSecret(tenantSlug, secret)

  const updated = replaceAccount(tenantSlug, {
    ...account,
    tokenSecretIds: [...account.tokenSecretIds, secret.id],
  })

  return { account: updated, secret, token }
}

export function deleteServiceAccountToken(
  tenantSlug: string,
  accountId: string,
  secretId: string,
): TenantServiceAccount | null {
  const account = getTenantServiceAccountById(tenantSlug, accountId)
  if (!account) {
    return null
  }

  deleteTenantSecret(tenantSlug, secretId)
  return replaceAccount(tenantSlug, {
    ...account,
    tokenSecretIds: account.tokenSecretIds.filter((id) => id !== secretId),
  })
}

export function listServiceAccountTokenSecrets(
  tenantSlug: string,
  account: TenantServiceAccount,
): TenantSecret[] {
  ensureTenantDemoSecrets(tenantSlug)
  return account.tokenSecretIds
    .map((id) => getSecretById('tenant', tenantSlug, id))
    .filter((secret): secret is TenantSecret => Boolean(secret))
}

export function getServiceAccountTokenValue(secret: TenantSecret): string {
  return (
    secret.data.pairs.find((pair) => pair.key === 'token')?.value ??
    secret.data.pairs.find((pair) => pair.key === 'value')?.value ??
    secret.data.pairs[0]?.value ??
    ''
  )
}

export function bindServiceAccountRole(
  tenantSlug: string,
  accountId: string,
  roleId: AssignableTenantRoleId,
): TenantServiceAccount | null {
  const account = getTenantServiceAccountById(tenantSlug, accountId)
  if (!account) {
    return null
  }

  if (account.roleBindings.some((binding) => binding.roleId === roleId)) {
    return account
  }

  return replaceAccount(tenantSlug, {
    ...account,
    roleBindings: [
      ...account.roleBindings,
      {
        id: `binding-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        roleId,
        createdAt: new Date().toISOString(),
      },
    ],
  })
}

export function unbindServiceAccountRole(
  tenantSlug: string,
  accountId: string,
  bindingId: string,
): TenantServiceAccount | null {
  const account = getTenantServiceAccountById(tenantSlug, accountId)
  if (!account) {
    return null
  }

  return replaceAccount(tenantSlug, {
    ...account,
    roleBindings: account.roleBindings.filter((binding) => binding.id !== bindingId),
  })
}

function compareServiceAccounts(
  left: TenantServiceAccount,
  right: TenantServiceAccount,
): number {
  return right.createdAt.localeCompare(left.createdAt)
}

export function sortServiceAccounts(
  accounts: readonly TenantServiceAccount[],
): TenantServiceAccount[] {
  return [...accounts].sort(compareServiceAccounts)
}

export function formatServiceAccountCreatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatServiceAccountCreatedAtLong(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function getServiceAccountRoleLabel(roleId: AssignableTenantRoleId): string {
  return getAssignableTenantRole(roleId).label
}

/** Synthetic principal id for service account role assignment rows. */
export function getServiceAccountPrincipalEmail(account: TenantServiceAccount): string {
  return `serviceAccount:${account.name}@${account.projectName}`
}

export type ServiceAccountRoleAssignmentRow = {
  name: string
  email: string
  isPrimary: false
  roleId: AssignableTenantRoleId
  subjectType: 'service-account'
  serviceAccountId: string
  serviceAccountProjectName: string
  roleBindingId: string
}

/** Role bindings stored on service accounts — shown on the Roles page as principals. */
export function listServiceAccountRoleAssignments(
  tenantSlug: string,
): ServiceAccountRoleAssignmentRow[] {
  return listTenantServiceAccounts(tenantSlug).flatMap((account) =>
    account.roleBindings.map((binding) => ({
      name: account.name,
      email: getServiceAccountPrincipalEmail(account),
      isPrimary: false as const,
      roleId: binding.roleId,
      subjectType: 'service-account' as const,
      serviceAccountId: account.id,
      serviceAccountProjectName: account.projectName,
      roleBindingId: binding.id,
    })),
  )
}

export function isServiceAccountRoleAlreadyBound(
  tenantSlug: string,
  accountId: string,
  roleId: AssignableTenantRoleId,
): boolean {
  const account = getTenantServiceAccountById(tenantSlug, accountId)
  return Boolean(account?.roleBindings.some((binding) => binding.roleId === roleId))
}

export function buildServiceAccountFilterParts(
  searchValue: string,
  selectedProject: ServiceAccountProjectFilter = 'all',
): string[] {
  const parts: string[] = []

  if (selectedProject !== 'all') {
    parts.push(`project: ${selectedProject}`)
  }

  if (searchValue.trim()) {
    parts.push(`search: "${searchValue.trim()}"`)
  }

  return parts
}

const DEMO_SERVICE_ACCOUNT_NAME_CANDIDATES = [
  'jenkins-deployer',
  'github-actions',
  'tekton-runner',
  'argo-workflow',
  'ci-bot',
] as const

/** Prefill a name that is free in the selected project so the wizard opens valid. */
export function buildDemoCreateServiceAccountForm(
  tenantSlug: string,
  defaultProjectId: string | null,
): {
  name: string
  description: string
  projectId: string | null
} {
  const projectId = defaultProjectId
  let name: string = DEMO_SERVICE_ACCOUNT_NAME_CANDIDATES[0]

  if (projectId) {
    const available = DEMO_SERVICE_ACCOUNT_NAME_CANDIDATES.find(
      (candidate) => !isServiceAccountNameTaken(tenantSlug, candidate, projectId),
    )
    if (available) {
      name = available
    } else {
      let suffix = 2
      while (isServiceAccountNameTaken(tenantSlug, `jenkins-deployer-${suffix}`, projectId)) {
        suffix += 1
      }
      name = `jenkins-deployer-${suffix}`
    }
  }

  return {
    name,
    description: 'CI jobs that call the API.',
    projectId,
  }
}
