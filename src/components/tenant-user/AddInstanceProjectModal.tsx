import { useEffect, useMemo, useState } from 'react'
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
} from '@patternfly/react-core'
import type { TenantProject } from '../../tenantAdmin/projects'

type AddInstanceProjectModalProps = {
  isOpen: boolean
  projects: readonly TenantProject[]
  attachedProjectIds: readonly string[]
  onClose: () => void
  onAdd: (projectId: string) => void
}

export function AddInstanceProjectModal({
  isOpen,
  projects,
  attachedProjectIds,
  onClose,
  onAdd,
}: AddInstanceProjectModalProps) {
  const availableProjects = useMemo(
    () =>
      [...projects]
        .filter((project) => !attachedProjectIds.includes(project.id))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [attachedProjectIds, projects],
  )

  const [selectedProjectId, setSelectedProjectId] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setSelectedProjectId('')
      return
    }

    setSelectedProjectId(availableProjects[0]?.id ?? '')
  }, [availableProjects, isOpen])

  const canAdd = selectedProjectId.length > 0

  const handleAdd = () => {
    if (!canAdd) {
      return
    }
    onAdd(selectedProjectId)
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
        title="Add project"
        labelId="add-instance-project-title"
        description="Associate this service with another project. Members of that project will see it in Services."
      />
      <ModalBody>
        {availableProjects.length === 0 ? (
          <p>All projects are already associated with this service.</p>
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
          </Form>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={handleAdd} isDisabled={!canAdd}>
          Add
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}
