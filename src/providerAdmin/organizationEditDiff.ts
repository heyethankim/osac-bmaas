import {
  normalizeAdditionalDomains,
  normalizePrimaryDomain,
  type RegisterOrganizationForm,
  type RegisterOrganizationStepId,
  type RegisteredOrganization,
} from './organizations'
import {
  editSnapshotValue,
  getEditChanges,
  getEditModifiedStepIds,
  type EditSnapshotValue,
} from '../shared/editDiff'

type OrganizationEditSnapshot = {
  organizationName: EditSnapshotValue
  primaryDomain: EditSnapshotValue
  additionalDomains: EditSnapshotValue
  logo: EditSnapshotValue
  billingAccountName: EditSnapshotValue
}

function formatAdditionalDomains(domains: string[], primaryDomain: string): string {
  const normalized = normalizeAdditionalDomains(domains, primaryDomain)
  return normalized.length > 0 ? normalized.join(', ') : '—'
}

function formatLogo(logoSrc: string, logoFileName: string): string {
  if (!logoSrc.trim()) {
    return '—'
  }

  return logoFileName.trim() || 'Custom logo'
}

export function buildOrganizationEditSnapshot(form: RegisterOrganizationForm): OrganizationEditSnapshot {
  const primaryDomain = normalizePrimaryDomain(form.primaryDomain)
  const additionalDomains = normalizeAdditionalDomains(form.additionalDomains, primaryDomain)

  return {
    organizationName: editSnapshotValue(form.organizationName, form.organizationName.trim() || '—'),
    primaryDomain: editSnapshotValue(form.primaryDomain, primaryDomain || '—'),
    additionalDomains: editSnapshotValue(
      JSON.stringify(additionalDomains),
      formatAdditionalDomains(form.additionalDomains, primaryDomain),
    ),
    logo: editSnapshotValue(
      form.logoSrc.trim(),
      formatLogo(form.logoSrc, form.logoFileName),
    ),
    billingAccountName: editSnapshotValue(
      form.billingAccountName,
      form.billingAccountName.trim() || '—',
    ),
  }
}

export function buildOrganizationEditSnapshotFromOrganization(
  organization: RegisteredOrganization,
): OrganizationEditSnapshot {
  return buildOrganizationEditSnapshot({
    organizationName: organization.name,
    primaryDomain: organization.primaryDomain,
    additionalDomains:
      organization.additionalDomains.length > 0 ? [...organization.additionalDomains] : [],
    billingAccountId: organization.billingAccountId,
    billingAccountName: organization.billingAccountName,
    externalIpPoolId: organization.externalIpPoolId ?? '',
    maxInstances: String(organization.maxInstances),
    logoSrc: organization.logoSrc?.trim() || '',
    logoFileName: organization.logoFileName?.trim() || '',
    breakGlassUsername: organization.breakGlassUsername?.trim() || '',
    breakGlassPassword: '',
  })
}

export function getOrganizationEditChanges(
  baseline: OrganizationEditSnapshot,
  current: OrganizationEditSnapshot,
) {
  return getEditChanges(baseline, current, [
    { id: 'organizationName', stepId: 'organization', label: 'Tenant name' },
    { id: 'primaryDomain', stepId: 'organization', label: 'Primary email domain' },
    { id: 'additionalDomains', stepId: 'organization', label: 'Additional email domains' },
    { id: 'logo', stepId: 'organization', label: 'Company logo' },
    { id: 'billingAccountName', stepId: 'organization', label: 'Billing account name' },
  ])
}

export function getOrganizationEditModifiedStepIds(
  changes: ReadonlyArray<{ stepId: RegisterOrganizationStepId }>,
) {
  return getEditModifiedStepIds(changes)
}
