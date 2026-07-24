import {
  Alert,
  AlertActionLink,
  Content,
  FormGroup,
  FormSelect,
  FormSelectOption,
} from '@patternfly/react-core'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'

type VipEnterpriseOrganizationFieldProps = {
  organizations: RegisteredOrganization[]
  selectedTenantId: string
  onSelectedTenantIdChange: (tenantId: string) => void
  onRegisterOrganization?: () => void
  fieldIdPrefix: string
}

export function VipEnterpriseOrganizationField({
  organizations,
  selectedTenantId,
  onSelectedTenantIdChange,
  onRegisterOrganization,
  fieldIdPrefix,
}: VipEnterpriseOrganizationFieldProps) {
  if (organizations.length === 0) {
    return (
      <Alert
        variant="warning"
        isInline
        title="No tenant organizations yet"
        className="provider-admin-catalog__vip-empty-alert"
        actionLinks={
          onRegisterOrganization ? (
            <AlertActionLink component="button" onClick={onRegisterOrganization}>
              Register organization
            </AlertActionLink>
          ) : undefined
        }
      >
        <Content component="p">
          VIP enterprise needs at least one registered organization to target. You can still save
          this catalog item as unpublished and assign a tenant later, or switch to Global public to
          publish now.
        </Content>
      </Alert>
    )
  }

  return (
    <FormGroup
      label="Enterprise organization"
      fieldId={`${fieldIdPrefix}-enterprise-organization`}
      isRequired
    >
      <FormSelect
        id={`${fieldIdPrefix}-enterprise-organization`}
        value={selectedTenantId}
        onChange={(_event, value) => onSelectedTenantIdChange(value)}
        aria-label="Enterprise organization"
      >
        <FormSelectOption value="" label="Select an organization" isDisabled />
        {organizations.map((organization) => (
          <FormSelectOption
            key={organization.id}
            value={organization.tenantId}
            label={`${organization.name} (${organization.tenantId})`}
          />
        ))}
      </FormSelect>
    </FormGroup>
  )
}

export function formatVipEnterpriseVisibilityLabel(
  organizations: RegisteredOrganization[],
  enterpriseTenantId: string | undefined,
): string {
  const trimmed = enterpriseTenantId?.trim() ?? ''
  if (!trimmed) {
    return 'VIP enterprise · Restricted — unassigned'
  }

  const organization = organizations.find((entry) => entry.tenantId === trimmed)
  if (organization) {
    return `VIP enterprise · ${organization.name}`
  }

  return `VIP enterprise · ${trimmed}`
}
