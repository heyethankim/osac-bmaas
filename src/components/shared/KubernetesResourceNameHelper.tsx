import { useEffect, useId, useRef, useState } from 'react'
import {
  Button,
  InputGroup,
  InputGroupItem,
  Popover,
  TextInput,
} from '@patternfly/react-core'
import { CheckCircleIcon } from '@patternfly/react-icons/dist/esm/icons/check-circle-icon'
import { CheckIcon } from '@patternfly/react-icons/dist/esm/icons/check-icon'
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon'
import {
  getKubernetesResourceNameValidation,
  type KubernetesResourceNameRule,
} from '../../shared/kubernetesResourceName'

type KubernetesResourceNameHelperProps = {
  value: string
  /** Optional id for associating the status control with the input. */
  id?: string
}

function NameValidationRuleList({ rules }: { rules: KubernetesResourceNameRule[] }) {
  return (
    <ul className="k8s-resource-name__rules" aria-label="Name requirements">
      {rules.map((rule) => (
        <li
          key={rule.id}
          className={`k8s-resource-name__rule${
            rule.isMet ? ' k8s-resource-name__rule--met' : ' k8s-resource-name__rule--unmet'
          }`}
        >
          <span className="k8s-resource-name__rule-icon" aria-hidden>
            {rule.isMet ? <CheckIcon /> : <span className="k8s-resource-name__rule-dot" />}
          </span>
          <span className="k8s-resource-name__rule-label">
            <span className="pf-v6-screen-reader">{rule.isMet ? 'Met: ' : 'Not met: '}</span>
            {rule.label}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Status control + checklist popover for DNS-1123 resource name fields. */
export function KubernetesResourceNameHelper({ value, id }: KubernetesResourceNameHelperProps) {
  const { isValid, validated, rules } = getKubernetesResourceNameValidation(value)
  const hasValue = value.trim().length > 0
  const isError = hasValue && !isValid
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const dismissedForValueRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isError) {
      setIsPopoverOpen(false)
      dismissedForValueRef.current = null
      return
    }

    if (dismissedForValueRef.current === value) {
      return
    }

    setIsPopoverOpen(true)
  }, [isError, value])

  const statusLabel = !hasValue
    ? 'Show name requirements'
    : isValid
      ? 'Name is valid. Show requirements'
      : 'Name is invalid. Show requirements'

  return (
    <Popover
      aria-label="Name requirements"
      position="top-end"
      hasAutoWidth
      isVisible={isPopoverOpen}
      shouldOpen={(_event, showFunction) => {
        dismissedForValueRef.current = null
        setIsPopoverOpen(true)
        showFunction?.()
      }}
      shouldClose={(_event, hideFunction) => {
        if (isError) {
          dismissedForValueRef.current = value
        }
        setIsPopoverOpen(false)
        hideFunction?.()
      }}
      alertSeverityVariant={isValid ? 'success' : isError ? 'danger' : 'info'}
      headerContent={isValid ? 'Valid name' : isError ? 'Invalid name' : 'Name requirements'}
      bodyContent={<NameValidationRuleList rules={rules} />}
      closeBtnAriaLabel="Close name requirements"
    >
      <Button
        variant="plain"
        id={id}
        className={`k8s-resource-name__status-button k8s-resource-name__status-button--${
          !hasValue ? 'pending' : validated
        }`}
        aria-label={statusLabel}
        aria-expanded={isPopoverOpen}
        icon={
          isValid ? (
            <CheckCircleIcon />
          ) : isError ? (
            <ExclamationCircleIcon />
          ) : (
            <CheckCircleIcon />
          )
        }
      />
    </Popover>
  )
}

type KubernetesResourceNameFieldProps = {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  'aria-label'?: string
  isRequired?: boolean
  isDisabled?: boolean
}

/** Text input with trailing name-validation status control. */
export function KubernetesResourceNameField({
  id,
  value,
  onChange,
  placeholder,
  'aria-label': ariaLabel,
  isRequired,
  isDisabled,
}: KubernetesResourceNameFieldProps) {
  const helperId = useId()
  const { isValid } = getKubernetesResourceNameValidation(value)
  const hasValue = value.trim().length > 0
  const isError = hasValue && !isValid

  return (
    <InputGroup
      className={`k8s-resource-name__field${isError ? ' k8s-resource-name__field--invalid' : ''}${
        isValid ? ' k8s-resource-name__field--valid' : ''
      }`}
    >
      <InputGroupItem isFill>
        <TextInput
          id={id}
          value={value}
          // Keep PatternFly status icons off the input; the trailing control owns status.
          validated="default"
          onChange={(_event, nextValue) => onChange(nextValue)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-invalid={isError}
          aria-describedby={helperId}
          isRequired={isRequired}
          isDisabled={isDisabled}
        />
      </InputGroupItem>
      <InputGroupItem>
        <KubernetesResourceNameHelper value={value} id={helperId} />
      </InputGroupItem>
    </InputGroup>
  )
}
