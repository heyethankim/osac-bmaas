import type {
  ImagePullAuthMode,
  SourceAuthMode,
  TenantSecretFormState,
} from '../components/tenant/secrets/secretFormTypes'

export type TenantSecretUsage = 'cluster-launch' | 'general'

export type TenantSecretType = 'key-value' | 'image-pull' | 'source' | 'webhook'

export type StoredKeyValuePair = {
  key: string
  value: string
}

export type StoredImagePullCredential = {
  registryServer: string
  username: string
  password: string
  email: string
}

export type TenantSecretData =
  | {
      kind: 'key-value'
      pairs: StoredKeyValuePair[]
    }
  | {
      kind: 'image-pull'
      authMode: ImagePullAuthMode
      credentials: StoredImagePullCredential[]
      configurationFileName: string
      configurationFileContents: string
    }
  | {
      kind: 'source'
      authMode: SourceAuthMode
      username: string
      passwordOrToken: string
      sshPrivateKeyFileName: string
      sshPrivateKeyContents: string
    }
  | {
      kind: 'webhook'
      webhookSecretKey: string
    }

export function buildTenantSecretData(
  type: TenantSecretType,
  form: TenantSecretFormState,
): TenantSecretData {
  switch (type) {
    case 'key-value':
      return {
        kind: 'key-value',
        pairs: form.keyValue.pairs
          .filter((pair) => pair.key.trim() && pair.value.trim())
          .map((pair) => ({ key: pair.key.trim(), value: pair.value })),
      }
    case 'image-pull':
      return {
        kind: 'image-pull',
        authMode: form.imagePull.authMode,
        credentials: form.imagePull.credentials
          .filter(
            (credential) =>
              credential.registryServer.trim() ||
              credential.username.trim() ||
              credential.password.trim() ||
              credential.email.trim(),
          )
          .map((credential) => ({
            registryServer: credential.registryServer.trim(),
            username: credential.username.trim(),
            password: credential.password,
            email: credential.email.trim(),
          })),
        configurationFileName: form.imagePull.configurationFileName.trim(),
        configurationFileContents: form.imagePull.configurationFileContents,
      }
    case 'source':
      return {
        kind: 'source',
        authMode: form.source.authMode,
        username: form.source.username.trim(),
        passwordOrToken: form.source.passwordOrToken,
        sshPrivateKeyFileName: form.source.sshPrivateKeyFileName.trim(),
        sshPrivateKeyContents: form.source.sshPrivateKeyContents,
      }
    case 'webhook':
      return {
        kind: 'webhook',
        webhookSecretKey: form.webhook.webhookSecretKey.trim(),
      }
    default:
      return { kind: 'key-value', pairs: [] }
  }
}
