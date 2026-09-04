import type { TenantSecretData, TenantSecretType, TenantSecretUsage } from './secretTypes'
import { CLUSTER_LAUNCH_INSTANCE_DEMO } from '../tenantUser/launchInstanceWizard'

export type {
  StoredImagePullCredential,
  StoredKeyValuePair,
  TenantSecretData,
  TenantSecretType,
  TenantSecretUsage,
} from './secretTypes'

export { buildTenantSecretData } from './secretTypes'

export const TENANT_SECRET_TYPE_OPTIONS: ReadonlyArray<{
  id: TenantSecretType
  label: string
}> = [
  { id: 'key-value', label: 'Key/value' },
  { id: 'image-pull', label: 'Image pull' },
  { id: 'source', label: 'Source' },
  { id: 'webhook', label: 'Webhook' },
]

export const TENANT_SECRETS_COPY = {
  title: 'Secrets',
  lede: 'Store credentials for use at launch. Encrypted at rest in the platform vault.',
  emptyTitle: 'No secrets yet',
  emptyBody: 'Add your first secret to get started.',
  createSecretTypeLabel: 'Create secret type',
} as const

export type TenantSecret = {
  id: string
  name: string
  type: TenantSecretType
  usage: TenantSecretUsage
  createdAt: string
  summary: string
  data: TenantSecretData
}

export const DEMO_TENANT_CLUSTER_SSH_SECRET_ID = 'demo-tenant-secret-cluster-ssh'
export const DEMO_TENANT_CLUSTER_PULL_SECRET_ID = 'demo-tenant-secret-cluster-pull'
export const DEMO_TENANT_GITHUB_SOURCE_SECRET_ID = 'demo-tenant-secret-github-source'
export const DEMO_TENANT_CI_WEBHOOK_SECRET_ID = 'demo-tenant-secret-ci-webhook'

export const TENANT_SECRET_USAGE_OPTIONS: ReadonlyArray<{
  id: TenantSecretUsage
  label: string
}> = [
  { id: 'cluster-launch', label: 'Cluster launch' },
  { id: 'general', label: 'General' },
]

export type TenantSecretTypeFilter = 'all' | TenantSecretType
export type TenantSecretUsageFilter = 'all' | TenantSecretUsage

const TENANT_SECRETS_KEY_PREFIX = 'bmaas-tenant-secrets-'

const DEMO_WEBHOOK_SECRET_KEY = 'whsec_demo_ci_webhook_8f2c91a4b7e3d056'

function getStorageKey(tenantSlug: string): string {
  return `${TENANT_SECRETS_KEY_PREFIX}${tenantSlug}`
}

function isTenantSecretData(value: unknown, type: TenantSecretType): value is TenantSecretData {
  if (!value || typeof value !== 'object') {
    return false
  }

  const data = value as TenantSecretData
  if (data.kind !== type) {
    return false
  }

  switch (data.kind) {
    case 'key-value':
      return Array.isArray(data.pairs)
    case 'image-pull':
      return (
        (data.authMode === 'registry-credentials' || data.authMode === 'upload-configuration') &&
        Array.isArray(data.credentials)
      )
    case 'source':
      return data.authMode === 'basic' || data.authMode === 'ssh-key'
    case 'webhook':
      return typeof data.webhookSecretKey === 'string'
    default:
      return false
  }
}

function isTenantSecret(value: unknown): value is TenantSecret {
  if (!value || typeof value !== 'object') {
    return false
  }

  const secret = value as TenantSecret
  return (
    typeof secret.id === 'string' &&
    typeof secret.name === 'string' &&
    (secret.type === 'key-value' ||
      secret.type === 'image-pull' ||
      secret.type === 'source' ||
      secret.type === 'webhook') &&
    (secret.usage === 'cluster-launch' || secret.usage === 'general') &&
    typeof secret.createdAt === 'string' &&
    typeof secret.summary === 'string' &&
    isTenantSecretData(secret.data, secret.type)
  )
}

export function generateTenantSecretId(): string {
  return `secret_${Math.random().toString(36).slice(2, 10)}`
}

export function getTenantSecretTypeLabel(type: TenantSecretType): string {
  const match = TENANT_SECRET_TYPE_OPTIONS.find((option) => option.id === type)
  return match?.label ?? type
}

export function getTenantSecretUsageLabel(usage: TenantSecretUsage): string {
  const match = TENANT_SECRET_USAGE_OPTIONS.find((option) => option.id === usage)
  return match?.label ?? usage
}

function createDemoTenantSecrets(): TenantSecret[] {
  return [
    {
      id: DEMO_TENANT_CLUSTER_PULL_SECRET_ID,
      name: 'ocp-pull-secret',
      type: 'image-pull',
      usage: 'cluster-launch',
      createdAt: '2026-03-12T14:18:00.000Z',
      summary: 'Pull secret',
      data: {
        kind: 'image-pull',
        authMode: 'upload-configuration',
        credentials: [],
        configurationFileName: 'pull-secret.json',
        configurationFileContents: CLUSTER_LAUNCH_INSTANCE_DEMO.pullSecret,
      },
    },
    {
      id: DEMO_TENANT_CLUSTER_SSH_SECRET_ID,
      name: 'cluster-admin-ssh',
      type: 'key-value',
      usage: 'cluster-launch',
      createdAt: '2026-03-12T14:20:00.000Z',
      summary: 'SSH public key',
      data: {
        kind: 'key-value',
        pairs: [
          {
            key: 'ssh-public-key',
            value: CLUSTER_LAUNCH_INSTANCE_DEMO.sshPublicKey,
          },
        ],
      },
    },
    {
      id: DEMO_TENANT_GITHUB_SOURCE_SECRET_ID,
      name: 'github-source',
      type: 'source',
      usage: 'general',
      createdAt: '2026-02-28T09:45:00.000Z',
      summary: 'Basic authentication',
      data: {
        kind: 'source',
        authMode: 'basic',
        username: 'platform-bot',
        passwordOrToken: 'ghp_demo_platform_bot_token',
        sshPrivateKeyFileName: '',
        sshPrivateKeyContents: '',
      },
    },
    {
      id: DEMO_TENANT_CI_WEBHOOK_SECRET_ID,
      name: 'ci-webhook',
      type: 'webhook',
      usage: 'general',
      createdAt: '2026-02-15T16:30:00.000Z',
      summary: 'Webhook key',
      data: {
        kind: 'webhook',
        webhookSecretKey: DEMO_WEBHOOK_SECRET_KEY,
      },
    },
  ]
}

const DEMO_TENANT_SECRET_ORDER = createDemoTenantSecrets().map((secret) => secret.id)

function sortTenantSecrets(secrets: TenantSecret[]): TenantSecret[] {
  return [...secrets].sort((left, right) => {
    const leftIndex = DEMO_TENANT_SECRET_ORDER.indexOf(left.id)
    const rightIndex = DEMO_TENANT_SECRET_ORDER.indexOf(right.id)

    if (leftIndex !== -1 && rightIndex !== -1) {
      return leftIndex - rightIndex
    }

    if (leftIndex !== -1) {
      return -1
    }

    if (rightIndex !== -1) {
      return 1
    }

    return right.createdAt.localeCompare(left.createdAt)
  })
}

function saveTenantSecrets(tenantSlug: string, secrets: TenantSecret[]): void {
  try {
    sessionStorage.setItem(getStorageKey(tenantSlug), JSON.stringify(secrets))
  } catch {
    /* demo storage unavailable */
  }
}

export function getTenantSecrets(tenantSlug: string): TenantSecret[] {
  try {
    const raw = sessionStorage.getItem(getStorageKey(tenantSlug))
    if (!raw) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isTenantSecret)
  } catch {
    return []
  }
}

export function getTenantSecretById(
  tenantSlug: string,
  secretId: string,
): TenantSecret | null {
  return getTenantSecrets(tenantSlug).find((secret) => secret.id === secretId) ?? null
}

export function ensureTenantDemoSecrets(tenantSlug: string): TenantSecret[] {
  const existing = getTenantSecrets(tenantSlug)
  const demos = createDemoTenantSecrets()
  let next = [...existing]
  let changed = false

  for (const demo of demos) {
    const existingIndex = next.findIndex((secret) => secret.id === demo.id)
    if (existingIndex === -1) {
      next.push(demo)
      changed = true
      continue
    }

    const current = next[existingIndex]!
    if (!current.data || JSON.stringify(current) !== JSON.stringify(demo)) {
      next[existingIndex] = demo
      changed = true
    }
  }

  if (changed) {
    next = sortTenantSecrets(next)
    saveTenantSecrets(tenantSlug, next)
    return next
  }

  const sorted = sortTenantSecrets(next)
  if (sorted.some((secret, index) => secret.id !== next[index]?.id)) {
    saveTenantSecrets(tenantSlug, sorted)
    return sorted
  }

  return next
}

export function buildTenantSecretFilterParts(
  searchValue: string,
  selectedType: TenantSecretTypeFilter,
  selectedUsage: TenantSecretUsageFilter,
): string[] {
  const parts: string[] = []

  if (selectedType !== 'all') {
    parts.push(`type: ${getTenantSecretTypeLabel(selectedType)}`)
  }

  if (selectedUsage !== 'all') {
    parts.push(`use: ${getTenantSecretUsageLabel(selectedUsage)}`)
  }

  if (searchValue.trim()) {
    parts.push(`search: "${searchValue.trim()}"`)
  }

  return parts
}

export function addTenantSecret(tenantSlug: string, secret: TenantSecret): TenantSecret[] {
  const next = [...getTenantSecrets(tenantSlug), secret]
  saveTenantSecrets(tenantSlug, next)
  return next
}

export const MASKED_SECRET_VALUE = '•'.repeat(24)

export function formatSecretDetailValue(fieldId: string, value: string, reveal = false): string {
  if (!value.trim()) {
    return '—'
  }

  if (!reveal && isMaskedSecretField(fieldId)) {
    return MASKED_SECRET_VALUE
  }

  return value
}

export function isSensitiveSecretField(fieldId: string): boolean {
  return (
    fieldId.includes('password') ||
    fieldId.includes('token') ||
    fieldId.includes('webhook-secret-key') ||
    fieldId.includes('ssh-private-key-contents') ||
    fieldId.includes('configuration-file-contents')
  )
}

export function isMaskedSecretField(fieldId: string): boolean {
  return fieldId.startsWith('key-value-') || isSensitiveSecretField(fieldId)
}

export function tenantSecretHasRevealableValues(secret: TenantSecret): boolean {
  switch (secret.data.kind) {
    case 'key-value':
      return secret.data.pairs.some((pair) => pair.value.trim())
    case 'image-pull':
      if (secret.data.authMode === 'upload-configuration') {
        return Boolean(secret.data.configurationFileContents.trim())
      }
      return secret.data.credentials.some((credential) => credential.password.trim())
    case 'source':
      if (secret.data.authMode === 'basic') {
        return Boolean(secret.data.passwordOrToken.trim())
      }
      return Boolean(secret.data.sshPrivateKeyContents.trim())
    case 'webhook':
      return Boolean(secret.data.webhookSecretKey.trim())
    default:
      return false
  }
}
