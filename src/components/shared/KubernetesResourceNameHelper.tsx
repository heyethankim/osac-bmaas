import { FormHelperText, HelperText, HelperTextItem } from '@patternfly/react-core'
import { getKubernetesResourceNameValidation } from '../../shared/kubernetesResourceName'

type KubernetesResourceNameHelperProps = {
  value: string
  /** Optional id for associating helper text with the input. */
  id?: string
}

/** Inline naming hint / error for DNS-1123 resource name fields. */
export function KubernetesResourceNameHelper({ value, id }: KubernetesResourceNameHelperProps) {
  const { validated, message } = getKubernetesResourceNameValidation(value)

  return (
    <FormHelperText>
      <HelperText>
        <HelperTextItem id={id} variant={validated === 'error' ? 'error' : 'default'}>
          {message}
        </HelperTextItem>
      </HelperText>
    </FormHelperText>
  )
}
