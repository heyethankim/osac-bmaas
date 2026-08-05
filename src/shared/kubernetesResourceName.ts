/** Kubernetes DNS-1123 label rules for user-entered resource names. */

export const KUBERNETES_RESOURCE_NAME_MAX_LENGTH = 63

export const KUBERNETES_RESOURCE_NAME_HELPER =
  'Use lowercase letters, numbers, and hyphens. Must start and end with a letter or number. Example: ml-training-pool'

export const KUBERNETES_RESOURCE_NAME_ERROR =
  'Names must be lowercase and use hyphens only (letters and numbers). Example: ml-training-pool'

const KUBERNETES_RESOURCE_NAME_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/

export function isValidKubernetesResourceName(value: string): boolean {
  const name = value.trim()
  if (!name || name.length > KUBERNETES_RESOURCE_NAME_MAX_LENGTH) {
    return false
  }

  return KUBERNETES_RESOURCE_NAME_PATTERN.test(name)
}

export type KubernetesResourceNameValidation = {
  isValid: boolean
  /** Empty input stays default so the naming hint is not shown as an error. */
  validated: 'default' | 'error'
  message: string
}

export function getKubernetesResourceNameValidation(
  value: string,
): KubernetesResourceNameValidation {
  const trimmed = value.trim()
  if (!trimmed) {
    return {
      isValid: false,
      validated: 'default',
      message: KUBERNETES_RESOURCE_NAME_HELPER,
    }
  }

  if (!isValidKubernetesResourceName(trimmed)) {
    return {
      isValid: false,
      validated: 'error',
      message: KUBERNETES_RESOURCE_NAME_ERROR,
    }
  }

  return {
    isValid: true,
    validated: 'default',
    message: KUBERNETES_RESOURCE_NAME_HELPER,
  }
}
