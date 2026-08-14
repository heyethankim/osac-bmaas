import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Content,
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
import { CATALOG_SERVICE_LABELS } from '../../providerSetup/templateDemo'
import {
  getInstancesAvailableForTenantProject,
  TENANT_PROJECTS_TEAMS_DEMO,
  type TenantProject,
} from '../../tenantAdmin/projects'
import {
  getTenantInstanceServiceId,
  getTenantInstanceStatusLabel,
  type TenantInstance,
} from '../../tenantUser/instances'

type AddProjectServiceModalProps = {
  project: TenantProject | null
  instances: readonly TenantInstance[]
  onClose: () => void
  onAdd: (projectId: string, instanceId: string) => void
}

function formatServiceOptionLabel(instance: TenantInstance): string {
  const serviceId = getTenantInstanceServiceId(instance)
  return `${instance.name} · ${CATALOG_SERVICE_LABELS[serviceId]} · ${getTenantInstanceStatusLabel(instance.status)}`
}

export function AddProjectServiceModal({
  project,
  instances,
  onClose,
  onAdd,
}: AddProjectServiceModalProps) {
  const availableInstances = useMemo(
    () => (project ? getInstancesAvailableForTenantProject(instances, project) : []),
    [instances, project],
  )
  const [selectedInstanceId, setSelectedInstanceId] = useState('')

  useEffect(() => {
    if (!project) {
      setSelectedInstanceId('')
      return
    }

    setSelectedInstanceId(availableInstances[0]?.id ?? '')
  }, [availableInstances, project])

  const canAdd = selectedInstanceId.length > 0

  const handleAdd = () => {
    if (!project || !canAdd) {
      return
    }

    onAdd(project.id, selectedInstanceId)
    onClose()
  }

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={project !== null}
      onClose={onClose}
      aria-labelledby="add-project-service-title"
    >
      <ModalHeader
        title={TENANT_PROJECTS_TEAMS_DEMO.addServiceLabel}
        labelId="add-project-service-title"
        description={
          project
            ? `${TENANT_PROJECTS_TEAMS_DEMO.addServiceModalDescription} (${project.name})`
            : undefined
        }
      />
      <ModalBody>
        {availableInstances.length === 0 ? (
          <Content component="p">
            All organization services are already associated with this project.
          </Content>
        ) : (
          <Form
            autoComplete="off"
            onSubmit={(event) => {
              event.preventDefault()
              handleAdd()
            }}
          >
            <FormGroup label="Service" fieldId="add-project-service-select" isRequired>
              <FormSelect
                id="add-project-service-select"
                value={selectedInstanceId}
                onChange={(_event, value) => setSelectedInstanceId(value)}
                aria-label="Select a service"
              >
                {availableInstances.map((instance) => (
                  <FormSelectOption
                    key={instance.id}
                    value={instance.id}
                    label={formatServiceOptionLabel(instance)}
                  />
                ))}
              </FormSelect>
            </FormGroup>
          </Form>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={handleAdd} isDisabled={!canAdd}>
          {TENANT_PROJECTS_TEAMS_DEMO.addServiceLabel}
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}
