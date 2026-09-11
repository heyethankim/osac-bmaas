import type { TenantSecretType } from '../../../tenant/secretTypes'
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

export type ImagePullCredential = {
  id: string
  registryServer: string
  username: string
  password: string
  email: string
}

export type ImagePullAuthMode = 'registry-credentials' | 'upload-configuration'

export type SourceAuthMode = 'basic' | 'ssh-key'

export type KeyValueSecretForm = {
  name: string
  pairs: KeyValuePair[]
}

export type ImagePullSecretForm = {
  name: string
  authMode: ImagePullAuthMode
  credentials: ImagePullCredential[]
  configurationFileName: string
  configurationFileContents: string
}

export type SourceSecretForm = {
  name: string
  authMode: SourceAuthMode
  username: string
  passwordOrToken: string
  sshPrivateKeyFileName: string
  sshPrivateKeyContents: string
}

export type WebhookSecretForm = {
  name: string
  webhookSecretKey: string
}

export type TenantSecretFormState = {
  description: string
  type: TenantSecretType
  keyValue: KeyValueSecretForm
  imagePull: ImagePullSecretForm
  source: SourceSecretForm
  webhook: WebhookSecretForm
}

function createRowId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`
}

export function createKeyValuePair(): KeyValuePair {
  return { id: createRowId('kv'), key: '', value: '', valueMode: 'paste', valueFileName: '' }
}

export function createImagePullCredential(): ImagePullCredential {
  return {
    id: createRowId('cred'),
    registryServer: '',
    username: '',
    password: '',
    email: '',
  }
}

function createDemoImagePullCredential(): ImagePullCredential {
  return {
    id: createRowId('cred'),
    registryServer: 'quay.io',
    username: 'platform+pull',
    password: 'demo-pull-password',
    email: 'brotman@redhat.com',
  }
}

export const DEFAULT_KEY_VALUE_SECRET_FORM: KeyValueSecretForm = {
  name: '',
  pairs: [createKeyValuePair()],
}

export const DEFAULT_IMAGE_PULL_SECRET_FORM: ImagePullSecretForm = {
  name: '',
  authMode: 'registry-credentials',
  credentials: [createImagePullCredential()],
  configurationFileName: '',
  configurationFileContents: '',
}

export const DEFAULT_SOURCE_SECRET_FORM: SourceSecretForm = {
  name: '',
  authMode: 'basic',
  username: '',
  passwordOrToken: '',
  sshPrivateKeyFileName: '',
  sshPrivateKeyContents: '',
}

export const DEFAULT_WEBHOOK_SECRET_FORM: WebhookSecretForm = {
  name: '',
  webhookSecretKey: '',
}

export function createDefaultSecretFormState(type: TenantSecretType): TenantSecretFormState {
  return {
    description: '',
    type,
    keyValue: { ...DEFAULT_KEY_VALUE_SECRET_FORM, pairs: [createKeyValuePair()] },
    imagePull: {
      ...DEFAULT_IMAGE_PULL_SECRET_FORM,
      credentials: [createImagePullCredential()],
    },
    source: { ...DEFAULT_SOURCE_SECRET_FORM },
    webhook: { ...DEFAULT_WEBHOOK_SECRET_FORM },
  }
}

const DEMO_WEBHOOK_SECRET_KEY = 'whsec_demo_ci_webhook_8f2c91a4b7e3d056'

const DEMO_SSH_PRIVATE_KEY = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBExampleDemoKeyOnlyNotRealPrivateKeyMaterial==
-----END OPENSSH PRIVATE KEY-----`

/** Demo prefills so the create flow is ready to submit for every secret type. */
export function createDemoSecretFormState(type: TenantSecretType): TenantSecretFormState {
  const base = createDefaultSecretFormState(type)

  switch (type) {
    case 'key-value':
      return {
        ...base,
        description: 'SSH public key for cluster nodes',
        keyValue: {
          name: 'cluster-admin-ssh',
          pairs: [
            {
              id: createRowId('kv'),
              key: 'ssh-public-key',
              value: CLUSTER_LAUNCH_DEMO_SSH_PUBLIC_KEY,
              valueMode: 'paste',
              valueFileName: '',
            },
          ],
        },
      }
    case 'image-pull':
      return {
        ...base,
        description: 'OpenShift pull secret',
        imagePull: {
          name: 'ocp-pull-secret',
          authMode: 'registry-credentials',
          credentials: [createDemoImagePullCredential()],
          configurationFileName: 'pull-secret.json',
          configurationFileContents: CLUSTER_LAUNCH_DEMO_PULL_SECRET,
        },
      }
    case 'source':
      return {
        ...base,
        description: 'Git credentials for platform repositories',
        source: {
          name: 'github-source',
          authMode: 'basic',
          username: 'platform-bot',
          passwordOrToken: 'ghp_demo_platform_bot_token',
          sshPrivateKeyFileName: 'id_ed25519',
          sshPrivateKeyContents: DEMO_SSH_PRIVATE_KEY,
        },
      }
    case 'webhook':
      return {
        ...base,
        description: 'Signing key for inbound CI webhooks',
        webhook: {
          name: 'ci-webhook',
          webhookSecretKey: DEMO_WEBHOOK_SECRET_KEY,
        },
      }
    default:
      return base
  }
}

export function createSecretFormState(
  type: TenantSecretType,
  options?: { prefill?: boolean },
): TenantSecretFormState {
  return options?.prefill ? createDemoSecretFormState(type) : createDefaultSecretFormState(type)
}

export function generateWebhookSecretKey(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  const encoded = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
  return `whsec_${encoded}`
}

function createRowIdFromKey(prefix: string, key: string): string {
  return `${prefix}_${key.replace(/\W/g, '').slice(0, 12) || createRowId(prefix)}`
}

export function secretFormStateFromTenantSecret(secret: TenantSecret): TenantSecretFormState {
  const base = createDefaultSecretFormState(secret.type)

  switch (secret.data.kind) {
    case 'key-value':
      return {
        ...base,
        description: secret.summary,
        type: 'key-value',
        keyValue: {
          name: secret.name,
          pairs:
            secret.data.pairs.length > 0
              ? secret.data.pairs.map((pair) => ({
                  id: createRowIdFromKey('kv', pair.key),
                  key: pair.key,
                  value: pair.value,
                  valueMode: 'paste' as const,
                  valueFileName: '',
                }))
              : [createKeyValuePair()],
        },
      }
    case 'image-pull':
      return {
        ...base,
        description: secret.summary,
        type: 'image-pull',
        imagePull: {
          name: secret.name,
          authMode: secret.data.authMode,
          credentials:
            secret.data.credentials.length > 0
              ? secret.data.credentials.map((credential) => ({
                  id: createRowIdFromKey('cred', credential.registryServer),
                  registryServer: credential.registryServer,
                  username: credential.username,
                  password: credential.password,
                  email: credential.email,
                }))
              : [createImagePullCredential()],
          configurationFileName: secret.data.configurationFileName,
          configurationFileContents: secret.data.configurationFileContents,
        },
      }
    case 'source':
      return {
        ...base,
        description: secret.summary,
        type: 'source',
        source: {
          name: secret.name,
          authMode: secret.data.authMode,
          username: secret.data.username,
          passwordOrToken: secret.data.passwordOrToken,
          sshPrivateKeyFileName: secret.data.sshPrivateKeyFileName,
          sshPrivateKeyContents: secret.data.sshPrivateKeyContents,
        },
      }
    case 'webhook':
      return {
        ...base,
        description: secret.summary,
        type: 'webhook',
        webhook: {
          name: secret.name,
          webhookSecretKey: secret.data.webhookSecretKey,
        },
      }
    default:
      return base
  }
}
