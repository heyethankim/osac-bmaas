import { useEffect, useRef, useState } from 'react'
import { MinusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/minus-circle-icon'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import {
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  DropzoneErrorCode,
  FileUpload,
  FileUploadHelperText,
  Form,
  FormGroup,
  FormHelperText,
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
  DEFAULT_REGISTER_ORGANIZATION_TENANT_ADMIN,
  normalizePrimaryDomain,
  type RegisteredOrganization,
} from '../../providerAdmin/organizations'
import { updateProviderRegisteredOrganization } from '../../providerSetup/storage'
import {
  ORGANIZATION_ACTION_SUCCESS_AUTO_CLOSE_MS,
  ORGANIZATION_ACTION_WORKING_MS,
  OrganizationActionSuccessState,
  OrganizationActionWorkingState,
  type OrganizationActionCompletionPhase,
} from './OrganizationActionSuccessState'

type TenantAdminDraft = {
  name: string
  email: string
}

type DefineRolesForm = {
  admins: TenantAdminDraft[]
  tenantUserEmailsText: string
}

type ModalMode = 'define' | 'view' | 'edit'

function buildDefaultAdmin(organization: RegisteredOrganization): TenantAdminDraft {
  const domain = organization.primaryDomain || 'example.com'
  const defaultEmail = DEFAULT_REGISTER_ORGANIZATION_TENANT_ADMIN.email
  const emailDomain = defaultEmail.includes('@')
    ? defaultEmail.split('@')[1]?.toLowerCase()
    : ''

  return {
    name: organization.tenantAdminName || DEFAULT_REGISTER_ORGANIZATION_TENANT_ADMIN.name,
    email: emailDomain === domain ? defaultEmail : `admin@${domain}`,
  }
}

function buildDefaultForm(organization: RegisteredOrganization): DefineRolesForm {
  if (organization.rbacConfigured) {
    const admins: TenantAdminDraft[] = [
      {
        name: organization.tenantAdminName,
        email: organization.tenantAdminEmail,
      },
      ...organization.additionalTenantAdmins,
    ].filter((admin) => admin.email.trim())

    return {
      admins: admins.length > 0 ? admins : [buildDefaultAdmin(organization)],
      tenantUserEmailsText: organization.invitedTenantUserEmails.join('\n'),
    }
  }

  return {
    admins: [buildDefaultAdmin(organization)],
    tenantUserEmailsText: '',
  }
}

function emailMatchesOrganizationDomain(email: string, primaryDomain: string): boolean {
  const domain = normalizePrimaryDomain(primaryDomain)
  if (!domain || !email.includes('@')) {
    return false
  }

  const emailDomain = email.split('@')[1]?.toLowerCase() ?? ''
  return emailDomain === domain
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (char === ',' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }
    current += char
  }

  cells.push(current)
  return cells
}

function normalizeEmailCell(value: string): string {
  return value.trim().toLowerCase().replace(/^['"]+|['"]+$/g, '')
}

/** Accepts a plain email list or a CSV with an email column header. */
function parseEmailsFromCsv(content: string): string[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return []
  }

  const headerCells = splitCsvLine(lines[0]).map((cell) => normalizeEmailCell(cell))
  const emailColumnIndex = headerCells.findIndex((cell) =>
    /^(e-?mail|user\s*e-?mail|email\s*address)$/i.test(cell),
  )
  const startIndex = emailColumnIndex >= 0 ? 1 : 0
  const seen = new Set<string>()
  const emails: string[] = []

  for (let lineIndex = startIndex; lineIndex < lines.length; lineIndex += 1) {
    const cells = splitCsvLine(lines[lineIndex]).map((cell) => normalizeEmailCell(cell))
    const candidates = emailColumnIndex >= 0 ? [cells[emailColumnIndex] ?? ''] : cells

    for (const candidate of candidates) {
      if (!candidate.includes('@') || seen.has(candidate)) {
        continue
      }
      seen.add(candidate)
      emails.push(candidate)
    }
  }

  return emails
}

function parseTenantUserEmails(value: string): string[] {
  return parseEmailsFromCsv(value)
}

type DefineOrganizationRolesModalProps = {
  isOpen: boolean
  organization: RegisteredOrganization | null
  onClose: () => void
  onConfigured: (organization: RegisteredOrganization) => void
}

export function DefineOrganizationRolesModal({
  isOpen,
  organization,
  onClose,
  onConfigured,
}: DefineOrganizationRolesModalProps) {
  const [mode, setMode] = useState<ModalMode>('define')
  const [form, setForm] = useState<DefineRolesForm>({
    admins: [{ name: '', email: '' }],
    tenantUserEmailsText: '',
  })
  const [csvFilename, setCsvFilename] = useState('')
  const [isCsvLoading, setIsCsvLoading] = useState(false)
  const [csvUploadError, setCsvUploadError] = useState<string | null>(null)
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
    setMode(organization.rbacConfigured ? 'view' : 'define')
    setCsvFilename('')
    setIsCsvLoading(false)
    setCsvUploadError(null)
  }, [isOpen, organization])

  if (!organization) {
    return null
  }

  const domain = organization.primaryDomain || 'the organization domain'
  const adminValidity = form.admins.map((admin) => {
    const email = admin.email.trim()
    const hasName = Boolean(admin.name.trim())
    const hasEmail = Boolean(email)
    const domainOk = !hasEmail || emailMatchesOrganizationDomain(email, organization.primaryDomain)
    return {
      hasName,
      hasEmail,
      domainOk,
      isComplete: hasName && hasEmail && domainOk,
    }
  })
  const invitedUserEmails = parseTenantUserEmails(form.tenantUserEmailsText)
  const invalidInvitedUserEmails = invitedUserEmails.filter(
    (email) => !emailMatchesOrganizationDomain(email, organization.primaryDomain),
  )
  const isAssignDisabled =
    form.admins.length === 0 ||
    adminValidity.some((entry) => !entry.isComplete) ||
    invalidInvitedUserEmails.length > 0
  const isCompleting = completionPhase !== 'idle'

  const handleClose = () => {
    clearCompletionTimers()
    setCompletionPhase('idle')
    onClose()
  }

  const handleCancelEdit = () => {
    setForm(buildDefaultForm(organization))
    setCsvFilename('')
    setCsvUploadError(null)
    setMode('view')
  }

  const handleSave = () => {
    if (isAssignDisabled) {
      return
    }

    const [primaryAdmin, ...restAdmins] = form.admins
    const updated = updateProviderRegisteredOrganization(organization.id, {
      rbacConfigured: true,
      tenantAdminName: primaryAdmin.name.trim(),
      tenantAdminEmail: primaryAdmin.email.trim().toLowerCase(),
      additionalTenantAdmins: restAdmins.map((admin) => ({
        name: admin.name.trim(),
        email: admin.email.trim().toLowerCase(),
      })),
      invitedTenantUserEmails: invitedUserEmails,
    })

    if (!updated) {
      return
    }

    onConfigured(updated)

    if (mode === 'define') {
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

  const updateAdmin = (index: number, patch: Partial<TenantAdminDraft>) => {
    setForm((current) => ({
      ...current,
      admins: current.admins.map((admin, adminIndex) =>
        adminIndex === index ? { ...admin, ...patch } : admin,
      ),
    }))
  }

  const addAdmin = () => {
    setForm((current) => ({
      ...current,
      admins: [...current.admins, { name: '', email: '' }],
    }))
  }

  const removeAdmin = (index: number) => {
    if (form.admins.length <= 1) {
      return
    }

    setForm((current) => ({
      ...current,
      admins: current.admins.filter((_, adminIndex) => adminIndex !== index),
    }))
  }

  const applyTenantUserEmails = (emailsText: string) => {
    setForm((current) => ({ ...current, tenantUserEmailsText: emailsText }))
  }

  const title =
    completionPhase === 'working'
      ? 'Assigning roles'
      : completionPhase === 'success'
        ? 'Roles assigned'
        : mode === 'define'
          ? 'Define roles'
          : mode === 'edit'
            ? 'Edit roles'
            : 'Roles'

  const description = isCompleting
    ? undefined
    : mode === 'define'
      ? `Define roles and assign people for ${organization.name}.`
      : mode === 'edit'
        ? `Update roles and assigned people for ${organization.name}.`
        : `Roles and assigned people for ${organization.name}.`

  const allAdminsForView: TenantAdminDraft[] = organization.rbacConfigured
    ? [
        { name: organization.tenantAdminName, email: organization.tenantAdminEmail },
        ...organization.additionalTenantAdmins,
      ].filter((admin) => admin.email.trim())
    : form.admins

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={handleClose}
      aria-labelledby="define-organization-roles-title"
      className="provider-admin-organizations__roles-modal"
    >
      <ModalHeader title={title} labelId="define-organization-roles-title" description={description} />
      <ModalBody>
        {completionPhase === 'working' ? (
          <OrganizationActionWorkingState
            title="Assigning roles"
            body="Saving tenant admins and user invitations…"
          />
        ) : completionPhase === 'success' ? (
          <OrganizationActionSuccessState
            title="Roles assigned"
            body="This organization is ready for tenant login."
          />
        ) : mode === 'view' ? (
          <DescriptionList
            isCompact
            className="provider-admin-organizations__roles-view-dl"
            aria-label="Assigned roles and people"
          >
            <DescriptionListGroup>
              <DescriptionListTerm>Tenant admins</DescriptionListTerm>
              <DescriptionListDescription>
                {allAdminsForView.length === 0 ? (
                  '—'
                ) : (
                  <ul className="provider-admin-organizations__roles-people-list">
                    {allAdminsForView.map((admin) => (
                      <li key={admin.email}>
                        <Content
                          component="p"
                          className="provider-admin-organizations__primary-cell"
                        >
                          {admin.name || '—'}
                        </Content>
                        <Content
                          component="p"
                          className="provider-admin-organizations__secondary-cell"
                        >
                          <code>{admin.email}</code>
                        </Content>
                      </li>
                    ))}
                  </ul>
                )}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Tenant users</DescriptionListTerm>
              <DescriptionListDescription>
                {organization.invitedTenantUserEmails.length === 0 ? (
                  'None invited yet'
                ) : (
                  <ul className="provider-admin-organizations__roles-people-list">
                    {organization.invitedTenantUserEmails.map((email) => (
                      <li key={email}>
                        <code>{email}</code>
                      </li>
                    ))}
                  </ul>
                )}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        ) : (
          <Form autoComplete="off" className="provider-admin-organizations__roles-form">
            <div className="provider-admin-organizations__roles-section">
              <Content component="p" className="provider-admin-organizations__roles-section-title">
                Tenant admins
              </Content>
              <Content component="p" className="provider-admin-organizations__roles-section-help">
                Emails must use @{domain}.
              </Content>
              {form.admins.map((admin, index) => {
                const validity = adminValidity[index]
                const showDomainError = Boolean(admin.email.trim()) && !validity.domainOk

                return (
                  <div
                    key={`tenant-admin-${index}`}
                    className="provider-admin-organizations__roles-admin-row"
                  >
                    <FormGroup
                      label={index === 0 ? 'Name' : `Name ${index + 1}`}
                      fieldId={`define-roles-admin-name-${index}`}
                      isRequired
                    >
                      <TextInput
                        id={`define-roles-admin-name-${index}`}
                        value={admin.name}
                        onChange={(_event, value) => updateAdmin(index, { name: value })}
                      />
                    </FormGroup>
                    <FormGroup
                      label={index === 0 ? 'Email' : `Email ${index + 1}`}
                      fieldId={`define-roles-admin-email-${index}`}
                      isRequired
                    >
                      <TextInput
                        id={`define-roles-admin-email-${index}`}
                        type="email"
                        value={admin.email}
                        validated={showDomainError ? 'error' : 'default'}
                        onChange={(_event, value) => updateAdmin(index, { email: value })}
                      />
                      {showDomainError ? (
                        <FormHelperText>
                          <HelperText>
                            <HelperTextItem variant="error">
                              Email must use @{domain}.
                            </HelperTextItem>
                          </HelperText>
                        </FormHelperText>
                      ) : null}
                    </FormGroup>
                    {form.admins.length > 1 ? (
                      <Button
                        variant="plain"
                        aria-label={`Remove tenant admin ${index + 1}`}
                        className="provider-admin-organizations__roles-admin-remove"
                        icon={<MinusCircleIcon />}
                        onClick={() => removeAdmin(index)}
                      />
                    ) : null}
                  </div>
                )
              })}
              <Button variant="link" icon={<PlusCircleIcon />} onClick={addAdmin}>
                Add tenant admin
              </Button>
            </div>

            <div className="provider-admin-organizations__roles-section">
              <Content component="p" className="provider-admin-organizations__roles-section-title">
                Tenant users
              </Content>
              <Content component="p" className="provider-admin-organizations__roles-section-help">
                Paste emails or upload a CSV. Emails must use @{domain}.
              </Content>
              <FormGroup label="User emails" fieldId="define-roles-user-emails">
                <FileUpload
                  id="define-roles-user-emails"
                  type="text"
                  value={form.tenantUserEmailsText}
                  filename={csvFilename}
                  filenamePlaceholder="Upload a .csv file"
                  onFileInputChange={(_event, file) => {
                    setCsvFilename(file.name)
                    setCsvUploadError(null)
                  }}
                  onDataChange={(_event, data) => {
                    const emails = parseEmailsFromCsv(data)
                    applyTenantUserEmails(emails.join('\n'))
                    setCsvUploadError(
                      emails.length === 0
                        ? 'No email addresses found in this file.'
                        : null,
                    )
                  }}
                  onTextChange={(_event, text) => {
                    applyTenantUserEmails(text)
                    setCsvUploadError(null)
                  }}
                  onReadStarted={() => setIsCsvLoading(true)}
                  onReadFinished={() => setIsCsvLoading(false)}
                  onClearClick={() => {
                    setCsvFilename('')
                    setCsvUploadError(null)
                    applyTenantUserEmails('')
                  }}
                  isLoading={isCsvLoading}
                  allowEditingUploadedText
                  browseButtonText="Upload"
                  dropzoneProps={{
                    accept: {
                      'text/csv': ['.csv'],
                      'text/plain': ['.csv', '.txt'],
                    },
                    maxSize: 1024 * 1024,
                    onDropRejected: (fileRejections) => {
                      const code = fileRejections[0]?.errors[0]?.code
                      if (code === DropzoneErrorCode.FileTooLarge) {
                        setCsvUploadError('File is too large. Maximum size is 1 MB.')
                        return
                      }
                      if (code === DropzoneErrorCode.FileInvalidType) {
                        setCsvUploadError('Upload a .csv or .txt file.')
                        return
                      }
                      setCsvUploadError('Could not upload this file.')
                    },
                  }}
                  validated={
                    csvUploadError || invalidInvitedUserEmails.length > 0 ? 'error' : 'default'
                  }
                  aria-label="Tenant user emails"
                >
                  <FileUploadHelperText>
                    <HelperText>
                      <HelperTextItem
                        variant={
                          csvUploadError || invalidInvitedUserEmails.length > 0
                            ? 'error'
                            : 'default'
                        }
                      >
                        {csvUploadError
                          ? csvUploadError
                          : invalidInvitedUserEmails.length > 0
                            ? `These emails must use @${domain}: ${invalidInvitedUserEmails.join(', ')}`
                            : 'One email per line, or a CSV with an email column.'}
                      </HelperTextItem>
                    </HelperText>
                  </FileUploadHelperText>
                </FileUpload>
              </FormGroup>
            </div>
          </Form>
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
          {mode === 'define' ? (
            <>
              <Button variant="primary" onClick={handleSave} isDisabled={isAssignDisabled}>
                Assign roles
              </Button>
              <Button variant="link" onClick={handleClose}>
                Cancel
              </Button>
            </>
          ) : null}
          {mode === 'edit' ? (
            <>
              <Button variant="primary" onClick={handleSave} isDisabled={isAssignDisabled}>
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
