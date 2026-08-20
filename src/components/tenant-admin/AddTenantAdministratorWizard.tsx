import { useEffect, useState } from 'react'
import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import { UserPlusIcon } from '@patternfly/react-icons/dist/esm/icons/user-plus-icon'
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
  TextInput,
} from '@patternfly/react-core'
import {
  formatOrganizationEmailDomainsLabel,
  type RegisteredOrganization,
} from '../../providerAdmin/organizations'
import {
  addAdditionalTenantAdministrator,
  emailMatchesOrganizationDomain,
  isTenantAdministratorEmailTaken,
  TENANT_ADMINISTRATORS_DEMO,
} from '../../tenantAdmin/administrators'
import { NetworkInventoryCreateWizardShell } from '../networking/NetworkInventoryCreateWizardShell'
import { NETWORK_INVENTORY_CREATE_REVIEW_STEP } from '../../networking/networkInventoryCreateWizard'

type AddTenantAdministratorForm = {
  name: string
  email: string
}

const ADD_TENANT_ADMINISTRATOR_STEPS = [
  { id: 'administrator', label: 'Administrator' },
  NETWORK_INVENTORY_CREATE_REVIEW_STEP,
] as const

type AddTenantAdministratorWizardProps = {
  isOpen: boolean
  organization: RegisteredOrganization
  onClose: () => void
  onAdded: (organization: RegisteredOrganization) => void
  parentLabel?: string
}

export function AddTenantAdministratorWizard({
  isOpen,
  organization,
  onClose,
  onAdded,
  parentLabel = TENANT_ADMINISTRATORS_DEMO.title,
}: AddTenantAdministratorWizardProps) {
  const [form, setForm] = useState<AddTenantAdministratorForm>({ name: '', email: '' })

  useEffect(() => {
    if (!isOpen) {
      setForm({ name: '', email: '' })
    }
  }, [isOpen])

  const emailTaken = isTenantAdministratorEmailTaken(organization, form.email)
  const emailDomainOk =
    !form.email.trim() || emailMatchesOrganizationDomain(form.email, organization)
  const isDetailsStepValid =
    Boolean(form.name.trim()) &&
    Boolean(form.email.trim()) &&
    !emailTaken &&
    emailDomainOk

  const handleClose = () => {
    setForm({ name: '', email: '' })
    onClose()
  }

  const handleAdd = () => {
    const updated = addAdditionalTenantAdministrator(organization, form)
    if (!updated) {
      return
    }

    onAdded(updated)
    handleClose()
  }

  function renderStepContent(stepId: string) {
    if (stepId === 'administrator') {
      return (
        <div className="tenant-admin-administrators__wizard-step">
          <Content component="p" className="tenant-admin-administrators__wizard-lede">
            Tenant administrators can manage catalog, networking, projects, and team access for
            this organization.
          </Content>
          <Form autoComplete="off" className="tenant-admin-administrators__wizard-form">
            <FormGroup label="Name" fieldId="add-tenant-admin-name" isRequired>
              <TextInput
                id="add-tenant-admin-name"
                value={form.name}
                onChange={(_event, value) => setForm((current) => ({ ...current, name: value }))}
                placeholder="e.g. Avery Quinn"
              />
            </FormGroup>
            <FormGroup label="Email" fieldId="add-tenant-admin-email" isRequired>
              <TextInput
                id="add-tenant-admin-email"
                type="email"
                value={form.email}
                validated={emailTaken || !emailDomainOk ? 'error' : 'default'}
                onChange={(_event, value) => setForm((current) => ({ ...current, email: value }))}
                placeholder={`colleague@${organization.primaryDomain}`}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant={emailTaken || !emailDomainOk ? 'error' : 'default'}>
                    {emailTaken
                      ? 'This person is already a tenant administrator.'
                      : !emailDomainOk
                        ? `Use an address on ${formatOrganizationEmailDomainsLabel(organization)}.`
                        : 'They will sign in with this email after your identity provider is connected.'}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          </Form>
        </div>
      )
    }

    return (
      <DescriptionList isCompact className="tenant-admin-administrators__wizard-review">
        <DescriptionListGroup>
          <DescriptionListTerm>Name</DescriptionListTerm>
          <DescriptionListDescription>{form.name.trim() || '—'}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Email</DescriptionListTerm>
          <DescriptionListDescription>
            <code>{form.email.trim().toLowerCase() || '—'}</code>
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Role</DescriptionListTerm>
          <DescriptionListDescription>
            {TENANT_ADMINISTRATORS_DEMO.additionalRoleLabel}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    )
  }

  function getStepFooter(stepId: string) {
    if (stepId === 'administrator') {
      return { isNextDisabled: !isDetailsStepValid }
    }

    if (stepId === 'review') {
      return {
        nextButtonText: (
          <span className="tenant-admin-administrators__wizard-footer-label">
            <UserPlusIcon aria-hidden />
            <span>Add tenant administrator</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
        onNext: handleAdd,
        isNextDisabled: !isDetailsStepValid,
      }
    }

    return undefined
  }

  return (
    <NetworkInventoryCreateWizardShell
      isOpen={isOpen}
      parentLabel={parentLabel}
      title="Add tenant administrator"
      titleId="add-tenant-administrator-wizard-title"
      steps={ADD_TENANT_ADMINISTRATOR_STEPS}
      renderStepContent={renderStepContent}
      getStepFooter={getStepFooter}
      onClose={handleClose}
      className="tenant-admin-administrators__wizard"
    />
  )
}
