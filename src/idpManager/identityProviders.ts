import {
  buildDemoIdentityProviderName,
  buildDefaultIdentityProviderClientId,
  normalizeAdditionalDomains,
  resolveOrganizationIdentityProviders,
  type IdentityProviderConnectedBy,
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

export function identityProviderFromDraft(
  draft: IdentityProviderDraft,
  primaryDomain: string,
  existingId?: string,
): OrganizationIdentityProvider {
  return toIdentityProvider(draft, primaryDomain, existingId)
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
  options?: {
    existingConnectedBy?: IdentityProviderConnectedBy | null
    connectedBy?: IdentityProviderConnectedBy
  },
): Partial<RegisteredOrganization> {
  const primary = providers[0]
  if (!primary) {
    return {
      identityProviderConnected: false,
      identityProviderConnectedBy: null,
      identityProviderName: null,
      identityProviderDisplayName: null,
      identityProviderProtocol: null,
      identityProviderIssuerUrl: null,
      identityProviderClientId: null,
    }
  }

  return {
    identityProviderConnected: true,
    identityProviderConnectedBy:
      options?.existingConnectedBy ?? options?.connectedBy ?? 'provider-admin',
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
  connectedBy: IdentityProviderConnectedBy,
): RegisteredOrganization | null {
  const nextProviders = [
    ...resolveOrganizationIdentityProviders(organization),
    toIdentityProvider(draft, organization.primaryDomain),
  ]

  return updateProviderRegisteredOrganization(organization.id, {
    identityProviders: nextProviders,
    additionalDomains: normalizeAdditionalDomains(additionalDomains, organization.primaryDomain),
    ...primaryIdentityProviderPatch(nextProviders, {
      existingConnectedBy: organization.identityProviderConnectedBy,
      connectedBy,
    }),
  })
}

export function updateOrganizationIdentityProvider(
  organization: RegisteredOrganization,
  providerId: string,
  draft: IdentityProviderDraft,
  additionalDomains: string[],
): RegisteredOrganization | null {
  const currentProviders = resolveOrganizationIdentityProviders(organization)
  const nextProviders = currentProviders.map((provider) =>
    provider.id === providerId
      ? toIdentityProvider(draft, organization.primaryDomain, provider.id)
      : provider,
  )

  if (nextProviders.every((provider, index) => provider === currentProviders[index])) {
    return null
  }

  return updateProviderRegisteredOrganization(organization.id, {
    identityProviders: nextProviders,
    additionalDomains: normalizeAdditionalDomains(additionalDomains, organization.primaryDomain),
    ...primaryIdentityProviderPatch(nextProviders, {
      existingConnectedBy: organization.identityProviderConnectedBy,
    }),
  })
}

export function removeOrganizationIdentityProvider(
  organization: RegisteredOrganization,
  providerId: string,
): RegisteredOrganization | null {
  const currentProviders = resolveOrganizationIdentityProviders(organization)
  const nextProviders = currentProviders.filter((provider) => provider.id !== providerId)
  if (nextProviders.length === currentProviders.length) {
    return null
  }

  return updateProviderRegisteredOrganization(organization.id, {
    identityProviders: nextProviders,
    ...primaryIdentityProviderPatch(nextProviders, {
      existingConnectedBy: organization.identityProviderConnectedBy,
    }),
  })
}

export function buildDefaultIdentityProviderDraft(
  organization: RegisteredOrganization,
): IdentityProviderDraft {
  const domain = organization.primaryDomain || 'example.com'
  const baseName = `${organization.name}-idp`
  const currentProviders = resolveOrganizationIdentityProviders(organization)
  const takenNames = new Set(
    currentProviders.map((provider) => provider.displayName.toLowerCase()),
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
      currentProviders.map((provider) => provider.clientId),
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
