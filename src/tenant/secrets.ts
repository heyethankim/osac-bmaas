import type { TenantSecretData, TenantSecretType, TenantSecretUsage } from './secretTypes'
import {
  CLUSTER_LAUNCH_DEMO_PULL_SECRET,
  CLUSTER_LAUNCH_DEMO_SSH_PUBLIC_KEY,
} from '../tenantUser/clusterLaunchDemoSecrets'

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
  description: string
}> = [
  {
    id: 'key-value',
    label: 'Key/value',
    description: 'SSH keys, tokens, and custom pairs.',
  },
  {
    id: 'image-pull',
    label: 'Image pull',
    description: 'Registry credentials or pull-secret file.',
  },
  {
    id: 'source',
    label: 'Source',
    description: 'Git credentials or SSH private key.',
  },
  {
    id: 'webhook',
    label: 'Webhook',
    description: 'Signing key for inbound webhooks.',
  },
]

export const TENANT_SECRETS_COPY = {
  title: 'Secrets',
  lede: 'Store credentials for use at launch. Encrypted at rest in the platform vault.',
  emptyTitle: 'No secrets yet',
  emptyBody: 'Add your first secret to get started.',
  createSecretTypeLabel: 'Create secret',
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
export const DEMO_TENANT_PLATFORM_API_TOKEN_SECRET_ID = 'demo-tenant-secret-platform-api'
export const DEMO_TENANT_OBSERVABILITY_SECRET_ID = 'demo-tenant-secret-observability'
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

const LEGACY_REMOVED_SECRET_IDS = new Set([
  DEMO_TENANT_GITHUB_SOURCE_SECRET_ID,
  DEMO_TENANT_CI_WEBHOOK_SECRET_ID,
])

const DEMO_PLATFORM_API_TOKEN = 'bmaas_demo_platform_token_8f2c91a4'
const DEMO_PROMETHEUS_TOKEN = 'prom_demo_ns_bank_001'
const DEMO_GRAFANA_API_KEY = 'glc_demo_grafana_key_9a2b'

function createSampleTenantSecrets(): TenantSecret[] {
  return [
    {
      id: DEMO_TENANT_CLUSTER_SSH_SECRET_ID,
      name: 'cluster-admin-ssh',
      type: 'key-value',
      usage: 'cluster-launch',
      createdAt: '2026-03-12T14:20:00.000Z',
      summary: 'SSH public key for cluster nodes',
      data: {
        kind: 'key-value',
        pairs: [{ key: 'ssh-public-key', value: CLUSTER_LAUNCH_DEMO_SSH_PUBLIC_KEY }],
      },
    },
    {
      id: DEMO_TENANT_CLUSTER_PULL_SECRET_ID,
      name: 'ocp-pull-secret',
      type: 'key-value',
      usage: 'cluster-launch',
      createdAt: '2026-03-12T14:18:00.000Z',
      summary: 'OpenShift pull secret',
      data: {
        kind: 'key-value',
        pairs: [{ key: 'pull-secret', value: CLUSTER_LAUNCH_DEMO_PULL_SECRET }],
      },
    },
    {
      id: DEMO_TENANT_PLATFORM_API_TOKEN_SECRET_ID,
      name: 'platform-api-token',
      type: 'key-value',
      usage: 'general',
      createdAt: '2026-02-28T09:45:00.000Z',
      summary: 'Platform automation token',
      data: {
        kind: 'key-value',
        pairs: [{ key: 'api-token', value: DEMO_PLATFORM_API_TOKEN }],
      },
    },
    {
      id: DEMO_TENANT_OBSERVABILITY_SECRET_ID,
      name: 'observability-credentials',
      type: 'key-value',
      usage: 'general',
      createdAt: '2026-02-15T16:30:00.000Z',
      summary: 'Monitoring stack credentials',
      data: {
        kind: 'key-value',
        pairs: [
          { key: 'prometheus-token', value: DEMO_PROMETHEUS_TOKEN },
          { key: 'grafana-api-key', value: DEMO_GRAFANA_API_KEY },
        ],
      },
    },
  ]
}

const SAMPLE_TENANT_SECRET_ORDER = createSampleTenantSecrets().map((secret) => secret.id)

function sortTenantSecrets(secrets: TenantSecret[]): TenantSecret[] {
  return [...secrets].sort((left, right) => {
    const leftIndex = SAMPLE_TENANT_SECRET_ORDER.indexOf(left.id)
    const rightIndex = SAMPLE_TENANT_SECRET_ORDER.indexOf(right.id)

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

function migrateTenantSecrets(secrets: TenantSecret[]): TenantSecret[] {
  return secrets.filter(
    (secret) => secret.type === 'key-value' && !LEGACY_REMOVED_SECRET_IDS.has(secret.id),
  )
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
  const existing = migrateTenantSecrets(getTenantSecrets(tenantSlug))
  const samples = createSampleTenantSecrets()
  let next = [...existing]
  let changed = false

  for (const sample of samples) {
    const existingIndex = next.findIndex((secret) => secret.id === sample.id)
    if (existingIndex === -1) {
      next.push(sample)
      changed = true
      continue
    }

    const current = next[existingIndex]!
    if (JSON.stringify(current) !== JSON.stringify(sample)) {
      next[existingIndex] = sample
      changed = true
    }
  }

  next = sortTenantSecrets(next)

  if (
    changed ||
    next.length !== existing.length ||
    next.some((secret, index) => secret.id !== existing[index]?.id)
  ) {
    saveTenantSecrets(tenantSlug, next)
  }

  return next
}

export function formatTenantSecretKeyNames(secret: TenantSecret): string {
  if (secret.data.kind !== 'key-value') {
    return '—'
  }

  const keys = secret.data.pairs.map((pair) => pair.key.trim()).filter(Boolean)
  if (keys.length === 0) {
    return '—'
  }

  if (keys.length <= 3) {
    return keys.join(', ')
  }

  return `${keys.slice(0, 3).join(', ')} +${keys.length - 3} more`
}

export function getTenantSecretPairCount(secret: TenantSecret): number {
  if (secret.data.kind !== 'key-value') {
    return 0
  }

  return secret.data.pairs.filter((pair) => pair.key.trim()).length
}

export function buildTenantSecretFilterParts(searchValue: string): string[] {
  const parts: string[] = []

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

export type LaunchSecretPurpose = 'ssh-public-key' | 'pull-secret'

export function getTenantSecretTypeForLaunchPurpose(
  _purpose: LaunchSecretPurpose,
): TenantSecretType {
  return 'key-value'
}

export function filterTenantSecretsForLaunch(
  secrets: readonly TenantSecret[],
  purpose: LaunchSecretPurpose,
): TenantSecret[] {
  return secrets.filter((secret) => {
    if (purpose === 'ssh-public-key') {
      return Boolean(resolveSshPublicKeySecretValue(secret))
    }

    return Boolean(resolvePullSecretValue(secret))
  })
}

export function resolveSshPublicKeySecretValue(secret: TenantSecret): string | null {
  if (secret.data.kind !== 'key-value') {
    return null
  }

  const sshPair =
    secret.data.pairs.find((pair) => pair.key.trim() === 'ssh-public-key') ??
    secret.data.pairs.find((pair) => pair.value.trim())
  const value = sshPair?.value.trim()
  return value || null
}

export function resolvePullSecretValue(secret: TenantSecret): string | null {
  if (secret.data.kind === 'key-value') {
    const pullPair =
      secret.data.pairs.find((pair) => pair.key.trim() === 'pull-secret') ??
      secret.data.pairs.find((pair) => {
        const value = pair.value.trim()
        return value.startsWith('{') && value.includes('"auths"')
      })
    const value = pullPair?.value.trim()
    return value || null
  }

  if (secret.data.kind !== 'image-pull') {
    return null
  }

  if (secret.data.authMode === 'upload-configuration') {
    const contents = secret.data.configurationFileContents.trim()
    return contents || null
  }

  if (secret.data.credentials.length === 0) {
    return null
  }

  const auths = Object.fromEntries(
    secret.data.credentials
      .filter((credential) => credential.registryServer.trim())
      .map((credential) => [
        credential.registryServer.trim(),
        {
          username: credential.username,
          password: credential.password,
          email: credential.email,
        },
      ]),
  )

  return Object.keys(auths).length > 0 ? JSON.stringify({ auths }) : null
}

export function getDefaultLaunchSecretSelections(tenantSlug: string): {
  sshPublicKeySecretId: string
  sshPublicKey: string
  pullSecretId: string
  pullSecret: string
} {
  const secrets = ensureTenantDemoSecrets(tenantSlug)
  const sshSecret =
    secrets.find((secret) => secret.id === DEMO_TENANT_CLUSTER_SSH_SECRET_ID) ??
    filterTenantSecretsForLaunch(secrets, 'ssh-public-key')[0] ??
    null
  const pullSecretRecord =
    secrets.find((secret) => secret.id === DEMO_TENANT_CLUSTER_PULL_SECRET_ID) ??
    filterTenantSecretsForLaunch(secrets, 'pull-secret')[0] ??
    null

  return {
    sshPublicKeySecretId: sshSecret?.id ?? '',
    sshPublicKey: sshSecret ? resolveSshPublicKeySecretValue(sshSecret) ?? '' : '',
    pullSecretId: pullSecretRecord?.id ?? '',
    pullSecret: pullSecretRecord ? resolvePullSecretValue(pullSecretRecord) ?? '' : '',
  }
}

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
