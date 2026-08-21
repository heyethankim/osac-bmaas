import { useEffect, useRef, useState } from 'react'
import {
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  TextInput,
} from '@patternfly/react-core'
import {
  areAdditionalDomainsValid,
  buildDefaultAdditionalDomains,
  buildDefaultIdentityProviderClientId,
  buildDemoIdentityProviderName,
  getTakenEmailDomains,
  normalizeAdditionalDomains,
  type RegisteredOrganization,
} from '../../providerAdmin/organizations'
import { getProviderRegisteredOrganizations, updateProviderRegisteredOrganization } from '../../providerSetup/storage'
import {
  ORGANIZATION_ACTION_SUCCESS_AUTO_CLOSE_MS,
  ORGANIZATION_ACTION_WORKING_MS,
  OrganizationActionSuccessState,
  OrganizationActionWorkingState,
  type OrganizationActionCompletionPhase,
} from './OrganizationActionSuccessState'
import {
  AdditionalEmailDomainsField,
  AdditionalEmailDomainsValue,
} from './AdditionalEmailDomainsField'

type IdentityProviderProtocol = 'OIDC' | 'SAML'

type ConnectIdentityProviderForm = {
  protocol: IdentityProviderProtocol
  displayName: string
  issuerUrl: string
  clientId: string
}

type ModalMode = 'connect' | 'view' | 'edit'

function buildDefaultForm(organization: RegisteredOrganization): ConnectIdentityProviderForm {
  const domain = organization.primaryDomain || 'example.com'

  if (organization.identityProviderConnected) {
    return {
      protocol: organization.identityProviderProtocol ?? 'OIDC',
      displayName:
        organization.identityProviderDisplayName || `${organization.name}-idp`,
      issuerUrl:
        organization.identityProviderIssuerUrl || `https://login.${domain}/oauth2`,
      clientId:
        organization.identityProviderClientId ||
        buildDefaultIdentityProviderClientId(organization),
    }
  }

  return {
    protocol: 'OIDC',
    displayName: `${organization.name}-idp`,
    issuerUrl: `https://login.${domain}/oauth2`,
    clientId: buildDefaultIdentityProviderClientId(organization),
  }
}

function protocolLabel(protocol: IdentityProviderProtocol): string {
  return protocol === 'SAML' ? 'SAML 2.0' : 'OpenID Connect (OIDC)'
}

type ConnectOrganizationIdentityProviderModalProps = {
  isOpen: boolean
  organization: RegisteredOrganization | null
  onClose: () => void
  onConnected: (organization: RegisteredOrganization) => void
}

export function ConnectOrganizationIdentityProviderModal({
  isOpen,
  organization,
  onClose,
  onConnected,
}: ConnectOrganizationIdentityProviderModalProps) {
  const [mode, setMode] = useState<ModalMode>('connect')
  const [form, setForm] = useState<ConnectIdentityProviderForm>({
    protocol: 'OIDC',
    displayName: '',
    issuerUrl: '',
    clientId: '',
  })
  const [additionalDomains, setAdditionalDomains] = useState<string[]>([])
  const [completionPhase, setCompletionPhase] =
    useState<OrganizationActionCompletionPhase>('idle')
  const completionTimersRef = useRef<number[]>([])

  const clearCompletionTimers = () => {
    completionTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
    completionTimersRef.current = []
  }

  useEffect(() => {
    return () => {
      clearCompletionTimers()
    }
  }, [])

  useEffect(() => {
    if (!isOpen || !organization) {
      return
    }

    clearCompletionTimers()
    setCompletionPhase('idle')
    setForm(buildDefaultForm(organization))
    setAdditionalDomains(buildDefaultAdditionalDomains(organization))
    setMode(organization.identityProviderConnected ? 'view' : 'connect')
  }, [isOpen, organization])

  if (!organization) {
    return null
  }

  const takenEmailDomains = getTakenEmailDomains(
    getProviderRegisteredOrganizations(),
    organization.id,
  )
  const additionalDomainsValid = areAdditionalDomainsValid(
    additionalDomains,
    organization.primaryDomain,
    takenEmailDomains,
  )
  const isFormDisabled =
    !form.displayName.trim() ||
    !form.issuerUrl.trim() ||
    !form.clientId.trim() ||
    !additionalDomainsValid
  const issuerLabel = form.protocol === 'SAML' ? 'Metadata URL' : 'Issuer URL'
  const clientLabel = form.protocol === 'SAML' ? 'Entity ID' : 'Client ID'
  const isCompleting = completionPhase !== 'idle'

  const handleClose = () => {
    clearCompletionTimers()
    setCompletionPhase('idle')
    onClose()
  }

  const handleCancelEdit = () => {
    setForm(buildDefaultForm(organization))
    setAdditionalDomains(buildDefaultAdditionalDomains(organization))
    setMode('view')
  }

  const handleSave = () => {
    if (isFormDisabled) {
      return
    }

    const updated = updateProviderRegisteredOrganization(organization.id, {
      identityProviderConnected: true,
      identityProviderName: buildDemoIdentityProviderName(
        form.protocol,
        organization.primaryDomain,
      ),
      identityProviderDisplayName: form.displayName.trim(),
      identityProviderProtocol: form.protocol,
      identityProviderIssuerUrl: form.issuerUrl.trim(),
      identityProviderClientId: form.clientId.trim(),
      additionalDomains: normalizeAdditionalDomains(
        additionalDomains,
        organization.primaryDomain,
      ),
      idpInviteStatus: organization.idpInviteToken ? 'accepted' : organization.idpInviteStatus,
    })

    if (!updated) {
      return
    }

    onConnected(updated)

    if (mode === 'connect') {
      clearCompletionTimers()
      setCompletionPhase('working')
      const successTimer = window.setTimeout(() => {
        setCompletionPhase('success')
        const closeTimer = window.setTimeout(() => {
          setCompletionPhase('idle')
          onClose()
        }, ORGANIZATION_ACTION_SUCCESS_AUTO_CLOSE_MS)
        completionTimersRef.current.push(closeTimer)
      }, ORGANIZATION_ACTION_WORKING_MS)
      completionTimersRef.current.push(successTimer)
      return
    }

    setMode('view')
  }

  const title =
    completionPhase === 'working'
      ? 'Connecting identity provider'
      : completionPhase === 'success'
        ? 'Identity provider connected'
        : mode === 'connect'
          ? 'Connect identity provider'
          : mode === 'edit'
            ? 'Edit identity provider'
            : 'Identity provider'

  const description = isCompleting
    ? undefined
    : mode === 'connect'
      ? `Connect the IdP for ${organization.name}.`
      : mode === 'edit'
        ? `Update the identity provider for ${organization.name}.`
        : `Connected identity provider for ${organization.name}.`

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={handleClose}
      aria-labelledby="connect-organization-idp-title"
      className="provider-admin-organizations__idp-modal"
    >
      <ModalHeader
        title={title}
        labelId="connect-organization-idp-title"
        description={description}
      />
      <ModalBody>
        {completionPhase === 'working' ? (
          <OrganizationActionWorkingState
            title="Connecting identity provider"
            body="Validating configuration and mapping the primary domain…"
          />
        ) : completionPhase === 'success' ? (
          <OrganizationActionSuccessState
            title="Identity provider connected"
            body="This organization is now active. You can define roles anytime."
          />
        ) : mode === 'view' ? (
          <>
            <Content component="p" className="provider-admin-organizations__idp-modal-lede">
              Review the settings used to authenticate users from the organization email domains.
            </Content>
            <DescriptionList
              isCompact
              className="provider-admin-organizations__idp-view-dl"
              aria-label="Connected identity provider"
            >
              <DescriptionListGroup>
                <DescriptionListTerm>Primary email domain</DescriptionListTerm>
                <DescriptionListDescription>
                  {organization.primaryDomain || '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Additional email domains</DescriptionListTerm>
                <DescriptionListDescription>
                  <AdditionalEmailDomainsValue domains={organization.additionalDomains ?? []} />
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Protocol</DescriptionListTerm>
                <DescriptionListDescription>
                  {protocolLabel(form.protocol)}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Display name</DescriptionListTerm>
                <DescriptionListDescription>{form.displayName || '—'}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{issuerLabel}</DescriptionListTerm>
                <DescriptionListDescription>
                  {form.issuerUrl || '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{clientLabel}</DescriptionListTerm>
                <DescriptionListDescription>
                  {form.clientId || '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </>
        ) : (
          <>
            <Content component="p" className="provider-admin-organizations__idp-modal-lede">
              {mode === 'connect'
                ? 'Connect the IdP that issues tokens for this organization.'
                : 'Changes apply to tenant sign-in for this organization.'}
            </Content>
            <Form autoComplete="off" className="provider-admin-organizations__idp-form">
              <FormGroup label="Primary email domain" fieldId="connect-idp-domain">
                <TextInput
                  id="connect-idp-domain"
                  value={organization.primaryDomain || '—'}
                  readOnlyVariant="default"
                  aria-readonly="true"
                />
              </FormGroup>
              <AdditionalEmailDomainsField
                idPrefix="connect-idp-additional-domain"
                primaryDomain={organization.primaryDomain}
                domains={additionalDomains}
                onChange={setAdditionalDomains}
                takenDomains={takenEmailDomains}
                isDisabled={isCompleting}
              />
              <FormGroup label="Protocol" fieldId="connect-idp-protocol" isRequired>
                <FormSelect
                  id="connect-idp-protocol"
                  value={form.protocol}
                  onChange={(_event, value) =>
                    setForm((current) => ({
                      ...current,
                      protocol: value as IdentityProviderProtocol,
                    }))
                  }
                  aria-label="Identity provider protocol"
                >
                  <FormSelectOption value="OIDC" label="OpenID Connect (OIDC)" />
                  <FormSelectOption value="SAML" label="SAML 2.0" />
                </FormSelect>
              </FormGroup>
              <FormGroup label="Display name" fieldId="connect-idp-display-name" isRequired>
                <TextInput
                  id="connect-idp-display-name"
                  value={form.displayName}
                  onChange={(_event, value) =>
                    setForm((current) => ({ ...current, displayName: value }))
                  }
                />
              </FormGroup>
              <FormGroup label={issuerLabel} fieldId="connect-idp-issuer" isRequired>
                <TextInput
                  id="connect-idp-issuer"
                  value={form.issuerUrl}
                  onChange={(_event, value) =>
                    setForm((current) => ({ ...current, issuerUrl: value }))
                  }
                />
              </FormGroup>
              <FormGroup label={clientLabel} fieldId="connect-idp-client-id" isRequired>
                <TextInput
                  id="connect-idp-client-id"
                  value={form.clientId}
                  onChange={(_event, value) =>
                    setForm((current) => ({ ...current, clientId: value }))
                  }
                />
              </FormGroup>
            </Form>
          </>
        )}
      </ModalBody>
      {isCompleting ? null : (
        <ModalFooter>
          {mode === 'view' ? (
            <>
              <Button variant="primary" onClick={handleClose}>
                Close
              </Button>
              <Button variant="secondary" onClick={() => setMode('edit')}>
                Edit
              </Button>
            </>
          ) : null}
          {mode === 'connect' ? (
            <>
              <Button variant="primary" onClick={handleSave} isDisabled={isFormDisabled}>
                Connect identity provider
              </Button>
              <Button variant="link" onClick={handleClose}>
                Cancel
              </Button>
            </>
          ) : null}
          {mode === 'edit' ? (
            <>
              <Button variant="primary" onClick={handleSave} isDisabled={isFormDisabled}>
                Save
              </Button>
              <Button variant="link" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </>
          ) : null}
        </ModalFooter>
      )}
    </Modal>
  )
}
