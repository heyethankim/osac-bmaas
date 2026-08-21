import { useState } from 'react'
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
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  Label,
  TextInput,
  Title,
} from '@patternfly/react-core'
import {
  formatOrganizationEmailDomainsLabel,
  type RegisteredOrganization,
} from '../../providerAdmin/organizations'
import {
  ASSIGNABLE_TENANT_ROLES,
  assignTenantAdministrator,
  assignTenantRole,
  buildDemoAssignRoleForm,
  emailMatchesOrganizationDomain,
  getAssignableTenantRole,
  isTenantAdministratorEmailTaken,
  TENANT_ADMINISTRATORS_DEMO,
  type AssignableTenantRoleId,
} from '../../tenantAdmin/administrators'
import { NetworkInventoryCreateWizardShell } from '../networking/NetworkInventoryCreateWizardShell'
import { NETWORK_INVENTORY_CREATE_REVIEW_STEP } from '../../networking/networkInventoryCreateWizard'

type AddTenantAdministratorForm = {
  name: string
  email: string
  roleId: AssignableTenantRoleId | null
}

const EMPTY_FORM: AddTenantAdministratorForm = {
  name: '',
  email: '',
  roleId: null,
}

type AddTenantAdministratorWizardProps = {
  isOpen: boolean
  organization: RegisteredOrganization
  onClose: () => void
  onAdded: (organization: RegisteredOrganization) => void
  parentLabel?: string
  title?: string
  submitLabel?: string
  showRoleCatalog?: boolean
}

export function AddTenantAdministratorWizard({
  isOpen,
  organization,
  onClose,
  onAdded,
  parentLabel = TENANT_ADMINISTRATORS_DEMO.title,
  title = 'Add tenant administrator',
  submitLabel = TENANT_ADMINISTRATORS_DEMO.addAdministratorLabel,
  showRoleCatalog = false,
}: AddTenantAdministratorWizardProps) {
  const [form, setForm] = useState<AddTenantAdministratorForm>(() =>
    showRoleCatalog
      ? buildDemoAssignRoleForm(organization)
      : { ...EMPTY_FORM, roleId: 'tenant-administrator' },
  )
  const selectedRole = form.roleId ? getAssignableTenantRole(form.roleId) : null

  const emailTaken = isTenantAdministratorEmailTaken(organization, form.email)
  const emailDomainOk =
    !form.email.trim() || emailMatchesOrganizationDomain(form.email, organization)
  const isDetailsStepValid =
    Boolean(form.name.trim()) &&
    Boolean(form.email.trim()) &&
    !emailTaken &&
    emailDomainOk &&
    (!showRoleCatalog || Boolean(form.roleId))

  const steps = [
    { id: 'administrator', label: showRoleCatalog ? 'Details' : 'Administrator' },
    NETWORK_INVENTORY_CREATE_REVIEW_STEP,
  ] as const

  const handleClose = () => {
    setForm(
      showRoleCatalog
        ? buildDemoAssignRoleForm(organization)
        : { ...EMPTY_FORM, roleId: 'tenant-administrator' },
    )
    onClose()
  }

  const handleAdd = () => {
    if (showRoleCatalog) {
      if (!form.roleId) {
        return
      }

      const updated = assignTenantRole(organization, {
        name: form.name,
        email: form.email,
        roleId: form.roleId,
      })
      if (!updated) {
        return
      }

      onAdded(updated)
      handleClose()
      return
    }

    const updated = assignTenantAdministrator(organization, form)
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
            {showRoleCatalog
              ? 'Select a role, then enter the person to assign it to.'
              : 'Tenant administrators can manage catalog, networking, projects, and team access for this tenant.'}
          </Content>
          <Form autoComplete="off" className="tenant-admin-administrators__wizard-form">
            {showRoleCatalog ? (
              <FormGroup
                label="Role"
                fieldId="add-tenant-admin-role"
                isRequired
                role="radiogroup"
              >
                <div
                  id="add-tenant-admin-role"
                  className="provider-setup-template__card-group tenant-admin-administrators__role-cards"
                  role="presentation"
                >
                  {ASSIGNABLE_TENANT_ROLES.map((role) => {
                    const isSelected = form.roleId === role.id
                    const titleId = `add-tenant-admin-role-${role.id}-title`

                    return (
                      <button
                        key={role.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        aria-labelledby={titleId}
                        className={`provider-setup-template__select-card tenant-admin-administrators__role-card${
                          isSelected ? ' provider-setup-template__select-card--selected' : ''
                        }`}
                        onClick={() =>
                          setForm((current) => ({ ...current, roleId: role.id }))
                        }
                      >
                        {isSelected ? (
                          <Label
                            color="grey"
                            isCompact
                            className="provider-setup-template__select-card-selected-badge"
                          >
                            Selected
                          </Label>
                        ) : null}
                        <Title
                          id={titleId}
                          headingLevel="h3"
                          size="md"
                          className="provider-setup-template__select-card-title"
                        >
                          {role.label}
                        </Title>
                        <Content
                          component="p"
                          className="provider-setup-template__select-card-detail"
                        >
                          {role.description}
                        </Content>
                      </button>
                    )
                  })}
                </div>
              </FormGroup>
            ) : null}
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
                      ? showRoleCatalog
                        ? 'This person is already assigned a role.'
                        : 'This person is already a tenant administrator.'
                      : !emailDomainOk
                        ? `Use an address on ${formatOrganizationEmailDomainsLabel(organization)}.`
                        : 'They will sign in with this email after your identity provider is connected.'}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
            {showRoleCatalog ? null : (
              <FormGroup label="Role" fieldId="add-tenant-admin-role" isRequired>
                <FormSelect
                  id="add-tenant-admin-role"
                  value="tenant-administrator"
                  onChange={() => undefined}
                  aria-label="Role"
                >
                  <FormSelectOption
                    value="tenant-administrator"
                    label={TENANT_ADMINISTRATORS_DEMO.roleLabel}
                  />
                </FormSelect>
              </FormGroup>
            )}
          </Form>
        </div>
      )
    }

    return (
      <DescriptionList isCompact className="tenant-admin-administrators__wizard-review">
        {showRoleCatalog ? (
          <>
            <DescriptionListGroup>
              <DescriptionListTerm>Role</DescriptionListTerm>
              <DescriptionListDescription>
                {selectedRole?.label ?? '—'}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Description</DescriptionListTerm>
              <DescriptionListDescription>
                {selectedRole?.description ?? '—'}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </>
        ) : null}
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
        {showRoleCatalog ? null : (
          <DescriptionListGroup>
            <DescriptionListTerm>Role</DescriptionListTerm>
            <DescriptionListDescription>
              {selectedRole?.label ?? '—'}
            </DescriptionListDescription>
          </DescriptionListGroup>
        )}
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
            <span>{submitLabel}</span>
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
      title={title}
      titleId="add-tenant-administrator-wizard-title"
      steps={steps}
      renderStepContent={renderStepContent}
      getStepFooter={getStepFooter}
      onClose={handleClose}
      className="tenant-admin-administrators__wizard"
    />
  )
}
