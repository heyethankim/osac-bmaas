import { useEffect, useState } from 'react'
import {
  Button,
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
  CREATE_PROJECT_WIZARD_DEMO,
  generateProjectWizardMemberId,
  isProjectMemberEmailValid,
  TENANT_PROJECT_MEMBER_ROLES,
} from '../../tenantAdmin/createProjectWizard'
import {
  TENANT_PROJECTS_TEAMS_DEMO,
  type TenantProject,
  type TenantProjectMember,
  type TenantProjectMemberRole,
} from '../../tenantAdmin/projects'

type AddProjectMemberModalProps = {
  project: TenantProject | null
  onClose: () => void
  onAdd: (projectId: string, member: TenantProjectMember) => void
}

export function AddProjectMemberModal({ project, onClose, onAdd }: AddProjectMemberModalProps) {
  const [memberName, setMemberName] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState<TenantProjectMemberRole>('developer')

  useEffect(() => {
    if (!project) {
      setMemberName('')
      setMemberEmail('')
      setMemberRole('developer')
    }
  }, [project])

  const canAdd = memberName.trim().length > 0 && isProjectMemberEmailValid(memberEmail)

  const handleAdd = () => {
    if (!project || !canAdd) {
      return
    }

    onAdd(project.id, {
      id: generateProjectWizardMemberId(),
      name: memberName.trim(),
      email: memberEmail.trim(),
      role: memberRole,
    })
    onClose()
  }

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={project !== null}
      onClose={onClose}
      aria-labelledby="add-project-member-title"
    >
      <ModalHeader
        title={TENANT_PROJECTS_TEAMS_DEMO.addMemberLabel}
        labelId="add-project-member-title"
        description={
          project ? `Invite someone to ${project.name}.` : undefined
        }
      />
      <ModalBody>
        <Form
          autoComplete="off"
          className="tenant-admin-project-details__add-member-form"
          onSubmit={(event) => {
            event.preventDefault()
            handleAdd()
          }}
        >
          <FormGroup label="Full name" fieldId="add-project-member-name" isRequired>
            <TextInput
              id="add-project-member-name"
              value={memberName}
              onChange={(_event, value) => setMemberName(value)}
              placeholder={CREATE_PROJECT_WIZARD_DEMO.memberNamePlaceholder}
              isRequired
            />
          </FormGroup>
          <FormGroup label="Email" fieldId="add-project-member-email" isRequired>
            <TextInput
              id="add-project-member-email"
              type="email"
              value={memberEmail}
              onChange={(_event, value) => setMemberEmail(value)}
              placeholder={CREATE_PROJECT_WIZARD_DEMO.memberEmailPlaceholder}
              isRequired
            />
          </FormGroup>
          <FormGroup label="Role" fieldId="add-project-member-role" isRequired>
            <FormSelect
              id="add-project-member-role"
              value={memberRole}
              onChange={(_event, value) => setMemberRole(value as TenantProjectMemberRole)}
              aria-label="Member role"
            >
              {TENANT_PROJECT_MEMBER_ROLES.map((role) => (
                <FormSelectOption key={role.id} value={role.id} label={role.shortLabel} />
              ))}
            </FormSelect>
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={handleAdd} isDisabled={!canAdd}>
          {TENANT_PROJECTS_TEAMS_DEMO.addMemberLabel}
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}
