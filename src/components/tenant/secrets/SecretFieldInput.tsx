import { useState } from 'react'
import { EyeIcon } from '@patternfly/react-icons/dist/esm/icons/eye-icon'
import { EyeSlashIcon } from '@patternfly/react-icons/dist/esm/icons/eye-slash-icon'
import { InputGroup, InputGroupItem, TextInput } from '@patternfly/react-core'

type SecretFieldInputProps = {
  id: string
  value: string
  onChange: (_event: React.FormEvent<HTMLInputElement>, value: string) => void
  placeholder?: string
  'aria-label'?: string
  isDisabled?: boolean
}

export function SecretFieldInput({
  id,
  value,
  onChange,
  placeholder,
  'aria-label': ariaLabel,
  isDisabled = false,
}: SecretFieldInputProps) {
  const [isHidden, setIsHidden] = useState(true)

  return (
    <InputGroup>
      <InputGroupItem isFill>
        <TextInput
          id={id}
          type={isHidden ? 'password' : 'text'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          aria-label={ariaLabel}
          isDisabled={isDisabled}
          autoComplete="off"
        />
      </InputGroupItem>
      <InputGroupItem>
        <button
          type="button"
          className="tenant-secrets__secret-toggle"
          aria-label={isHidden ? 'Show value' : 'Hide value'}
          disabled={isDisabled}
          onClick={() => setIsHidden((current) => !current)}
        >
          {isHidden ? <EyeIcon aria-hidden /> : <EyeSlashIcon aria-hidden />}
        </button>
      </InputGroupItem>
    </InputGroup>
  )
}
