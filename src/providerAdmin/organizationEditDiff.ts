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
  displayName: EditSnapshotValue
  primaryDomain: EditSnapshotValue
  additionalDomains: EditSnapshotValue
  logo: EditSnapshotValue
  m360AccountId: EditSnapshotValue
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
    displayName: editSnapshotValue(form.displayName, form.displayName.trim() || '—'),
    primaryDomain: editSnapshotValue(form.primaryDomain, primaryDomain || '—'),
    additionalDomains: editSnapshotValue(
      JSON.stringify(additionalDomains),
      formatAdditionalDomains(form.additionalDomains, primaryDomain),
    ),
    logo: editSnapshotValue(
      form.logoSrc.trim(),
      formatLogo(form.logoSrc, form.logoFileName),
    ),
    m360AccountId: editSnapshotValue(
      form.m360AccountId,
      form.m360AccountId.trim() || '—',
    ),
  }
}

export function buildOrganizationEditSnapshotFromOrganization(
  organization: RegisteredOrganization,
): OrganizationEditSnapshot {
  return buildOrganizationEditSnapshot({
    organizationName: organization.name,
    displayName: organization.displayName?.trim() || organization.name,
    primaryDomain: organization.primaryDomain,
    additionalDomains:
      organization.additionalDomains.length > 0 ? [...organization.additionalDomains] : [],
    m360AccountId: organization.m360AccountId?.trim() || organization.billingAccountId.trim(),
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
    { id: 'displayName', stepId: 'organization', label: 'Display name' },
    { id: 'primaryDomain', stepId: 'organization', label: 'Primary email domain' },
    { id: 'additionalDomains', stepId: 'organization', label: 'Additional email domains' },
    { id: 'logo', stepId: 'organization', label: 'Company logo' },
    { id: 'm360AccountId', stepId: 'organization', label: 'M360 tenant name' },
  ])
}

export function getOrganizationEditModifiedStepIds(
  changes: ReadonlyArray<{ stepId: RegisterOrganizationStepId }>,
) {
  return getEditModifiedStepIds(changes)
}
