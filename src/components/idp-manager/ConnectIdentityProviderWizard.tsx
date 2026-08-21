import { useEffect, useRef, useState } from 'react'
import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import {
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  TextInput,
} from '@patternfly/react-core'
import { AdditionalEmailDomainsField, AdditionalEmailDomainsValue } from '../provider-admin/AdditionalEmailDomainsField'
import {
  ORGANIZATION_ACTION_SUCCESS_AUTO_CLOSE_MS,
  ORGANIZATION_ACTION_WORKING_MS,
  OrganizationActionSuccessState,
  OrganizationActionWorkingState,
  type OrganizationActionCompletionPhase,
} from '../provider-admin/OrganizationActionSuccessState'
import { NetworkInventoryCreateWizardShell } from '../networking/NetworkInventoryCreateWizardShell'
import { NETWORK_INVENTORY_CREATE_REVIEW_STEP } from '../../networking/networkInventoryCreateWizard'
import { ResourceCreatePageShell } from '../shared/ResourceCreatePageShell'
import {
  areAdditionalDomainsValid,
  buildDefaultAdditionalDomains,
  getTakenEmailDomains,
  identityProviderProtocolLabel,
  type OrganizationIdentityProvider,
  type RegisteredOrganization,
} from '../../providerAdmin/organizations'
import { getProviderRegisteredOrganizations } from '../../providerSetup/storage'
import {
  addOrganizationIdentityProvider,
  buildDefaultIdentityProviderDraft,
  draftFromIdentityProvider,
  updateOrganizationIdentityProvider,
  type IdentityProviderDraft,
} from '../../idpManager/identityProviders'

const CONNECT_IDENTITY_PROVIDER_STEPS = [
  { id: 'identity-provider', label: 'Identity provider' },
  NETWORK_INVENTORY_CREATE_REVIEW_STEP,
] as const

type ConnectIdentityProviderWizardProps = {
  isOpen: boolean
  organization: RegisteredOrganization
  editingProvider: OrganizationIdentityProvider | null
  onClose: () => void
  onSaved: (organization: RegisteredOrganization) => void
}

export function ConnectIdentityProviderWizard({
  isOpen,
  organization,
  editingProvider,
  onClose,
  onSaved,
}: ConnectIdentityProviderWizardProps) {
  const isEditing = editingProvider !== null
  const [form, setForm] = useState<IdentityProviderDraft>(() =>
    editingProvider
      ? draftFromIdentityProvider(editingProvider)
      : buildDefaultIdentityProviderDraft(organization),
  )
  const [additionalDomains, setAdditionalDomains] = useState(() =>
    buildDefaultAdditionalDomains(organization),
  )
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

  const takenEmailDomains = getTakenEmailDomains(
    getProviderRegisteredOrganizations(),
    organization.id,
  )
  const additionalDomainsValid = areAdditionalDomainsValid(
    additionalDomains,
    organization.primaryDomain,
    takenEmailDomains,
  )
  const isDetailsStepValid =
    Boolean(form.displayName.trim()) &&
    Boolean(form.issuerUrl.trim()) &&
    Boolean(form.clientId.trim()) &&
    additionalDomainsValid
  const issuerLabel = form.protocol === 'SAML' ? 'Metadata URL' : 'Issuer URL'
  const clientLabel = form.protocol === 'SAML' ? 'Entity ID' : 'Client ID'
  const parentLabel = 'Identity provider'
  const wizardTitle = isEditing ? 'Edit identity provider' : 'Connect identity provider'
  const submitLabel = isEditing ? 'Save' : 'Connect identity provider'

  const handleClose = () => {
    clearCompletionTimers()
    setCompletionPhase('idle')
    onClose()
  }

  const persistProvider = () => {
    return editingProvider
      ? updateOrganizationIdentityProvider(
          organization,
          editingProvider.id,
          form,
          additionalDomains,
        )
      : addOrganizationIdentityProvider(organization, form, additionalDomains)
  }

  const handleSave = () => {
    if (!isDetailsStepValid) {
      return
    }

    if (isEditing) {
      const updated = persistProvider()
      if (!updated) {
        return
      }
      onSaved(updated)
      handleClose()
      return
    }

    clearCompletionTimers()
    setCompletionPhase('working')
    const successTimer = window.setTimeout(() => {
      const updated = persistProvider()
      if (!updated) {
        setCompletionPhase('idle')
        return
      }
      onSaved(updated)
      setCompletionPhase('success')
      const doneTimer = window.setTimeout(() => {
        handleClose()
      }, ORGANIZATION_ACTION_SUCCESS_AUTO_CLOSE_MS)
      completionTimersRef.current.push(doneTimer)
    }, ORGANIZATION_ACTION_WORKING_MS)
    completionTimersRef.current.push(successTimer)
  }

  function renderStepContent(stepId: string) {
    if (stepId === 'identity-provider') {
      return (
        <div className="provider-admin-organizations__wizard-step">
          <Content component="p" className="provider-admin-organizations__wizard-lede">
            {isEditing
              ? 'Update the identity provider that authenticates users for this organization.'
              : 'Connect the IdP that issues tokens for this organization.'}
          </Content>
          <Form autoComplete="off" className="provider-admin-organizations__wizard-form">
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
            />
            <FormGroup label="Protocol" fieldId="connect-idp-protocol" isRequired>
              <FormSelect
                id="connect-idp-protocol"
                value={form.protocol}
                onChange={(_event, value) =>
                  setForm((current) => ({
                    ...current,
                    protocol: value as IdentityProviderDraft['protocol'],
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
            <FormGroup label={clientLabel} fieldId="connect-idp-client" isRequired>
              <TextInput
                id="connect-idp-client"
                value={form.clientId}
                onChange={(_event, value) =>
                  setForm((current) => ({ ...current, clientId: value }))
                }
              />
            </FormGroup>
          </Form>
        </div>
      )
    }

    return (
      <DescriptionList isCompact className="provider-admin-organizations__wizard-review">
        <DescriptionListGroup>
          <DescriptionListTerm>Primary email domain</DescriptionListTerm>
          <DescriptionListDescription>
            {organization.primaryDomain || '—'}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Additional email domains</DescriptionListTerm>
          <DescriptionListDescription>
            <AdditionalEmailDomainsValue domains={additionalDomains} />
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Protocol</DescriptionListTerm>
          <DescriptionListDescription>
            {identityProviderProtocolLabel(form.protocol)}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Display name</DescriptionListTerm>
          <DescriptionListDescription>{form.displayName.trim() || '—'}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>{issuerLabel}</DescriptionListTerm>
          <DescriptionListDescription>
            {form.issuerUrl.trim() || '—'}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>{clientLabel}</DescriptionListTerm>
          <DescriptionListDescription>
            {form.clientId.trim() || '—'}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    )
  }

  function getStepFooter(stepId: string) {
    if (stepId === 'identity-provider') {
      return { isNextDisabled: !isDetailsStepValid }
    }

    if (stepId === 'review') {
      return {
        nextButtonText: (
          <span className="provider-admin-network-inventory__wizard-footer-label">
            {!isEditing ? <PlusIcon aria-hidden /> : null}
            <span>{submitLabel}</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
        onNext: handleSave,
        isNextDisabled: !isDetailsStepValid,
      }
    }

    return undefined
  }

  if (completionPhase !== 'idle') {
    return (
      <ResourceCreatePageShell
        parentLabel={parentLabel}
        title={wizardTitle}
        titleId="connect-identity-provider-wizard-title"
        onBack={handleClose}
      >
        <div className="idp-manager-identity-provider__completion">
          {completionPhase === 'working' ? (
            <OrganizationActionWorkingState
              title="Connecting identity provider"
              body="Validating configuration and mapping the primary domain…"
            />
          ) : (
            <OrganizationActionSuccessState
              title="Identity provider connected"
              body="You can add another identity provider anytime."
            />
          )}
        </div>
      </ResourceCreatePageShell>
    )
  }

  return (
    <NetworkInventoryCreateWizardShell
      isOpen={isOpen}
      parentLabel={parentLabel}
      title={wizardTitle}
      titleId="connect-identity-provider-wizard-title"
      steps={CONNECT_IDENTITY_PROVIDER_STEPS}
      renderStepContent={renderStepContent}
      getStepFooter={getStepFooter}
      onClose={handleClose}
      className="idp-manager-identity-provider__wizard"
    />
  )
}
