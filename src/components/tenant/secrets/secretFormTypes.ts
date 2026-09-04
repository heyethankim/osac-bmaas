import type { TenantSecretType } from '../../../tenant/secretTypes'
import {
  CLUSTER_LAUNCH_DEMO_PULL_SECRET,
  CLUSTER_LAUNCH_DEMO_SSH_PUBLIC_KEY,
} from '../../../tenantUser/clusterLaunchDemoSecrets'

export type KeyValuePair = {
  id: string
  key: string
  value: string
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
  return { id: createRowId('kv'), key: '', value: '' }
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

/** Demo prefills so the modal create flow is ready to submit. */
export function createDemoSecretFormState(type: TenantSecretType): TenantSecretFormState {
  const base = createDefaultSecretFormState(type)

  switch (type) {
    case 'key-value':
      return {
        ...base,
        keyValue: {
          name: 'cluster-admin-ssh',
          pairs: [
            {
              id: createRowId('kv'),
              key: 'ssh-public-key',
              value: CLUSTER_LAUNCH_DEMO_SSH_PUBLIC_KEY,
            },
          ],
        },
      }
    case 'image-pull':
      return {
        ...base,
        imagePull: {
          name: 'ocp-pull-secret',
          authMode: 'upload-configuration',
          credentials: [createImagePullCredential()],
          configurationFileName: 'pull-secret.json',
          configurationFileContents: CLUSTER_LAUNCH_DEMO_PULL_SECRET,
        },
      }
    case 'source':
      return {
        ...base,
        source: {
          name: 'github-source',
          authMode: 'basic',
          username: 'platform-bot',
          passwordOrToken: 'ghp_demo_platform_bot_token',
          sshPrivateKeyFileName: '',
          sshPrivateKeyContents: '',
        },
      }
    case 'webhook':
      return {
        ...base,
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
