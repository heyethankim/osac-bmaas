export type TenantSecretUsage = 'cluster-launch' | 'general'

export type TenantSecretType =
  | 'kubeconfig'
  | 'opaque'
  | 'image-pull'
  | 'ssh-public-key'
  | 'user-data'
  | 'single-value'

export type StoredKeyValuePair = {
  key: string
  value: string
}

/** All secret types store data as key/value pairs with type-specific required keys. */
export type TenantSecretData = {
  kind: TenantSecretType
  pairs: StoredKeyValuePair[]
  /** Optional uploaded file name when the value came from a file. */
  uploadedFileName?: string
}

export type TenantSecretTypeOption = {
  id: TenantSecretType
  label: string
  description: string
  /** Keys that must be present for this type. Empty = user-defined keys. */
  requiredKeys: readonly string[]
  /** When true, only one key/value pair is allowed. */
  singlePair: boolean
  /** Prefer file upload for the value field. */
  preferUpload: boolean
}

/** Display order is alphabetical by label. */
export const TENANT_SECRET_TYPE_OPTIONS: readonly TenantSecretTypeOption[] = [
  {
    id: 'image-pull',
    label: 'Image pull secret',
    description: 'Registry credentials / .dockerconfigjson',
    requiredKeys: ['.dockerconfigjson'],
    singlePair: true,
    preferUpload: true,
  },
  {
    id: 'kubeconfig',
    label: 'Kubeconfig',
    description: 'Cluster access file (.kube/config)',
    requiredKeys: ['kubeconfig'],
    singlePair: true,
    preferUpload: true,
  },
  {
    id: 'opaque',
    label: 'Opaque',
    description: 'Arbitrary key/value pairs',
    requiredKeys: [],
    singlePair: false,
    preferUpload: false,
  },
  {
    id: 'single-value',
    label: 'Single value',
    description: 'One string (token, password, license key)',
    requiredKeys: ['value'],
    singlePair: true,
    preferUpload: false,
  },
  {
    id: 'ssh-public-key',
    label: 'SSH public key',
    description: 'One public key for node or bastion access',
    requiredKeys: ['ssh-publickey'],
    singlePair: true,
    preferUpload: false,
  },
  {
    id: 'user-data',
    label: 'User data',
    description: 'Cloud-init script or config at launch',
    requiredKeys: ['user-data'],
    singlePair: true,
    preferUpload: true,
  },
] as const

export function getTenantSecretTypeOption(type: TenantSecretType): TenantSecretTypeOption {
  return (
    TENANT_SECRET_TYPE_OPTIONS.find((option) => option.id === type) ??
    TENANT_SECRET_TYPE_OPTIONS.find((option) => option.id === 'opaque')!
  )
}

export function getTenantSecretTypeLabel(type: TenantSecretType): string {
  return getTenantSecretTypeOption(type).label
}

export function isTenantSecretType(value: unknown): value is TenantSecretType {
  return TENANT_SECRET_TYPE_OPTIONS.some((option) => option.id === value)
}

export function buildTenantSecretData(
  type: TenantSecretType,
  pairs: StoredKeyValuePair[],
  uploadedFileName = '',
): TenantSecretData {
  const option = getTenantSecretTypeOption(type)
  const normalizedPairs = pairs
    .filter((pair) => pair.key.trim() && pair.value.trim())
    .map((pair) => ({ key: pair.key.trim(), value: pair.value }))

  // Ensure required keys exist even if empty was filtered (caller should validate first).
  if (option.requiredKeys.length > 0 && normalizedPairs.length === 0) {
    return {
      kind: type,
      pairs: option.requiredKeys.map((key) => ({ key, value: '' })),
      uploadedFileName: uploadedFileName.trim() || undefined,
    }
  }

  return {
    kind: type,
    pairs: option.singlePair ? normalizedPairs.slice(0, 1) : normalizedPairs,
    uploadedFileName: uploadedFileName.trim() || undefined,
  }
}
