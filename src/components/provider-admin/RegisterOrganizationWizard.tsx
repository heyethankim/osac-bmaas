import { useEffect, useMemo, useState } from 'react'
import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import { UsersIcon } from '@patternfly/react-icons/dist/esm/icons/users-icon'
import {
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Modal,
  ModalVariant,
  TextInput,
  Wizard,
  WizardHeader,
  WizardStep,
} from '@patternfly/react-core'
import { KubernetesResourceNameHelper } from '../shared/KubernetesResourceNameHelper'
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import {
  getAssignableExternalIpPools,
  getExternalIpPoolById,
} from '../../providerAdmin/externalIpPools'
import {
  getProviderExternalIpPools,
  getProviderRegisteredOrganizations,
} from '../../providerSetup/storage'
import {
  DEFAULT_REGISTER_ORGANIZATION_FORM,
  DEFAULT_REGISTER_ORGANIZATION_TENANT_ADMIN,
  buildNextRegisterOrganizationForm,
  generateOrganizationId,
  generateTenantId,
  isOrganizationDomainTaken,
  isOrganizationNameTaken,
  isOrganizationSlugTaken,
  isValidPrimaryDomain,
  normalizePrimaryDomain,
  REGISTER_ORGANIZATION_STEPS,
  slugifyOrganizationName,
  type RegisterOrganizationForm,
  type RegisterOrganizationStepId,
  type RegisteredOrganization,
} from '../../providerAdmin/organizations'
import {
  getKubernetesResourceNameValidation,
  isValidKubernetesResourceName,
} from '../../shared/kubernetesResourceName'

type RegisterOrganizationWizardProps = {
  isOpen: boolean
  catalogDraft: ProviderCatalogDraft | null
  onClose: () => void
  onRegister: (organization: RegisteredOrganization) => void
}

export function RegisterOrganizationWizard({
  isOpen,
  catalogDraft,
  onClose,
  onRegister,
}: RegisterOrganizationWizardProps) {
  const [form, setForm] = useState<RegisterOrganizationForm>(() =>
    buildNextRegisterOrganizationForm(getProviderRegisteredOrganizations()),
  )
  const existingOrganizations = useMemo(() => {
    if (!isOpen) {
      return []
    }

    return getProviderRegisteredOrganizations()
  }, [isOpen])

  const assignablePools = useMemo(() => {
    if (!isOpen) {
      return []
    }

    return getAssignableExternalIpPools(getProviderExternalIpPools())
  }, [isOpen])

  const resetWizard = () => {
    setForm(buildNextRegisterOrganizationForm(getProviderRegisteredOrganizations()))
  }

  const handleClose = () => {
    resetWizard()
    onClose()
  }

  useEffect(() => {
    if (!isOpen) {
      resetWizard()
      return
    }

    const pools = getAssignableExternalIpPools(getProviderExternalIpPools())
    const nextForm = buildNextRegisterOrganizationForm(getProviderRegisteredOrganizations())
    const defaultPoolAvailable = pools.some(
      (pool) => pool.id === DEFAULT_REGISTER_ORGANIZATION_FORM.externalIpPoolId,
    )

    setForm({
      ...nextForm,
      externalIpPoolId: defaultPoolAvailable
        ? DEFAULT_REGISTER_ORGANIZATION_FORM.externalIpPoolId
        : (pools[0]?.id ?? ''),
    })
  }, [isOpen])

  const primaryDomain = normalizePrimaryDomain(form.primaryDomain)
  const nameTaken = isOrganizationNameTaken(form.organizationName, existingOrganizations)
  const domainTaken = isOrganizationDomainTaken(form.primaryDomain, existingOrganizations)
  const slugTaken = isOrganizationSlugTaken(form.organizationName, existingOrganizations)
  const nameFormat = getKubernetesResourceNameValidation(form.organizationName)
  const billingFormat = getKubernetesResourceNameValidation(form.billingAccountName)
  const isOrganizationStepValid =
    isValidKubernetesResourceName(form.organizationName) &&
    isValidKubernetesResourceName(form.billingAccountName) &&
    isValidPrimaryDomain(form.primaryDomain) &&
    !nameTaken &&
    !domainTaken &&
    !slugTaken

  const handleRegister = () => {
    const maxInstances = Number.parseInt(form.maxInstances, 10)
    const selectedPool = getExternalIpPoolById(getProviderExternalIpPools(), form.externalIpPoolId)
    const latestOrganizations = getProviderRegisteredOrganizations()
    if (
      !isOrganizationStepValid ||
      isOrganizationNameTaken(form.organizationName, latestOrganizations) ||
      isOrganizationDomainTaken(form.primaryDomain, latestOrganizations) ||
      isOrganizationSlugTaken(form.organizationName, latestOrganizations) ||
      !form.billingAccountId.trim() ||
      !form.externalIpPoolId.trim() ||
      !selectedPool ||
      selectedPool.assignedOrganizationId !== null ||
      !Number.isFinite(maxInstances) ||
      maxInstances <= 0 ||
      assignablePools.length === 0
    ) {
      return
    }

    const organization: RegisteredOrganization = {
      id: generateOrganizationId(),
      name: form.organizationName.trim(),
      tenantId: generateTenantId(),
      slug: slugifyOrganizationName(form.organizationName),
      primaryDomain,
      billingAccountId: form.billingAccountId.trim(),
      billingAccountName: form.billingAccountName.trim(),
      catalogItemId: catalogDraft?.catalogItemId ?? null,
      catalogDisplayName: catalogDraft?.displayName ?? null,
      externalIpPoolId: selectedPool.id,
      externalIpPoolName: selectedPool.name,
      externalIpPoolCidr: selectedPool.cidr,
      maxInstances,
      tenantAdminName: DEFAULT_REGISTER_ORGANIZATION_TENANT_ADMIN.name,
      tenantAdminEmail: DEFAULT_REGISTER_ORGANIZATION_TENANT_ADMIN.email,
      additionalTenantAdmins: [],
      invitedTenantUserEmails: [],
      identityProviderConnected: false,
      identityProviderName: null,
      identityProviderDisplayName: null,
      identityProviderProtocol: null,
      identityProviderIssuerUrl: null,
      identityProviderClientId: null,
      rbacConfigured: false,
      status: 'Pending activation',
      createdAt: new Date().toISOString(),
    }

    onRegister(organization)
    handleClose()
  }

  function renderStepContent(stepId: RegisterOrganizationStepId) {
    switch (stepId) {
      case 'organization':
        return (
          <div className="provider-admin-organizations__wizard-step">
            <Content component="p" className="provider-admin-organizations__wizard-lede">
              Create the tenant organization and map its billing account.
            </Content>
            <Form autoComplete="off" className="provider-admin-organizations__wizard-form">
              <FormGroup label="Organization name" fieldId="register-org-name" isRequired>
                <TextInput
                  id="register-org-name"
                  value={form.organizationName}
                  validated={
                    nameTaken || slugTaken || nameFormat.validated === 'error' ? 'error' : 'default'
                  }
                  onChange={(_event, value) =>
                    setForm((current) => ({
                      ...current,
                      organizationName: value,
                      billingAccountName: value.trim()
                        ? `${value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-enterprise-billing`
                        : '',
                    }))
                  }
                  placeholder="e.g. north-summit-bank"
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem
                      variant={
                        nameTaken || slugTaken || nameFormat.validated === 'error'
                          ? 'error'
                          : 'default'
                      }
                    >
                      {nameTaken
                        ? 'An organization with this name is already registered.'
                        : slugTaken
                          ? 'An organization with this login path already exists. Choose a different name.'
                          : nameFormat.message}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
              <FormGroup label="Primary email domain" fieldId="register-primary-domain" isRequired>
                <TextInput
                  id="register-primary-domain"
                  value={form.primaryDomain}
                  validated={domainTaken ? 'error' : 'default'}
                  onChange={(_event, value) =>
                    setForm((current) => ({ ...current, primaryDomain: value }))
                  }
                  placeholder="example.com"
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant={domainTaken ? 'error' : 'default'}>
                      {domainTaken
                        ? 'This email domain is already mapped to another organization.'
                        : 'Used to associate identity-provider users with this organization. Tenant admins are assigned later under Roles.'}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
              <FormGroup label="Billing account ID" fieldId="register-billing-id">
                <TextInput
                  id="register-billing-id"
                  value={form.billingAccountId}
                  readOnlyVariant="default"
                  aria-readonly="true"
                />
              </FormGroup>
              <FormGroup label="Billing account name" fieldId="register-billing-name" isRequired>
                <TextInput
                  id="register-billing-name"
                  value={form.billingAccountName}
                  validated={billingFormat.validated}
                  onChange={(_event, value) =>
                    setForm((current) => ({ ...current, billingAccountName: value }))
                  }
                  placeholder="e.g. north-summit-bank-enterprise-billing"
                />
                <KubernetesResourceNameHelper
                  value={form.billingAccountName}
                  id="register-billing-name-helper"
                />
              </FormGroup>
            </Form>
          </div>
        )
      case 'review':
        return (
          <DescriptionList isCompact className="provider-admin-organizations__wizard-review">
            <DescriptionListGroup>
              <DescriptionListTerm>Organization</DescriptionListTerm>
              <DescriptionListDescription>
                {form.organizationName.trim() || '—'}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Primary email domain</DescriptionListTerm>
              <DescriptionListDescription>
                <code>{primaryDomain || '—'}</code>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Billing account</DescriptionListTerm>
              <DescriptionListDescription>
                {form.billingAccountName.trim() || '—'}{' '}
                {form.billingAccountId.trim() ? (
                  <code>{form.billingAccountId.trim()}</code>
                ) : null}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        )
      default:
        return null
    }
  }

  function getStepFooter(stepId: RegisterOrganizationStepId) {
    if (stepId === 'organization') {
      return {
        isNextDisabled: !isOrganizationStepValid,
      }
    }

    if (stepId === 'review') {
      const maxInstances = Number.parseInt(form.maxInstances, 10)
      const canRegister =
        isOrganizationStepValid &&
        Boolean(form.externalIpPoolId.trim()) &&
        assignablePools.length > 0 &&
        Number.isFinite(maxInstances) &&
        maxInstances > 0

      return {
        nextButtonText: (
          <span className="provider-admin-organizations__register-label">
            <UsersIcon aria-hidden />
            <span>Register organization</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
        onNext: handleRegister,
        isNextDisabled: !canRegister,
      }
    }

    return undefined
  }

  return (
    <Modal
      variant={ModalVariant.medium}
      width="64rem"
      maxWidth="64rem"
      isOpen={isOpen}
      onEscapePress={handleClose}
      aria-labelledby="register-organization-wizard-title"
      className="provider-admin-organizations__wizard-modal"
    >
      {isOpen ? (
        <Wizard
          key="register-organization-wizard"
          className="provider-admin-organizations__wizard"
          height="40rem"
          onClose={handleClose}
          header={
            <WizardHeader
              title="Register organization"
              titleId="register-organization-wizard-title"
              onClose={handleClose}
              closeButtonAriaLabel="Close register organization wizard"
            />
          }
        >
          {REGISTER_ORGANIZATION_STEPS.map((step) => (
            <WizardStep
              key={step.id}
              name={step.label}
              id={`register-org-step-${step.id}`}
              footer={getStepFooter(step.id)}
            >
              {renderStepContent(step.id)}
            </WizardStep>
          ))}
        </Wizard>
      ) : null}
    </Modal>
  )
}
