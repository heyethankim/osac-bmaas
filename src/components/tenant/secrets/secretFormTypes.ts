import type { TenantSecretType } from '../../../tenant/secretTypes'
import {
  getTenantSecretTypeOption,
  isTenantSecretType,
  type StoredKeyValuePair,
} from '../../../tenant/secretTypes'
import type { TenantSecret } from '../../../tenant/secrets'
import {
  CLUSTER_LAUNCH_DEMO_PULL_SECRET,
  CLUSTER_LAUNCH_DEMO_SSH_PUBLIC_KEY,
} from '../../../tenantUser/clusterLaunchDemoSecrets'

export type KeyValueValueMode = 'paste' | 'upload-file'

export type KeyValuePair = {
  id: string
  key: string
  value: string
  valueMode: KeyValueValueMode
  valueFileName: string
}

export type TenantSecretFormState = {
  name: string
  description: string
  labels: string[]
  /** Null until the user picks a type on the Secret data step (create flow). */
  type: TenantSecretType | null
  pairs: KeyValuePair[]
  uploadedFileName: string
}

function createRowId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`
}

export function createKeyValuePair(overrides: Partial<KeyValuePair> = {}): KeyValuePair {
  return {
    id: createRowId('kv'),
    key: '',
    value: '',
    valueMode: 'paste',
    valueFileName: '',
    ...overrides,
  }
}

function pairsForType(type: TenantSecretType, prefill = false): KeyValuePair[] {
  const option = getTenantSecretTypeOption(type)

  if (option.requiredKeys.length > 0) {
    return option.requiredKeys.map((key) =>
      createKeyValuePair({
        key,
        valueMode: option.preferUpload ? 'upload-file' : 'paste',
        value: prefill ? demoValueForType(type) : '',
        valueFileName: prefill && option.preferUpload ? demoFileNameForType(type) : '',
      }),
    )
  }

  if (prefill) {
    return [
      createKeyValuePair({
        key: 'prometheus-token',
        value: 'prom_demo_ns_bank_001',
      }),
      createKeyValuePair({
        key: 'grafana-api-key',
        value: 'glc_demo_grafana_key_9a2b',
      }),
    ]
  }

  return [createKeyValuePair()]
}

function demoValueForType(type: TenantSecretType): string {
  switch (type) {
    case 'kubeconfig':
      return `apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://api.cluster.example.com:6443
  name: demo-cluster
contexts:
- context:
    cluster: demo-cluster
    user: demo-admin
  name: demo-cluster
current-context: demo-cluster
users:
- name: demo-admin
  user:
    token: demo-kubeconfig-token
`
    case 'image-pull':
      return CLUSTER_LAUNCH_DEMO_PULL_SECRET
    case 'ssh-public-key':
      return CLUSTER_LAUNCH_DEMO_SSH_PUBLIC_KEY
    case 'user-data':
      return `#cloud-config
users:
  - name: cloud-user
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ${CLUSTER_LAUNCH_DEMO_SSH_PUBLIC_KEY}
`
    case 'single-value':
      return 'bmaas_demo_platform_token_8f2c91a4'
    case 'opaque':
    default:
      return ''
  }
}

function demoFileNameForType(type: TenantSecretType): string {
  switch (type) {
    case 'kubeconfig':
      return 'kubeconfig'
    case 'image-pull':
      return 'pull-secret.json'
    case 'user-data':
      return 'user-data.yaml'
    default:
      return ''
  }
}

function demoNameForType(type: TenantSecretType): string {
  switch (type) {
    case 'kubeconfig':
      return 'demo-cluster-kubeconfig'
    case 'opaque':
      return 'observability-credentials'
    case 'image-pull':
      return 'ocp-pull-secret'
    case 'ssh-public-key':
      return 'cluster-admin-ssh'
    case 'user-data':
      return 'bastion-cloud-init'
    case 'single-value':
      return 'platform-api-token'
    default:
      return ''
  }
}

function demoDescriptionForType(type: TenantSecretType): string {
  switch (type) {
    case 'kubeconfig':
      return 'Admin kubeconfig for the demo cluster'
    case 'opaque':
      return 'Monitoring stack credentials'
    case 'image-pull':
      return 'OpenShift pull secret'
    case 'ssh-public-key':
      return 'SSH public key for cluster nodes'
    case 'user-data':
      return 'Cloud-init user data for bastion hosts'
    case 'single-value':
      return 'Platform automation token'
    default:
      return ''
  }
}

export function createDefaultSecretFormState(
  type: TenantSecretType | null = null,
): TenantSecretFormState {
  if (!type) {
    return {
      name: '',
      description: '',
      labels: [],
      type: null,
      pairs: [],
      uploadedFileName: '',
    }
  }

  return {
    name: '',
    description: '',
    labels: [],
    type,
    pairs: pairsForType(type, false),
    uploadedFileName: '',
  }
}

function demoLabelsForType(type: TenantSecretType): string[] {
  switch (type) {
    case 'opaque':
      return ['observability']
    case 'image-pull':
    case 'ssh-public-key':
      return ['cluster-launch']
    case 'single-value':
      return ['platform']
    case 'kubeconfig':
      return ['cluster']
    case 'user-data':
      return ['cloud-init']
    default:
      return []
  }
}

export function createDemoSecretFormState(type: TenantSecretType): TenantSecretFormState {
  const option = getTenantSecretTypeOption(type)
  return {
    name: demoNameForType(type),
    description: demoDescriptionForType(type),
    labels: demoLabelsForType(type),
    type,
    pairs: pairsForType(type, true),
    uploadedFileName: option.preferUpload ? demoFileNameForType(type) : '',
  }
}

export function createUnsetSecretFormState(): TenantSecretFormState {
  return createDefaultSecretFormState(null)
}

/** Create flow start: General fields prefilled; type remains unset until Secret data. */
export function createPrefillGeneralSecretFormState(): TenantSecretFormState {
  const demo = createDemoSecretFormState('opaque')
  return {
    name: demo.name,
    description: demo.description,
    labels: demo.labels,
    type: null,
    pairs: [],
    uploadedFileName: '',
  }
}

export function createSecretFormState(
  type: TenantSecretType | null,
  options?: { prefill?: boolean },
): TenantSecretFormState {
  if (!type) {
    return options?.prefill ? createPrefillGeneralSecretFormState() : createUnsetSecretFormState()
  }
  return options?.prefill ? createDemoSecretFormState(type) : createDefaultSecretFormState(type)
}

export function applySecretTypeToForm(
  form: TenantSecretFormState,
  type: TenantSecretType,
  options?: { keepValues?: boolean },
): TenantSecretFormState {
  const option = getTenantSecretTypeOption(type)
  const previousByKey = new Map(
    form.pairs.map((pair) => [pair.key.trim(), pair] as const).filter(([key]) => Boolean(key)),
  )

  let pairs: KeyValuePair[]
  if (option.requiredKeys.length > 0) {
    pairs = option.requiredKeys.map((key) => {
      const previous = previousByKey.get(key)
      if (options?.keepValues && previous) {
        return {
          ...previous,
          key,
          valueMode: option.preferUpload ? 'upload-file' : previous.valueMode,
        }
      }
      return createKeyValuePair({
        key,
        valueMode: option.preferUpload ? 'upload-file' : 'paste',
      })
    })
  } else if (options?.keepValues && form.pairs.some((pair) => pair.key.trim() || pair.value.trim())) {
    pairs = form.pairs
  } else {
    pairs = [createKeyValuePair()]
  }

  return {
    ...form,
    type,
    pairs,
    uploadedFileName: option.preferUpload ? form.uploadedFileName : '',
  }
}

function createRowIdFromKey(key: string): string {
  return `kv_${key.replace(/\W/g, '').slice(0, 12) || createRowId('kv')}`
}

export function secretFormStateFromTenantSecret(secret: TenantSecret): TenantSecretFormState {
  const type = isTenantSecretType(secret.type) ? secret.type : 'opaque'
  const option = getTenantSecretTypeOption(type)
  const storedPairs =
    secret.data.pairs.length > 0
      ? secret.data.pairs
      : option.requiredKeys.map((key) => ({ key, value: '' }))

  return {
    name: secret.name,
    description: secret.description?.trim() || secret.summary,
    labels: [...(secret.labels ?? [])],
    type,
    pairs: storedPairs.map((pair) =>
      createKeyValuePair({
        id: createRowIdFromKey(pair.key),
        key: pair.key,
        value: pair.value,
        valueMode: option.preferUpload ? 'upload-file' : 'paste',
        valueFileName: secret.data.uploadedFileName ?? '',
      }),
    ),
    uploadedFileName: secret.data.uploadedFileName ?? '',
  }
}

export function formPairsToStored(pairs: KeyValuePair[]): StoredKeyValuePair[] {
  return pairs
    .filter((pair) => pair.key.trim() && pair.value.trim())
    .map((pair) => ({ key: pair.key.trim(), value: pair.value }))
}

export function parseLabelsInput(value: string): string[] {
  return value
    .split(/[,]+/)
    .map((label) => label.trim())
    .filter(Boolean)
}

export function formatLabelsInput(labels: readonly string[]): string {
  return labels.join(', ')
}
