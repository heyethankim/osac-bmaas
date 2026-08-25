import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Content,
  Icon,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  ToggleGroup,
  ToggleGroupItem,
  Title,
} from '@patternfly/react-core'
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'
import {
  CATALOG_SERVICE_FILTER_LABELS,
  CATALOG_SERVICE_OFFERINGS,
  CATALOG_SERVICE_LABELS,
  type CatalogServiceId,
} from '../../providerSetup/templateDemo'
import {
  getInstancesAssignableToProject,
  getInstancesForTenantProject,
  TENANT_PROJECTS_TEAMS_DEMO,
  type TenantProject,
} from '../../tenantAdmin/projects'
import {
  getTenantInstanceProjectLabel,
  getTenantInstanceServiceId,
  getTenantInstanceStatusLabel,
  type TenantInstance,
} from '../../tenantUser/instances'

type AddProjectServiceModalProps = {
  project: TenantProject | null
  projects: readonly TenantProject[]
  instances: readonly TenantInstance[]
  onClose: () => void
  onAssign: (projectId: string, instanceId: string) => void
}

type ServiceFilter = 'all' | CatalogServiceId

function getInstanceStatusColor(
  status: TenantInstance['status'],
): 'green' | 'blue' | 'orange' | 'red' | 'grey' {
  switch (status) {
    case 'running':
      return 'green'
    case 'provisioning':
    case 'restarting':
      return 'blue'
    case 'stopped':
      return 'grey'
    case 'failed':
      return 'red'
    default:
      return 'grey'
  }
}

function getInstanceAssignmentHint(
  instance: TenantInstance,
  projects: readonly TenantProject[],
  targetProject: TenantProject,
): string {
  const currentProject = getTenantInstanceProjectLabel(instance, projects)
  if (currentProject === '—') {
    return TENANT_PROJECTS_TEAMS_DEMO.attachServiceUnassignedHint
  }

  if (currentProject === targetProject.name) {
    return CATALOG_SERVICE_LABELS[getTenantInstanceServiceId(instance)]
  }

  return `${TENANT_PROJECTS_TEAMS_DEMO.attachServiceMoveFromPrefix} ${currentProject}`
}

type ServiceOptionProps = {
  instance: TenantInstance
  projects: readonly TenantProject[]
  targetProject: TenantProject
  isSelected: boolean
  onSelect: (instanceId: string) => void
}

function ServiceOption({
  instance,
  projects,
  targetProject,
  isSelected,
  onSelect,
}: ServiceOptionProps) {
  const serviceId = getTenantInstanceServiceId(instance)
  const assignmentHint = getInstanceAssignmentHint(instance, projects, targetProject)

  return (
    <button
      type="button"
      className={[
        'tenant-admin-project-details__add-service-option',
        isSelected ? 'tenant-admin-project-details__add-service-option--selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-pressed={isSelected}
      onClick={() => onSelect(instance.id)}
    >
      <span className="tenant-admin-project-details__add-service-option-icon" aria-hidden>
        <Icon size="lg">{getCatalogServiceIcon(serviceId)}</Icon>
      </span>
      <span className="tenant-admin-project-details__add-service-option-copy">
        <span className="tenant-admin-project-details__add-service-option-name">{instance.name}</span>
        <Content component="p" className="tenant-admin-project-details__add-service-option-meta">
          {assignmentHint}
        </Content>
      </span>
      <Label color={getInstanceStatusColor(instance.status)} isCompact>
        {getTenantInstanceStatusLabel(instance.status)}
      </Label>
    </button>
  )
}

export function AddProjectServiceModal({
  project,
  projects,
  instances,
  onClose,
  onAssign,
}: AddProjectServiceModalProps) {
  const assignableInstances = useMemo(
    () => (project ? getInstancesAssignableToProject(instances, project) : []),
    [instances, project],
  )

  const atQuota = useMemo(
    () =>
      project
        ? getInstancesForTenantProject(instances, project).length >= project.instanceQuota
        : false,
    [instances, project],
  )

  const serviceTypeCounts = useMemo(() => {
    const counts = new Map<CatalogServiceId, number>()
    for (const instance of assignableInstances) {
      const serviceId = getTenantInstanceServiceId(instance)
      counts.set(serviceId, (counts.get(serviceId) ?? 0) + 1)
    }
    return counts
  }, [assignableInstances])

  const availableServiceTypes = useMemo(
    () => CATALOG_SERVICE_OFFERINGS.filter((offering) => serviceTypeCounts.has(offering.id)),
    [serviceTypeCounts],
  )

  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>('all')
  const [selectedInstanceId, setSelectedInstanceId] = useState('')

  const filteredInstances = useMemo(() => {
    if (serviceFilter === 'all') {
      return assignableInstances
    }

    return assignableInstances.filter(
      (instance) => getTenantInstanceServiceId(instance) === serviceFilter,
    )
  }, [assignableInstances, serviceFilter])

  const groupedInstances = useMemo(() => {
    if (serviceFilter !== 'all') {
      return []
    }

    return availableServiceTypes.map((offering) => ({
      offering,
      instances: assignableInstances.filter(
        (instance) => getTenantInstanceServiceId(instance) === offering.id,
      ),
    }))
  }, [assignableInstances, availableServiceTypes, serviceFilter])

  useEffect(() => {
    if (!project) {
      setServiceFilter('all')
      setSelectedInstanceId('')
      return
    }

    setServiceFilter('all')
    setSelectedInstanceId(assignableInstances[0]?.id ?? '')
  }, [assignableInstances, project])

  useEffect(() => {
    if (
      selectedInstanceId &&
      filteredInstances.some((instance) => instance.id === selectedInstanceId)
    ) {
      return
    }

    setSelectedInstanceId(filteredInstances[0]?.id ?? '')
  }, [filteredInstances, selectedInstanceId])

  const canAssign = selectedInstanceId.length > 0 && !atQuota

  const handleAssign = () => {
    if (!project || !canAssign) {
      return
    }

    onAssign(project.id, selectedInstanceId)
    onClose()
  }

  const renderInstanceOptions = (options: readonly TenantInstance[]) =>
    options.map((instance) => (
      <ServiceOption
        key={instance.id}
        instance={instance}
        projects={projects}
        targetProject={project!}
        isSelected={selectedInstanceId === instance.id}
        onSelect={setSelectedInstanceId}
      />
    ))

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={project !== null}
      onClose={onClose}
      aria-labelledby="add-project-service-title"
      className="tenant-admin-project-details__add-service-modal"
    >
      <ModalHeader
        title={TENANT_PROJECTS_TEAMS_DEMO.attachServiceTitle}
        labelId="add-project-service-title"
        description={
          project ? TENANT_PROJECTS_TEAMS_DEMO.attachServiceDescription : undefined
        }
      />
      <ModalBody>
        {atQuota ? (
          <Content component="p">{TENANT_PROJECTS_TEAMS_DEMO.attachServiceQuotaReached}</Content>
        ) : assignableInstances.length === 0 ? (
          <Content component="p">{TENANT_PROJECTS_TEAMS_DEMO.attachServiceEmpty}</Content>
        ) : (
          <>
            {availableServiceTypes.length > 1 ? (
              <ToggleGroup aria-label="Filter services by type" className="tenant-admin-project-details__add-service-filters">
                <ToggleGroupItem
                  text={`${TENANT_PROJECTS_TEAMS_DEMO.attachServiceFilterAll} (${assignableInstances.length})`}
                  buttonId="add-service-filter-all"
                  isSelected={serviceFilter === 'all'}
                  onChange={(_event, selected) => {
                    if (selected) {
                      setServiceFilter('all')
                    }
                  }}
                />
                {availableServiceTypes.map((offering) => (
                  <ToggleGroupItem
                    key={offering.id}
                    text={`${CATALOG_SERVICE_FILTER_LABELS[offering.id]} (${serviceTypeCounts.get(offering.id) ?? 0})`}
                    buttonId={`add-service-filter-${offering.id}`}
                    isSelected={serviceFilter === offering.id}
                    onChange={(_event, selected) => {
                      if (selected) {
                        setServiceFilter(offering.id)
                      }
                    }}
                  />
                ))}
              </ToggleGroup>
            ) : null}

            <div
              className="tenant-admin-project-details__add-service-options"
              role="radiogroup"
              aria-label="Services to assign"
            >
              {serviceFilter === 'all'
                ? groupedInstances.map(({ offering, instances: groupInstances }) => (
                    <section
                      key={offering.id}
                      className="tenant-admin-project-details__add-service-group"
                      aria-label={CATALOG_SERVICE_FILTER_LABELS[offering.id]}
                    >
                      <div className="tenant-admin-project-details__add-service-group-header">
                        <span className="tenant-admin-project-details__add-service-group-icon" aria-hidden>
                          <Icon size="md">{getCatalogServiceIcon(offering.id)}</Icon>
                        </span>
                        <Title
                          headingLevel="h3"
                          size="md"
                          className="tenant-admin-project-details__add-service-group-title"
                        >
                          {CATALOG_SERVICE_FILTER_LABELS[offering.id]}
                        </Title>
                        <Label isCompact color="grey">
                          {groupInstances.length}
                        </Label>
                      </div>
                      {renderInstanceOptions(groupInstances)}
                    </section>
                  ))
                : renderInstanceOptions(filteredInstances)}
            </div>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={handleAssign} isDisabled={!canAssign}>
          {TENANT_PROJECTS_TEAMS_DEMO.addMemberLabel}
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}
