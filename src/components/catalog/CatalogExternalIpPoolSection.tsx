import { Checkbox, Content, Divider, Switch } from '@patternfly/react-core'
import type { CatalogExternalIpPoolPolicy } from '../../providerAdmin/catalogNetworkPolicy'
import type { ExternalIpPool } from '../../providerAdmin/externalIpPools'

type CatalogExternalIpPoolSectionProps = {
  idPrefix: string
  policy: CatalogExternalIpPoolPolicy
  pools: ExternalIpPool[]
  /** When true, switch and pool checkboxes cannot be changed. */
  readOnly?: boolean
  /** Horizontal rule above the section (detail drawers). */
  showDivider?: boolean
  onChange?: (policy: CatalogExternalIpPoolPolicy) => void
}

export function CatalogExternalIpPoolSection({
  idPrefix,
  policy,
  pools,
  readOnly = false,
  showDivider = false,
  onChange,
}: CatalogExternalIpPoolSectionProps) {
  const selectedIds = new Set(policy.poolIds)

  const setEnabled = (enabled: boolean) => {
    onChange?.({
      enabled,
      poolIds: enabled ? policy.poolIds : [],
    })
  }

  const togglePool = (poolId: string, checked: boolean) => {
    const nextIds = checked
      ? [...policy.poolIds.filter((id) => id !== poolId), poolId]
      : policy.poolIds.filter((id) => id !== poolId)
    onChange?.({
      enabled: true,
      poolIds: nextIds,
    })
  }

  return (
    <>
      {showDivider ? <Divider /> : null}
      <div className="catalog-external-ip-pool">
      <div className="catalog-external-ip-pool__header">
        <Content component="p" className="catalog-external-ip-pool__title">
          External IP pool
        </Content>
        <Content component="p" className="catalog-external-ip-pool__lede">
          When on, tenants can attach an address from the pools you allow for this offering. Manage
          pool inventory under Networking → External IP pools.
        </Content>
      </div>
      <div className="catalog-external-ip-pool__switch-row">
        <span>Offer external IP pools</span>
        <Switch
          id={`${idPrefix}-external-ip-pool-enabled`}
          label={policy.enabled ? 'On' : 'Off'}
          aria-label="Offer external IP pools"
          hasCheckIcon
          isChecked={policy.enabled}
          isDisabled={readOnly}
          onChange={(_event, checked) => {
            if (!readOnly) {
              setEnabled(checked)
            }
          }}
        />
      </div>
      {policy.enabled ? (
        pools.length === 0 ? (
          <Content component="p" className="catalog-external-ip-pool__empty">
            No external IP pools yet. Create pools under Networking → External IP pools, then return
            here to allow them on this catalog item.
          </Content>
        ) : (
          <ul className="catalog-external-ip-pool__list" aria-label="Allowed external IP pools">
            {pools.map((pool) => {
              const checkboxId = `${idPrefix}-pool-${pool.id}`
              const isChecked = selectedIds.has(pool.id)

              return (
                <li key={pool.id} className="catalog-external-ip-pool__row">
                  {readOnly ? (
                    <span className={isChecked ? undefined : 'catalog-external-ip-pool__row--muted'}>
                      {pool.name}
                      <span className="catalog-external-ip-pool__meta">
                        {pool.cidr} · {pool.dataCenter}
                        {isChecked ? ' · Allowed' : ' · Not allowed'}
                      </span>
                    </span>
                  ) : (
                    <Checkbox
                      id={checkboxId}
                      label={
                        <span>
                          {pool.name}
                          <span className="catalog-external-ip-pool__meta">
                            {pool.cidr} · {pool.dataCenter}
                          </span>
                        </span>
                      }
                      isChecked={isChecked}
                      onChange={(_event, checked) => togglePool(pool.id, checked)}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )
      ) : null}
    </div>
    </>
  )
}
