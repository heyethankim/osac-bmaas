import { Content, Switch } from '@patternfly/react-core'
import type { CatalogNetworkPolicy } from '../../providerAdmin/catalogNetworkPolicy'

type NetworkLockField = 'virtualNetwork' | 'subnet' | 'securityGroup'

const NETWORK_LOCK_FIELDS: ReadonlyArray<{
  key: NetworkLockField
  label: string
}> = [
  { key: 'virtualNetwork', label: 'Virtual network' },
  { key: 'subnet', label: 'Subnet' },
  { key: 'securityGroup', label: 'Security group' },
]

type CatalogNetworkingLocksSectionProps = {
  idPrefix: string
  policy: CatalogNetworkPolicy
  lede: string
  /** Section heading; defaults to Networking. */
  title?: string
  /** When true, switches cannot be changed (tenant user preview). */
  readOnly?: boolean
  /** Provider-locked fields stay on and disabled even when editable. */
  providerLocked?: Partial<Record<NetworkLockField, boolean>>
  onChange?: (field: NetworkLockField, locked: boolean) => void
}

export function CatalogNetworkingLocksSection({
  idPrefix,
  policy,
  lede,
  title = 'Networking',
  readOnly = false,
  providerLocked,
  onChange,
}: CatalogNetworkingLocksSectionProps) {
  return (
    <div className="catalog-networking-locks">
      <div className="catalog-networking-locks__header">
        <Content component="p" className="catalog-networking-locks__title">
          {title}
        </Content>
        <Content component="p" className="catalog-networking-locks__lede">
          {lede}
        </Content>
      </div>
      <ul className="catalog-networking-locks__list" aria-label="Networking field locks">
        {NETWORK_LOCK_FIELDS.map(({ key, label }) => {
          const isProviderLocked = Boolean(providerLocked?.[key])
          const isLocked = policy[key].locked
          const isDisabled = readOnly || isProviderLocked

          return (
            <li key={key} className="catalog-networking-locks__row">
              <span>{label}</span>
              <Switch
                id={`${idPrefix}-${key}-lock`}
                label={isLocked ? 'Locked' : 'Unlocked'}
                aria-label={`${label} lock`}
                hasCheckIcon
                isChecked={isLocked}
                isDisabled={isDisabled}
                onChange={(_event, checked) => {
                  if (!isDisabled) {
                    onChange?.(key, checked)
                  }
                }}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
