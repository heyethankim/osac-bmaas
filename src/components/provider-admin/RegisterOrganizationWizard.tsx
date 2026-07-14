import { useEffect, useMemo, useState } from 'react'
import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import { UsersIcon } from '@patternfly/react-icons/dist/esm/icons/users-icon'
import {
  Alert,
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
  ModalVariant,
  TextInput,
  Wizard,
  WizardHeader,
  WizardStep,
} from '@patternfly/react-core'
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import {
  getAssignableExternalIpPools,
  getExternalIpPoolById,
} from '../../providerAdmin/externalIpPools'
import { getProviderExternalIpPools } from '../../providerSetup/storage'
import {
  DEFAULT_REGISTER_ORGANIZATION_FORM,
  generateOrganizationId,
  generateTenantId,
  REGISTER_ORGANIZATION_STEPS,
  slugifyOrganizationName,
  type RegisterOrganizationForm,
  type RegisterOrganizationStepId,
  type RegisteredOrganization,
} from '../../providerAdmin/organizations'

type RegisterOrganizationWizardProps = {
  isOpen: boolean
  catalogDraft: ProviderCatalogDraft | null
  onClose: () => void
  onRegister: (organization: RegisteredOrganization) => void
}

function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function RegisterOrganizationWizard({
  isOpen,
  catalogDraft,
  onClose,
  onRegister,
}: RegisterOrganizationWizardProps) {
  const [form, setForm] = useState<RegisterOrganizationForm>(DEFAULT_REGISTER_ORGANIZATION_FORM)
  const assignablePools = useMemo(() => {
    if (!isOpen) {
      return []
    }

    return getAssignableExternalIpPools(getProviderExternalIpPools())
  }, [isOpen])

  const resetWizard = () => {
    setForm(DEFAULT_REGISTER_ORGANIZATION_FORM)
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
    const defaultPoolAvailable = pools.some((pool) => pool.id === DEFAULT_REGISTER_ORGANIZATION_FORM.externalIpPoolId)

    setForm((current) => ({
      ...current,
      externalIpPoolId: defaultPoolAvailable
        ? DEFAULT_REGISTER_ORGANIZATION_FORM.externalIpPoolId
        : (pools[0]?.id ?? ''),
    }))
  }, [isOpen])

  const handleRegister = () => {
    const maxInstances = Number.parseInt(form.maxInstances, 10)
    const selectedPool = getExternalIpPoolById(getProviderExternalIpPools(), form.externalIpPoolId)
    if (
      !form.organizationName.trim() ||
      !form.billingAccountId.trim() ||
      !form.billingAccountName.trim() ||
      !form.externalIpPoolId.trim() ||
      !selectedPool ||
      selectedPool.assignedOrganizationId !== null ||
      !form.tenantAdminName.trim() ||
      !isEmailValid(form.tenantAdminEmail) ||
      !Number.isFinite(maxInstances) ||
      maxInstances <= 0
    ) {
      return
    }

    const organization: RegisteredOrganization = {
      id: generateOrganizationId(),
      name: form.organizationName.trim(),
      tenantId: generateTenantId(),
      slug: slugifyOrganizationName(form.organizationName),
      billingAccountId: form.billingAccountId.trim(),
      billingAccountName: form.billingAccountName.trim(),
      catalogItemId: catalogDraft?.catalogItemId ?? null,
      catalogDisplayName: catalogDraft?.displayName ?? null,
      externalIpPoolId: selectedPool.id,
      externalIpPoolName: selectedPool.name,
      externalIpPoolCidr: selectedPool.cidr,
      maxInstances,
      tenantAdminName: form.tenantAdminName.trim(),
      tenantAdminEmail: form.tenantAdminEmail.trim(),
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
          <Form autoComplete="off" className="provider-admin-organizations__wizard-form">
            <Content component="p" className="provider-admin-organizations__wizard-lede">
              Create the tenant organization and map its billing account before inviting an admin.
            </Content>
            <FormGroup label="Organization name" fieldId="register-org-name" isRequired>
              <TextInput
                id="register-org-name"
                value={form.organizationName}
                onChange={(_event, value) =>
                  setForm((current) => ({ ...current, organizationName: value }))
                }
              />
            </FormGroup>
            <FormGroup label="Billing account ID" fieldId="register-billing-id" isRequired>
              <TextInput
                id="register-billing-id"
                value={form.billingAccountId}
                onChange={(_event, value) =>
                  setForm((current) => ({ ...current, billingAccountId: value }))
                }
                placeholder="ACCT-ORG-0001"
              />
            </FormGroup>
            <FormGroup label="Billing account name" fieldId="register-billing-name" isRequired>
              <TextInput
                id="register-billing-name"
                value={form.billingAccountName}
                onChange={(_event, value) =>
                  setForm((current) => ({ ...current, billingAccountName: value }))
                }
              />
            </FormGroup>
          </Form>
        )
      case 'access':
        return (
          <div className="provider-admin-organizations__wizard-access">
            <Content component="p" className="provider-admin-organizations__wizard-lede">
              Assign catalog access, instance quota, and an external IP pool for this organization.
            </Content>
            {catalogDraft ? (
              <Alert
                variant="info"
                isInline
                title="Catalog item assigned"
                className="provider-admin-organizations__wizard-alert"
              >
                <Content component="p">
                  {catalogDraft.displayName} (<code>{catalogDraft.catalogItemId}</code>) will be
                  available to this organization after the tenant admin activates.
                </Content>
              </Alert>
            ) : (
              <Alert
                variant="warning"
                isInline
                title="No published catalog item"
                className="provider-admin-organizations__wizard-alert"
              >
                Publish a catalog item first to scope storefront access during onboarding.
              </Alert>
            )}
            <Form autoComplete="off">
              <FormGroup label="External IP pool" fieldId="register-external-ip-pool" isRequired>
                {assignablePools.length > 0 ? (
                  <FormSelect
                    id="register-external-ip-pool"
                    value={form.externalIpPoolId}
                    onChange={(_event, value) =>
                      setForm((current) => ({ ...current, externalIpPoolId: value }))
                    }
                    aria-label="External IP pool"
                  >
                    {assignablePools.map((pool) => (
                      <FormSelectOption
                        key={pool.id}
                        value={pool.id}
                        label={`${pool.name} (${pool.cidr})`}
                      />
                    ))}
                  </FormSelect>
                ) : (
                  <Alert
                    variant="warning"
                    isInline
                    title="No available external IP pools"
                    className="provider-admin-organizations__wizard-alert"
                  >
                    Create a pool under Infrastructure → External IP pools before registering this
                    organization.
                  </Alert>
                )}
              </FormGroup>
              <FormGroup
                label="Maximum BMaaS instances"
                fieldId="register-max-instances"
                isRequired
              >
                <TextInput
                  id="register-max-instances"
                  type="number"
                  min={1}
                  value={form.maxInstances}
                  onChange={(_event, value) =>
                    setForm((current) => ({ ...current, maxInstances: value }))
                  }
                />
              </FormGroup>
            </Form>
          </div>
        )
      case 'tenant-admin':
        return (
          <Form autoComplete="off" className="provider-admin-organizations__wizard-form">
            <Content component="p" className="provider-admin-organizations__wizard-lede">
              Invite the first tenant admin. They receive access to configure the organization and
              let tenant users consume assigned catalog items.
            </Content>
            <FormGroup label="Tenant admin name" fieldId="register-admin-name" isRequired>
              <TextInput
                id="register-admin-name"
                value={form.tenantAdminName}
                onChange={(_event, value) =>
                  setForm((current) => ({ ...current, tenantAdminName: value }))
                }
              />
            </FormGroup>
            <FormGroup label="Tenant admin email" fieldId="register-admin-email" isRequired>
              <TextInput
                id="register-admin-email"
                type="email"
                value={form.tenantAdminEmail}
                onChange={(_event, value) =>
                  setForm((current) => ({ ...current, tenantAdminEmail: value }))
                }
                placeholder="admin@organization.com"
              />
            </FormGroup>
            <Content component="p" className="provider-admin-organizations__wizard-note">
              RBAC assigns the tenant admin role automatically when this invite is sent.
            </Content>
          </Form>
        )
      case 'review':
        return (
          <DescriptionList
            isCompact
            className="provider-admin-organizations__wizard-review"
          >
            <DescriptionListGroup>
              <DescriptionListTerm>Organization</DescriptionListTerm>
              <DescriptionListDescription>{form.organizationName.trim() || '—'}</DescriptionListDescription>
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
            <DescriptionListGroup>
              <DescriptionListTerm>Catalog access</DescriptionListTerm>
              <DescriptionListDescription>
                {catalogDraft?.displayName ?? 'No catalog item assigned'}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>External IP pool</DescriptionListTerm>
              <DescriptionListDescription>
                {getExternalIpPoolById(getProviderExternalIpPools(), form.externalIpPoolId)?.name ??
                  '—'}
                {form.externalIpPoolId ? (
                  <>
                    {' '}
                    ·{' '}
                    <code>
                      {getExternalIpPoolById(getProviderExternalIpPools(), form.externalIpPoolId)
                        ?.cidr ?? '—'}
                    </code>
                  </>
                ) : null}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Instance quota</DescriptionListTerm>
              <DescriptionListDescription>
                {form.maxInstances.trim() || '—'} BMaaS instances
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Tenant admin</DescriptionListTerm>
              <DescriptionListDescription>
                {form.tenantAdminName.trim() || '—'} · {form.tenantAdminEmail.trim() || '—'}
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
        isNextDisabled:
          !form.organizationName.trim() ||
          !form.billingAccountId.trim() ||
          !form.billingAccountName.trim(),
      }
    }

    if (stepId === 'access') {
      const maxInstances = Number.parseInt(form.maxInstances, 10)
      return {
        isNextDisabled:
          !form.externalIpPoolId.trim() ||
          assignablePools.length === 0 ||
          !Number.isFinite(maxInstances) ||
          maxInstances <= 0,
      }
    }

    if (stepId === 'tenant-admin') {
      return {
        isNextDisabled: !form.tenantAdminName.trim() || !isEmailValid(form.tenantAdminEmail),
      }
    }

    if (stepId === 'review') {
      return {
        nextButtonText: (
          <span className="provider-admin-organizations__register-label">
            <UsersIcon aria-hidden />
            <span>Register organization</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
        onNext: handleRegister,
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
