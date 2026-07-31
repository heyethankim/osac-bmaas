import {
  Alert,
  AlertActionLink,
  Checkbox,
  Content,
  FormGroup,
} from '@patternfly/react-core'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'

export function normalizeEnterpriseTenantIds(
  value: string | readonly string[] | undefined,
): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.map((entry) => String(entry).trim()).filter(Boolean))]
  }

  if (typeof value !== 'string') {
    return []
  }

  const trimmed = value.trim()
  return trimmed ? [trimmed] : []
}

type VipEnterpriseOrganizationFieldProps = {
  organizations: RegisteredOrganization[]
  selectedTenantIds: string[]
  onSelectedTenantIdsChange: (tenantIds: string[]) => void
  onRegisterOrganization?: () => void
  fieldIdPrefix: string
}

export function VipEnterpriseOrganizationField({
  organizations,
  selectedTenantIds,
  onSelectedTenantIdsChange,
  onRegisterOrganization,
  fieldIdPrefix,
}: VipEnterpriseOrganizationFieldProps) {
  const selectedIdSet = new Set(normalizeEnterpriseTenantIds(selectedTenantIds))

  const toggleOrganization = (tenantId: string, isChecked: boolean) => {
    if (isChecked) {
      onSelectedTenantIdsChange([...selectedIdSet, tenantId])
      return
    }

    onSelectedTenantIdsChange([...selectedIdSet].filter((id) => id !== tenantId))
  }

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
              Go to Organizations
            </AlertActionLink>
          ) : undefined
        }
      >
        <Content component="p">
          VIP enterprise needs at least one registered organization to target. Register a new
          organization on the Organizations page, or save this catalog item as unpublished and
          assign tenants later. You can also switch to Global public to publish now.
        </Content>
      </Alert>
    )
  }

  return (
    <div className="provider-admin-catalog__vip-enterprise-field">
      <FormGroup
        label="Enterprise organizations"
        fieldId={`${fieldIdPrefix}-enterprise-organizations`}
        isRequired
      >
        <div
          className="provider-admin-catalog__vip-org-list"
          role="group"
          aria-label="Enterprise organizations"
        >
          <ul className="provider-admin-catalog__vip-org-checklist">
            {organizations.map((organization) => {
              const checkboxId = `${fieldIdPrefix}-enterprise-${organization.tenantId}`
              return (
                <li key={organization.id}>
                  <Checkbox
                    id={checkboxId}
                    label={`${organization.name} (${organization.tenantId})`}
                    isChecked={selectedIdSet.has(organization.tenantId)}
                    onChange={(_event, checked) =>
                      toggleOrganization(organization.tenantId, checked)
                    }
                  />
                </li>
              )
            })}
          </ul>
        </div>
      </FormGroup>

      <Alert
        variant="info"
        isInline
        title="Need to add a new enterprise?"
        className="provider-admin-catalog__vip-orgs-ack"
        actionLinks={
          onRegisterOrganization ? (
            <AlertActionLink component="button" onClick={onRegisterOrganization}>
              Go to Organizations
            </AlertActionLink>
          ) : undefined
        }
      >
        <Content component="p">
          Register the organization on the Organizations page first. After it is created, return to
          this wizard and select it here.
        </Content>
      </Alert>
    </div>
  )
}

export function formatVipEnterpriseVisibilityLabel(
  organizations: RegisteredOrganization[],
  enterpriseTenantIdOrIds: string | readonly string[] | undefined,
): string {
  const tenantIds = normalizeEnterpriseTenantIds(enterpriseTenantIdOrIds)
  if (tenantIds.length === 0) {
    return 'VIP enterprise · Restricted — unassigned'
  }

  const names = tenantIds.map((tenantId) => {
    const organization = organizations.find((entry) => entry.tenantId === tenantId)
    return organization?.name ?? tenantId
  })

  if (names.length === 1) {
    return `VIP enterprise · ${names[0]}`
  }

  if (names.length === 2) {
    return `VIP enterprise · ${names[0]}, ${names[1]}`
  }

  return `VIP enterprise · ${names[0]} +${names.length - 1} more`
}

export function getCatalogEnterpriseTenantIds(item: {
  enterpriseTenantId?: string
  enterpriseTenantIds?: string[]
}): string[] {
  if (item.enterpriseTenantIds?.length) {
    return normalizeEnterpriseTenantIds(item.enterpriseTenantIds)
  }

  return normalizeEnterpriseTenantIds(item.enterpriseTenantId)
}
