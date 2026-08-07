import { useEffect, useState, type ReactNode } from 'react'
import {
  Alert,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Switch,
  Title,
} from '@patternfly/react-core'
import {
  getCatalogNetworkOptionLabel,
  resolveCatalogNetworkPolicyField,
  type CatalogNetworkPolicy,
  type CatalogNetworkResourceOption,
} from '../../providerAdmin/catalogNetworkPolicy'

export type CatalogNetworkLockField =
  | 'virtualNetwork'
  | 'subnet'
  | 'securityGroup'
  | 'externalIpPool'

const NETWORK_FIELDS: ReadonlyArray<{
  key: CatalogNetworkLockField
  label: string
}> = [
  { key: 'virtualNetwork', label: 'Virtual network' },
  { key: 'subnet', label: 'Subnet' },
  { key: 'securityGroup', label: 'Security group' },
  { key: 'externalIpPool', label: 'External IP pools' },
]

const SAVED_FLASH_MS = 1500

/** Survives section remounts when the parent re-saves catalog state. */
let networkingSavedFlashUntil = 0

type CatalogNetworkingLocksSectionProps = {
  idPrefix: string
  policy: CatalogNetworkPolicy
  /** Bold alert title (policy guidance). */
  lede?: ReactNode
  /** Secondary alert body under the title. */
  ledeDescription?: ReactNode
  /** Section heading; defaults to Networking. Pass empty string to hide. */
  title?: string
  /** When true (default), show a brief Saved flash after changes. */
  showSavedFeedback?: boolean
  /** When true, dropdowns and switches cannot be changed. */
  readOnly?: boolean
  /**
   * When true, lock switches are visible but cannot be changed.
   * Unlocked field values remain editable unless `readOnly` is set.
   */
  locksReadOnly?: boolean
  /** Provider-locked fields stay locked and disabled even when editable for users. */
  providerLocked?: Partial<Record<CatalogNetworkLockField, boolean>>
  virtualNetworkOptions: readonly CatalogNetworkResourceOption[]
  subnetOptions: readonly CatalogNetworkResourceOption[]
  securityGroupOptions: readonly CatalogNetworkResourceOption[]
  externalIpPoolOptions: readonly CatalogNetworkResourceOption[]
  /** When virtual network changes, parent should refresh subnet options. */
  onVirtualNetworkChange?: (virtualNetworkId: string, next: CatalogNetworkPolicy) => void
  onChange?: (next: CatalogNetworkPolicy) => void
}

function optionsForField(
  key: CatalogNetworkLockField,
  props: Pick<
    CatalogNetworkingLocksSectionProps,
    | 'virtualNetworkOptions'
    | 'subnetOptions'
    | 'securityGroupOptions'
    | 'externalIpPoolOptions'
  >,
): readonly CatalogNetworkResourceOption[] {
  switch (key) {
    case 'virtualNetwork':
      return props.virtualNetworkOptions
    case 'subnet':
      return props.subnetOptions
    case 'securityGroup':
      return props.securityGroupOptions
    case 'externalIpPool':
      return props.externalIpPoolOptions
  }
}

function isNetworkingSavedFlashActive(): boolean {
  return Date.now() < networkingSavedFlashUntil
}

export function CatalogNetworkingLocksSection({
  idPrefix,
  policy,
  lede,
  ledeDescription,
  title = 'Networking',
  showSavedFeedback = true,
  readOnly = false,
  locksReadOnly = false,
  providerLocked,
  virtualNetworkOptions,
  subnetOptions,
  securityGroupOptions,
  externalIpPoolOptions,
  onVirtualNetworkChange,
  onChange,
}: CatalogNetworkingLocksSectionProps) {
  const [showSaved, setShowSaved] = useState(
    () => showSavedFeedback && isNetworkingSavedFlashActive(),
  )

  useEffect(() => {
    if (!showSavedFeedback || !showSaved) {
      return
    }

    const remaining = Math.max(0, networkingSavedFlashUntil - Date.now())
    const timeoutId = window.setTimeout(() => {
      setShowSaved(false)
    }, remaining)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [showSaved, showSavedFeedback])

  const flashSaved = () => {
    if (!showSavedFeedback) {
      return
    }
    networkingSavedFlashUntil = Date.now() + SAVED_FLASH_MS
    setShowSaved(true)
  }

  const updateFieldValue = (key: CatalogNetworkLockField, value: string) => {
    const options = optionsForField(key, {
      virtualNetworkOptions,
      subnetOptions,
      securityGroupOptions,
      externalIpPoolOptions,
    })
    const nextField = resolveCatalogNetworkPolicyField(options, value, policy[key].locked)
    const next: CatalogNetworkPolicy = {
      ...policy,
      enabled: true,
      [key]: nextField,
    }

    flashSaved()
    if (key === 'virtualNetwork') {
      onVirtualNetworkChange?.(value, next)
      return
    }

    onChange?.(next)
  }

  const updateFieldLock = (key: CatalogNetworkLockField, locked: boolean) => {
    flashSaved()
    onChange?.({
      ...policy,
      enabled: true,
      [key]: { ...policy[key], locked },
    })
  }

  const showTitleRow = Boolean(title) || (showSavedFeedback && showSaved)
  const showHeader = showTitleRow || Boolean(lede)

  return (
    <div className="catalog-networking-locks">
      {showHeader ? (
        <div className="catalog-networking-locks__header">
          {showTitleRow ? (
            <div className="catalog-networking-locks__title-row">
              {title ? (
                <Title
                  headingLevel="h2"
                  size="lg"
                  className="catalog-networking-locks__title"
                >
                  {title}
                </Title>
              ) : null}
              {showSavedFeedback && showSaved ? (
                <span className="catalog-networking-locks__status" role="status" aria-live="polite">
                  Saved
                </span>
              ) : null}
            </div>
          ) : null}
          {lede ? (
            <Alert
              variant="info"
              isInline
              title={lede}
              className="catalog-networking-locks__alert"
            >
              {ledeDescription ?? null}
            </Alert>
          ) : null}
        </div>
      ) : null}
      <Form autoComplete="off" className="catalog-networking-locks__form">
        {NETWORK_FIELDS.map(({ key, label }) => {
          const isProviderLocked = Boolean(providerLocked?.[key])
          const field = policy[key]
          const options = optionsForField(key, {
            virtualNetworkOptions,
            subnetOptions,
            securityGroupOptions,
            externalIpPoolOptions,
          })
          const selectDisabled = readOnly || isProviderLocked || field.locked
          const lockDisabled = readOnly || locksReadOnly || isProviderLocked
          const fieldId = `${idPrefix}-${key}`

          return (
            <div key={key} className="catalog-networking-locks__field">
              <FormGroup
                label={label}
                fieldId={fieldId}
                className="catalog-networking-locks__field-group"
              >
                <div className="catalog-networking-locks__controls">
                  <div className="catalog-networking-locks__select">
                    <FormSelect
                      id={fieldId}
                      value={field.id}
                      isDisabled={selectDisabled || options.length === 0}
                      onChange={(_event, value) => updateFieldValue(key, value)}
                      aria-label={label}
                    >
                      {options.length === 0 ? (
                        <FormSelectOption value="" label={`No ${label.toLowerCase()} available`} />
                      ) : (
                        options.map((option) => (
                          <FormSelectOption
                            key={option.id}
                            value={option.id}
                            label={getCatalogNetworkOptionLabel(option)}
                          />
                        ))
                      )}
                    </FormSelect>
                  </div>
                  <Switch
                    id={`${fieldId}-lock`}
                    className="catalog-networking-locks__lock"
                    label={field.locked ? 'Locked' : 'Unlocked'}
                    aria-label={`${label} lock`}
                    hasCheckIcon
                    isChecked={field.locked}
                    isDisabled={lockDisabled}
                    onChange={(_event, checked) => {
                      if (!lockDisabled) {
                        updateFieldLock(key, checked)
                      }
                    }}
                  />
                </div>
              </FormGroup>
            </div>
          )
        })}
      </Form>
    </div>
  )
}
