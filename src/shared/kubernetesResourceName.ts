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

export type KubernetesResourceNameRuleId = 'startEnd' | 'charset' | 'length'

export type KubernetesResourceNameRule = {
  id: KubernetesResourceNameRuleId
  label: string
  isMet: boolean
}

/** Live checklist rules for the name-validation popover. */
export function getKubernetesResourceNameRules(value: string): KubernetesResourceNameRule[] {
  const name = value.trim()

  return [
    {
      id: 'startEnd',
      label: 'Starts and ends with a lowercase letter or a number.',
      isMet: name.length > 0 && /^[a-z0-9]/.test(name) && /[a-z0-9]$/.test(name),
    },
    {
      id: 'charset',
      label: 'Contains only lowercase letters, numbers, and hyphens (-).',
      isMet: name.length > 0 && /^[a-z0-9-]+$/.test(name),
    },
    {
      id: 'length',
      label: `1-${KUBERNETES_RESOURCE_NAME_MAX_LENGTH} characters.`,
      isMet: name.length >= 1 && name.length <= KUBERNETES_RESOURCE_NAME_MAX_LENGTH,
    },
  ]
}

export type KubernetesResourceNameValidation = {
  isValid: boolean
  /** Empty input stays default so the field is not shown as an error. */
  validated: 'default' | 'error' | 'success'
  message: string
  rules: KubernetesResourceNameRule[]
}

export function getKubernetesResourceNameValidation(
  value: string,
): KubernetesResourceNameValidation {
  const trimmed = value.trim()
  const rules = getKubernetesResourceNameRules(value)

  if (!trimmed) {
    return {
      isValid: false,
      validated: 'default',
      message: KUBERNETES_RESOURCE_NAME_HELPER,
      rules,
    }
  }

  if (!isValidKubernetesResourceName(trimmed)) {
    return {
      isValid: false,
      validated: 'error',
      message: KUBERNETES_RESOURCE_NAME_ERROR,
      rules,
    }
  }

  return {
    isValid: true,
    validated: 'success',
    message: KUBERNETES_RESOURCE_NAME_HELPER,
    rules,
  }
}
