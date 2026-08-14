import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Title,
} from '@patternfly/react-core'
import {
  getCatalogNetworkOptionLabel,
  type CatalogNetworkPolicy,
  type CatalogNetworkPolicyField,
  type CatalogNetworkResourceOption,
} from '../../providerAdmin/catalogNetworkPolicy'

const LEFT_NETWORK_FIELDS = [
  { key: 'virtualNetwork', label: 'Virtual network' },
  { key: 'subnet', label: 'Subnet' },
] as const satisfies ReadonlyArray<{
  key: keyof Pick<CatalogNetworkPolicy, 'virtualNetwork' | 'subnet'>
  label: string
}>

const RIGHT_NETWORK_FIELDS = [
  { key: 'securityGroup', label: 'Security group' },
  { key: 'externalIpPool', label: 'External IP pool' },
] as const satisfies ReadonlyArray<{
  key: keyof Pick<CatalogNetworkPolicy, 'securityGroup' | 'externalIpPool'>
  label: string
}>

type NetworkFieldKey =
  | (typeof LEFT_NETWORK_FIELDS)[number]['key']
  | (typeof RIGHT_NETWORK_FIELDS)[number]['key']

type CatalogNetworkingSummarySectionProps = {
  policy: CatalogNetworkPolicy
  virtualNetworkOptions: readonly CatalogNetworkResourceOption[]
  subnetOptions: readonly CatalogNetworkResourceOption[]
  securityGroupOptions: readonly CatalogNetworkResourceOption[]
  externalIpPoolOptions: readonly CatalogNetworkResourceOption[]
  title?: string
  className?: string
}

function resolveNetworkFieldLabel(
  field: CatalogNetworkPolicyField,
  options: readonly CatalogNetworkResourceOption[],
): string {
  const option = options.find((item) => item.id === field.id)
  if (option) {
    return getCatalogNetworkOptionLabel(option)
  }

  return field.name?.trim() || field.id || '—'
}

function optionsForField(
  key: NetworkFieldKey,
  props: Pick<
    CatalogNetworkingSummarySectionProps,
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

function NetworkingFieldList({
  fields,
  policy,
  optionProps,
  ariaLabel,
}: {
  fields: ReadonlyArray<{ key: NetworkFieldKey; label: string }>
  policy: CatalogNetworkPolicy
  optionProps: Pick<
    CatalogNetworkingSummarySectionProps,
    | 'virtualNetworkOptions'
    | 'subnetOptions'
    | 'securityGroupOptions'
    | 'externalIpPoolOptions'
  >
  ariaLabel: string
}) {
  return (
    <DescriptionList isCompact className="entity-details-page__dl" aria-label={ariaLabel}>
      {fields.map(({ key, label }) => (
        <DescriptionListGroup key={key}>
          <DescriptionListTerm>{label}</DescriptionListTerm>
          <DescriptionListDescription>
            {resolveNetworkFieldLabel(policy[key], optionsForField(key, optionProps))}
          </DescriptionListDescription>
        </DescriptionListGroup>
      ))}
    </DescriptionList>
  )
}

export function CatalogNetworkingSummarySection({
  policy,
  virtualNetworkOptions,
  subnetOptions,
  securityGroupOptions,
  externalIpPoolOptions,
  title = 'Networking',
  className = 'entity-details-page__column entity-details-page__column--span-2',
}: CatalogNetworkingSummarySectionProps) {
  const optionProps = {
    virtualNetworkOptions,
    subnetOptions,
    securityGroupOptions,
    externalIpPoolOptions,
  }

  return (
    <section className={className} aria-label={title}>
      <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
        {title}
      </Title>
      <div className="entity-details-page__columns entity-details-page__columns--2">
        <div className="entity-details-page__column">
          <NetworkingFieldList
            fields={LEFT_NETWORK_FIELDS}
            policy={policy}
            optionProps={optionProps}
            ariaLabel={`${title} placement`}
          />
        </div>
        <div className="entity-details-page__column">
          <NetworkingFieldList
            fields={RIGHT_NETWORK_FIELDS}
            policy={policy}
            optionProps={optionProps}
            ariaLabel={`${title} access`}
          />
        </div>
      </div>
    </section>
  )
}
