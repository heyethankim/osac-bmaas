import { MinusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/minus-circle-icon'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import {
  Button,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
} from '@patternfly/react-core'
import {
  isValidPrimaryDomain,
  normalizePrimaryDomain,
} from '../../providerAdmin/organizations'

type AdditionalEmailDomainsFieldProps = {
  idPrefix: string
  primaryDomain: string
  domains: string[]
  onChange: (domains: string[]) => void
  takenDomains: ReadonlySet<string>
  isDisabled?: boolean
}

function getDomainRowError(
  value: string,
  index: number,
  domains: readonly string[],
  primaryDomain: string,
  takenDomains: ReadonlySet<string>,
): string | null {
  if (!value.trim()) {
    return null
  }
  if (!isValidPrimaryDomain(value)) {
    return 'Enter a valid domain, such as example.com.'
  }

  const domain = normalizePrimaryDomain(value)
  if (domain === normalizePrimaryDomain(primaryDomain)) {
    return 'This is already the primary email domain.'
  }
  if (takenDomains.has(domain)) {
    return 'This email domain is already mapped to another organization.'
  }
  if (
    domains.some(
      (other, otherIndex) =>
        otherIndex !== index && normalizePrimaryDomain(other) === domain,
    )
  ) {
    return 'This domain is already listed.'
  }

  return null
}

export function AdditionalEmailDomainsField({
  idPrefix,
  primaryDomain,
  domains,
  onChange,
  takenDomains,
  isDisabled = false,
}: AdditionalEmailDomainsFieldProps) {
  const updateDomain = (index: number, value: string) => {
    onChange(domains.map((domain, domainIndex) => (domainIndex === index ? value : domain)))
  }

  const removeDomain = (index: number) => {
    onChange(domains.filter((_domain, domainIndex) => domainIndex !== index))
  }

  return (
    <FormGroup label="Additional email domains" fieldId={`${idPrefix}-0`}>
      {domains.map((domain, index) => {
        const error = getDomainRowError(domain, index, domains, primaryDomain, takenDomains)
        const fieldId = `${idPrefix}-${index}`

        return (
          <div key={fieldId} className="provider-admin-organizations__additional-domain-row">
            <div>
              <TextInput
                id={fieldId}
                value={domain}
                validated={error ? 'error' : 'default'}
                isDisabled={isDisabled}
                onChange={(_event, value) => updateDomain(index, value)}
                placeholder="example.com"
                aria-label={`Additional email domain ${index + 1}`}
              />
              {error ? (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant="error">{error}</HelperTextItem>
                  </HelperText>
                </FormHelperText>
              ) : null}
            </div>
            <Button
              variant="plain"
              aria-label={`Remove additional email domain ${index + 1}`}
              className="provider-admin-organizations__additional-domain-remove"
              icon={<MinusCircleIcon />}
              isDisabled={isDisabled}
              onClick={() => removeDomain(index)}
            />
          </div>
        )
      })}
      <Button
        variant="link"
        icon={<PlusCircleIcon />}
        isDisabled={isDisabled}
        onClick={() => onChange([...domains, ''])}
      >
        Add domain
      </Button>
    </FormGroup>
  )
}

export function AdditionalEmailDomainsValue({ domains }: { domains: readonly string[] }) {
  const normalized = domains.map((domain) => domain.trim()).filter(Boolean)
  if (normalized.length === 0) {
    return '—'
  }

  return normalized.join(', ')
}
