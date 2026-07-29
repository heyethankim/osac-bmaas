import { useEffect, useState } from 'react'
import {
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  TextInput,
} from '@patternfly/react-core'
import {
  buildDemoIdentityProviderName,
  type RegisteredOrganization,
} from '../../providerAdmin/organizations'
import { updateProviderRegisteredOrganization } from '../../providerSetup/storage'

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
        organization.identityProviderDisplayName || `${organization.name} IdP`,
      issuerUrl:
        organization.identityProviderIssuerUrl || `https://login.${domain}/oauth2`,
      clientId: organization.identityProviderClientId || `bmaas-${organization.slug || 'tenant'}`,
    }
  }

  return {
    protocol: 'OIDC',
    displayName: `${organization.name} IdP`,
    issuerUrl: `https://login.${domain}/oauth2`,
    clientId: `bmaas-${organization.slug || 'tenant'}`,
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

  useEffect(() => {
    if (!isOpen || !organization) {
      return
    }

    setForm(buildDefaultForm(organization))
    setMode(organization.identityProviderConnected ? 'view' : 'connect')
  }, [isOpen, organization])

  if (!organization) {
    return null
  }

  const isFormDisabled = !form.displayName.trim() || !form.issuerUrl.trim() || !form.clientId.trim()
  const issuerLabel = form.protocol === 'SAML' ? 'Metadata URL' : 'Issuer URL'
  const clientLabel = form.protocol === 'SAML' ? 'Entity ID' : 'Client ID'

  const handleClose = () => {
    onClose()
  }

  const handleCancelEdit = () => {
    setForm(buildDefaultForm(organization))
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
    })

    if (!updated) {
      return
    }

    onConnected(updated)
    if (mode === 'connect') {
      onClose()
      return
    }

    setMode('view')
  }

  const title =
    mode === 'connect'
      ? 'Connect identity provider'
      : mode === 'edit'
        ? 'Edit identity provider'
        : 'Identity provider'

  const description =
    mode === 'connect'
      ? `Map sign-in for ${organization.name} to users from ${organization.primaryDomain || 'the primary domain'}.`
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
        {mode === 'view' ? (
          <>
            <Content component="p" className="provider-admin-organizations__idp-modal-lede">
              Review the settings used to authenticate users from the organization primary domain.
            </Content>
            <DescriptionList
              isCompact
              className="provider-admin-organizations__idp-view-dl"
              aria-label="Connected identity provider"
            >
              <DescriptionListGroup>
                <DescriptionListTerm>Primary email domain</DescriptionListTerm>
                <DescriptionListDescription>
                  <code>{organization.primaryDomain || '—'}</code>
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
                  <code>{form.issuerUrl || '—'}</code>
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{clientLabel}</DescriptionListTerm>
                <DescriptionListDescription>
                  <code>{form.clientId || '—'}</code>
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </>
        ) : (
          <>
            <Content component="p" className="provider-admin-organizations__idp-modal-lede">
              {mode === 'connect'
                ? 'Registration already captured the email domain. Connect the IdP that issues tokens for that domain — roles and the first tenant admin come next.'
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
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      Only identities from this domain can join this organization.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
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
    </Modal>
  )
}
