import {
  buildDemoIdentityProviderName,
  buildDefaultIdentityProviderClientId,
  normalizeAdditionalDomains,
  type OrganizationIdentityProvider,
  type RegisteredOrganization,
} from '../providerAdmin/organizations'
import { updateProviderRegisteredOrganization } from '../providerSetup/storage'

export type IdentityProviderDraft = {
  displayName: string
  protocol: OrganizationIdentityProvider['protocol']
  issuerUrl: string
  clientId: string
}

function buildIdentityProviderId(): string {
  return `idp-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

function toIdentityProvider(
  draft: IdentityProviderDraft,
  primaryDomain: string,
  existingId?: string,
): OrganizationIdentityProvider {
  const displayName = draft.displayName.trim()
  return {
    id: existingId ?? buildIdentityProviderId(),
    name: buildDemoIdentityProviderName(draft.protocol, primaryDomain),
    displayName,
    protocol: draft.protocol,
    issuerUrl: draft.issuerUrl.trim(),
    clientId: draft.clientId.trim(),
  }
}

function primaryIdentityProviderPatch(
  providers: OrganizationIdentityProvider[],
): Partial<RegisteredOrganization> {
  const primary = providers[0]
  if (!primary) {
    return {}
  }

  return {
    identityProviderConnected: true,
    identityProviderName: primary.name,
    identityProviderDisplayName: primary.displayName,
    identityProviderProtocol: primary.protocol,
    identityProviderIssuerUrl: primary.issuerUrl,
    identityProviderClientId: primary.clientId,
    idpInviteStatus: 'accepted',
    status: 'Active',
  }
}

export function addOrganizationIdentityProvider(
  organization: RegisteredOrganization,
  draft: IdentityProviderDraft,
  additionalDomains: string[],
): RegisteredOrganization | null {
  const nextProviders = [
    ...organization.identityProviders,
    toIdentityProvider(draft, organization.primaryDomain),
  ]

  return updateProviderRegisteredOrganization(organization.id, {
    identityProviders: nextProviders,
    additionalDomains: normalizeAdditionalDomains(additionalDomains, organization.primaryDomain),
    ...primaryIdentityProviderPatch(nextProviders),
  })
}

export function updateOrganizationIdentityProvider(
  organization: RegisteredOrganization,
  providerId: string,
  draft: IdentityProviderDraft,
  additionalDomains: string[],
): RegisteredOrganization | null {
  const nextProviders = organization.identityProviders.map((provider) =>
    provider.id === providerId
      ? toIdentityProvider(draft, organization.primaryDomain, provider.id)
      : provider,
  )

  if (nextProviders.every((provider, index) => provider === organization.identityProviders[index])) {
    return null
  }

  return updateProviderRegisteredOrganization(organization.id, {
    identityProviders: nextProviders,
    additionalDomains: normalizeAdditionalDomains(additionalDomains, organization.primaryDomain),
    ...primaryIdentityProviderPatch(nextProviders),
  })
}

export function removeOrganizationIdentityProvider(
  organization: RegisteredOrganization,
  providerId: string,
): RegisteredOrganization | null {
  const nextProviders = organization.identityProviders.filter((provider) => provider.id !== providerId)
  if (nextProviders.length === organization.identityProviders.length) {
    return null
  }

  return updateProviderRegisteredOrganization(organization.id, {
    identityProviders: nextProviders,
    ...primaryIdentityProviderPatch(nextProviders),
  })
}

export function buildDefaultIdentityProviderDraft(
  organization: RegisteredOrganization,
): IdentityProviderDraft {
  const domain = organization.primaryDomain || 'example.com'
  const baseName = `${organization.name}-idp`
  const takenNames = new Set(
    organization.identityProviders.map((provider) => provider.displayName.toLowerCase()),
  )
  let displayName = baseName
  let suffix = 2
  while (takenNames.has(displayName.toLowerCase())) {
    displayName = `${baseName}-${suffix}`
    suffix += 1
  }

  return {
    protocol: 'OIDC',
    displayName,
    issuerUrl: `https://login.${domain}/oauth2`,
    clientId: buildDefaultIdentityProviderClientId(
      organization,
      organization.identityProviders.map((provider) => provider.clientId),
    ),
  }
}

export type IdentityProviderProtocolFilter = 'all' | 'OIDC' | 'SAML'
export type IdentityProviderStatusFilter = 'all' | 'Connected'

export function buildIdentityProviderFilterParts(
  searchValue: string,
  selectedProtocol: IdentityProviderProtocolFilter = 'all',
  selectedStatus: IdentityProviderStatusFilter = 'all',
): string[] {
  const parts: string[] = []

  if (selectedProtocol !== 'all') {
    parts.push(`protocol: ${selectedProtocol}`)
  }

  if (selectedStatus !== 'all') {
    parts.push(`idp status: ${selectedStatus}`)
  }

  if (searchValue.trim()) {
    parts.push(`search: "${searchValue.trim()}"`)
  }

  return parts
}

export function draftFromIdentityProvider(
  provider: OrganizationIdentityProvider,
): IdentityProviderDraft {
  return {
    protocol: provider.protocol,
    displayName: provider.displayName,
    issuerUrl: provider.issuerUrl,
    clientId: provider.clientId,
  }
}
