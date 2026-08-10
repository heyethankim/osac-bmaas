import { useEffect, useMemo, useState } from 'react'
import {
  Button,
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
} from '@patternfly/react-core'
import { KubernetesResourceNameField } from '../shared/KubernetesResourceNameHelper'
import { isValidKubernetesResourceName } from '../../shared/kubernetesResourceName'
import { DEFAULT_CREATE_PROJECT_WIZARD_FORM } from '../../tenantAdmin/createProjectWizard'
import { TENANT_PROJECTS_TEAMS_DEMO, type TenantProject } from '../../tenantAdmin/projects'

type AddInstanceProjectModalProps = {
  isOpen: boolean
  projects: readonly TenantProject[]
  attachedProjectIds: readonly string[]
  onClose: () => void
  onAdd: (projectId: string) => void
  /** Quick-create a project by name, then associate it with this service. */
  onCreateProject: (name: string) => void
}

export function AddInstanceProjectModal({
  isOpen,
  projects,
  attachedProjectIds,
  onClose,
  onAdd,
  onCreateProject,
}: AddInstanceProjectModalProps) {
  const availableProjects = useMemo(
    () =>
      [...projects]
        .filter((project) => !attachedProjectIds.includes(project.id))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [attachedProjectIds, projects],
  )

  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [newProjectName, setNewProjectName] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setIsCreatingProject(false)
      setSelectedProjectId('')
      setNewProjectName('')
      return
    }

    if (availableProjects.length === 0) {
      setIsCreatingProject(true)
      setSelectedProjectId('')
      setNewProjectName(getNextQuickCreateProjectName(projects))
      return
    }

    setIsCreatingProject(false)
    setSelectedProjectId(availableProjects[0]?.id ?? '')
    setNewProjectName('')
  }, [availableProjects, isOpen, projects])

  const canAddExisting = selectedProjectId.length > 0
  const canCreateProject = isValidKubernetesResourceName(newProjectName)
  const canSubmit = isCreatingProject ? canCreateProject : canAddExisting

  const startCreateProject = () => {
    setIsCreatingProject(true)
    setSelectedProjectId('')
    setNewProjectName(getNextQuickCreateProjectName(projects))
  }

  const cancelCreateProject = () => {
    if (availableProjects.length === 0) {
      onClose()
      return
    }
    setIsCreatingProject(false)
    setNewProjectName('')
    setSelectedProjectId(availableProjects[0]?.id ?? '')
  }

  const handleSubmit = () => {
    if (!canSubmit) {
      return
    }

    if (isCreatingProject) {
      onCreateProject(newProjectName.trim())
    } else {
      onAdd(selectedProjectId)
    }
    onClose()
  }

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="add-instance-project-title"
    >
      <ModalHeader
        title={isCreatingProject ? TENANT_PROJECTS_TEAMS_DEMO.createProjectLabel : 'Add project'}
        labelId="add-instance-project-title"
        description={
          isCreatingProject
            ? 'Create a project and associate this service with it. Members can be added later in Projects & teams.'
            : 'Associate this service with another project. Members of that project will see it in Services.'
        }
      />
      <ModalBody>
        {isCreatingProject ? (
          <Form autoComplete="off">
            <FormGroup label="Project name" fieldId="add-instance-project-name" isRequired>
              <KubernetesResourceNameField
                id="add-instance-project-name"
                value={newProjectName}
                onChange={setNewProjectName}
                placeholder="my-project"
                isRequired
              />
            </FormGroup>
            <FormHelperText>
              <HelperText>
                <HelperTextItem>Add team members later in Projects & teams.</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </Form>
        ) : (
          <Form autoComplete="off">
            <FormGroup label="Project" fieldId="add-instance-project-select" isRequired>
              <FormSelect
                id="add-instance-project-select"
                value={selectedProjectId}
                onChange={(_event, value) => setSelectedProjectId(value)}
                aria-label="Select a project"
              >
                {availableProjects.map((project) => (
                  <FormSelectOption key={project.id} value={project.id} label={project.name} />
                ))}
              </FormSelect>
            </FormGroup>
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Need a different project?{' '}
                  <Button variant="link" isInline onClick={startCreateProject}>
                    {TENANT_PROJECTS_TEAMS_DEMO.createProjectLabel}
                  </Button>
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </Form>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={handleSubmit} isDisabled={!canSubmit}>
          {isCreatingProject ? 'Create and add' : 'Add'}
        </Button>
        <Button variant="link" onClick={isCreatingProject ? cancelCreateProject : onClose}>
          {isCreatingProject && availableProjects.length > 0 ? 'Back' : 'Cancel'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

function getNextQuickCreateProjectName(projects: readonly TenantProject[]): string {
  const base = DEFAULT_CREATE_PROJECT_WIZARD_FORM.name
  const taken = new Set(projects.map((project) => project.name.trim().toLowerCase()))
  if (!taken.has(base.toLowerCase())) {
    return base
  }

  let suffix = 2
  while (taken.has(`${base}-${suffix}`.toLowerCase())) {
    suffix += 1
  }
  return `${base}-${suffix}`
}
