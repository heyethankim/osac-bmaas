import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import {
  Alert,
  AlertActionCloseButton,
  Button,
  Card,
  CardBody,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Radio,
  SearchInput,
  Spinner,
  Title,
} from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import {
  CatalogServiceFilterToggle,
  countCatalogServices,
  toggleCatalogServiceFilter,
} from '../../components/catalog/CatalogServiceFilterToggle'
import { CatalogFilterEmptyState } from '../../components/catalog/CatalogFilterEmptyState'
import { CatalogFilterResultsSummary } from '../../components/catalog/CatalogFilterResultsSummary'
import { ViewModeToggle } from '../../components/catalog/CatalogViewToggle'
import { CatalogSpecRowsList } from '../../components/catalog/CatalogSpecRowsList'
import { TenantUserInstanceDetailsPage, BareMetalConnectSshModal } from '../../components/tenant-user/TenantUserInstanceDetailsPage'
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'
import {
  createCatalogServiceFilterSet,
  describeCatalogServiceFilter,
} from '../../catalog/catalogFilterSummary'
import {
  getInstancesViewMode,
  setInstancesViewMode,
  type ViewMode,
} from '../../catalog/viewMode'
import { CATALOG_SERVICE_FILTER_LABELS, type CatalogServiceId } from '../../providerSetup/templateDemo'
import {
  createDemoPublicIp,
  downloadClusterKubeconfig,
  formatTenantInstanceCreatedAt,
  formatTenantInstanceName,
  getBareMetalSerialConsoleUrl,
  getClusterDemoPassword,
  getClusterNodeSetTypeLabel,
  getClusterPlatformLabel,
  getClusterStatusLabel,
  getTenantInstanceActions,
  getTenantInstanceCardSpecRows,
  getTenantInstanceGpuLabel,
  getTenantInstanceProjectLabel,
  getTenantInstanceServiceId,
  getTenantInstanceSpecRows,
  getTenantInstanceStatusLabel,
  instanceBelongsToProject,
  resolveVmConfig,
  TENANT_INSTANCE_RESTART_DURATION_MS,
  type TenantInstance,
  type TenantInstanceNetworking,
  type TenantInstanceStatus,
} from '../../tenantUser/instances'
import {
  buildInstanceSpecFilterGroups,
  describeInstanceSpecFilterSelections,
  getInstanceSpecFilterToggleLabel,
  instanceMatchesSpecFilter,
} from '../../tenantUser/instanceSpecFilters'
import {
  patchProviderServiceInstance,
  removeProviderServiceInstance,
} from '../../tenantUser/providerServicesInstances'
import { InstanceSpecMultiFilter } from '../../components/shared/InstanceSpecMultiFilter'
import { LAUNCH_INSTANCE_WIZARD_DEMO } from '../../tenantUser/launchInstanceWizard'
import {
  ensureTenantDemoInstances,
  removeTenantUserInstance,
  updateTenantUserInstance,
} from '../../tenantUser/storage'
import { ensureTenantDemoProjects } from '../../tenantAdmin/storage'
import type { TenantProject } from '../../tenantAdmin/projects'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import {
  filterInstancesByProjectScope,
  isAllProjectsScope,
  type ProjectScopeId,
} from '../../tenantUser/projectScope'
import { ProjectScopeSwitcher } from '../../components/shared/ProjectScopeSwitcher'
import { PillFilterSelect } from '../../components/shared/PillFilterSelect'

type TenantUserInstancesPageProps = {
  tenantSlug: string
  instances: TenantInstance[]
  onInstancesChange: Dispatch<SetStateAction<TenantInstance[]>>
  projects: readonly TenantProject[]
  allProjects?: readonly TenantProject[]
  projectScopeId: ProjectScopeId
  onProjectScopeChange: (scopeId: ProjectScopeId) => void
  organization: RegisteredOrganization | null
  /** When set, page is scoped to one service (nav-driven) and hides service filters. */
  lockedServiceId?: CatalogServiceId
  /** Closes the instance detail drawer when left-nav selection changes. */
  activeNavId?: string
  /** Opens the matching catalog item detail page in Catalog. */
  onNavigateToCatalogItem?: (catalogItemDisplayName: string) => void
  /** Opens the matching project detail page in Projects. */
  onNavigateToProject?: (project: TenantProject) => void
  /** Opens the Projects page to create a new project. */
  onNavigateToCreateProject?: () => void
  /** Opens this instance's detail page when navigating from another workspace view. */
  openInstanceId?: string | null
  onOpenInstanceConsumed?: () => void
  /** Provider admin Services detail shows assigned networking objects without lock controls. */
  instanceNetworkingVariant?: 'interactive' | 'summary'
  /** Provider admin: filter instances across registered tenants. */
  showTenantFilter?: boolean
  organizations?: readonly RegisteredOrganization[]
}

function getStatusColor(status: TenantInstance['status']): 'green' | 'blue' | 'orange' | 'red' | 'grey' {
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
      return 'blue'
  }
}

function InstanceStatusLabel({ status }: { status: TenantInstance['status'] }) {
  return (
    <Label
      color={getStatusColor(status)}
      isCompact
      icon={
        status === 'provisioning' || status === 'restarting' ? (
          <Spinner
            isInline
            diameter="0.625rem"
            aria-hidden
            className="tenant-user-instances__status-spinner"
          />
        ) : undefined
      }
    >
      {getTenantInstanceStatusLabel(status)}
    </Label>
  )
}

const POWER_STATE_FILTER_OPTIONS: Array<{ value: 'all' | TenantInstanceStatus; label: string }> = [
  { value: 'all', label: 'All power states' },
  { value: 'running', label: 'Running' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'provisioning', label: 'Provisioning' },
  { value: 'restarting', label: 'Restarting' },
  { value: 'failed', label: 'Failed' },
]

const CLUSTER_STATUS_FILTER_OPTIONS: Array<{
  value: 'all' | TenantInstanceStatus
  label: string
}> = [
  { value: 'all', label: 'All statuses' },
  { value: 'running', label: 'Running' },
  { value: 'provisioning', label: 'Provisioning' },
  { value: 'restarting', label: 'Restarting' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'failed', label: 'Failed' },
]

export function TenantUserInstancesPage({
  tenantSlug,
  instances,
  onInstancesChange,
  projects,
  allProjects,
  projectScopeId,
  onProjectScopeChange,
  organization,
  lockedServiceId,
  activeNavId,
  onNavigateToCatalogItem,
  onNavigateToProject,
  onNavigateToCreateProject,
  openInstanceId = null,
  onOpenInstanceConsumed,
  instanceNetworkingVariant = 'summary',
  showTenantFilter = false,
  organizations = [],
}: TenantUserInstancesPageProps) {
  useEffect(() => {
    if (showTenantFilter) {
      return
    }

    const normalized = ensureTenantDemoInstances(tenantSlug, organization?.name ?? tenantSlug)
    onInstancesChange((current) => {
      if (
        current.length === normalized.length &&
        current.every((instance, index) => instance === normalized[index])
      ) {
        return current
      }
      return normalized
    })
    // Normalize demo showcase rows (e.g. bm-server-06 multi-project) on workspace entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount sync per tenant
  }, [tenantSlug])

  const [viewMode, setViewMode] = useState<ViewMode>(() => getInstancesViewMode('grid'))
  const [organizationFilter, setOrganizationFilter] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [powerStateFilter, setPowerStateFilter] = useState<'all' | TenantInstanceStatus>('all')
  const [specFilterSelections, setSpecFilterSelections] = useState<Set<string>>(() => new Set())
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false)
  const [instancePendingTerminate, setInstancePendingTerminate] = useState<TenantInstance | null>(
    null,
  )
  const [instancePendingPassword, setInstancePendingPassword] = useState<TenantInstance | null>(
    null,
  )
  const [sshAccessInstance, setSshAccessInstance] = useState<TenantInstance | null>(null)
  const [instancePendingPublicIp, setInstancePendingPublicIp] = useState<TenantInstance | null>(
    null,
  )
  const [publicIpFamily, setPublicIpFamily] = useState<'IPv4' | 'IPv6'>('IPv4')
  const [isProvisioningNoticeDismissed, setIsProvisioningNoticeDismissed] = useState(false)
  const restartTimersRef = useRef<Map<string, number>>(new Map())

  const organizationOptions = useMemo(
    () =>
      [...organizations].sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
      ),
    [organizations],
  )

  const selectedOrganization = useMemo(() => {
    if (!organizationFilter) {
      return null
    }

    return (
      organizations.find(
        (organization) =>
          organization.tenantId === organizationFilter || organization.id === organizationFilter,
      ) ?? null
    )
  }, [organizationFilter, organizations])

  const scopeTenantSlug = selectedOrganization?.slug ?? tenantSlug

  const switcherProjects = useMemo(() => {
    if (showTenantFilter && selectedOrganization) {
      return ensureTenantDemoProjects(selectedOrganization.slug)
    }

    return allProjects ?? projects
  }, [allProjects, projects, selectedOrganization, showTenantFilter])

  const switcherAllProjects = useMemo(() => {
    if (showTenantFilter && selectedOrganization) {
      return ensureTenantDemoProjects(selectedOrganization.slug)
    }

    return allProjects ?? projects
  }, [allProjects, projects, selectedOrganization, showTenantFilter])

  const tenantFilteredInstances = useMemo(() => {
    if (!showTenantFilter || !selectedOrganization) {
      return instances
    }

    return instances.filter((instance) => instance.ownerTenantSlug === selectedOrganization.slug)
  }, [instances, selectedOrganization, showTenantFilter])

  const scopedInstances = useMemo(() => {
    if (showTenantFilter && !selectedOrganization) {
      if (isAllProjectsScope(projectScopeId)) {
        return tenantFilteredInstances
      }

      const project = (allProjects ?? projects).find((entry) => entry.id === projectScopeId)
      if (!project) {
        return []
      }

      return tenantFilteredInstances.filter((instance) => instanceBelongsToProject(instance, project))
    }

    return filterInstancesByProjectScope(tenantFilteredInstances, scopeTenantSlug, projectScopeId)
  }, [
    allProjects,
    projectScopeId,
    projects,
    scopeTenantSlug,
    selectedOrganization,
    showTenantFilter,
    tenantFilteredInstances,
  ])

  const patchStoredInstance = (instanceId: string, patch: Partial<TenantInstance>) => {
    onInstancesChange((current) => {
      if (!showTenantFilter) {
        return updateTenantUserInstance(tenantSlug, instanceId, patch, current)
      }

      return patchProviderServiceInstance(current, instanceId, patch, tenantSlug)
    })
  }

  const removeStoredInstance = (instanceId: string) => {
    onInstancesChange((current) => {
      if (!showTenantFilter) {
        return removeTenantUserInstance(tenantSlug, instanceId, current)
      }

      return removeProviderServiceInstance(current, instanceId, tenantSlug)
    })
  }

  const hasProvisioningInstances = scopedInstances.some((instance) => {
    if (instance.status !== 'provisioning') {
      return false
    }
    const serviceId = getTenantInstanceServiceId(instance)
    if (lockedServiceId) {
      return serviceId === lockedServiceId
    }
    return true
  })

  useEffect(() => {
    if (!hasProvisioningInstances) {
      setIsProvisioningNoticeDismissed(false)
    }
  }, [hasProvisioningInstances])

  useEffect(() => {
    setIsProvisioningNoticeDismissed(false)
  }, [lockedServiceId])

  useEffect(() => {
    setIsDetailsDrawerOpen(false)
    setSelectedInstanceId(null)
  }, [activeNavId, lockedServiceId])

  useEffect(() => {
    if (!openInstanceId) {
      return
    }

    const match = instances.find((instance) => instance.id === openInstanceId) ?? null
    if (match) {
      setSelectedInstanceId(match.id)
      setIsDetailsDrawerOpen(true)
    }
    onOpenInstanceConsumed?.()
  }, [openInstanceId, instances, onOpenInstanceConsumed])

  useEffect(() => {
    setPowerStateFilter('all')
    setSpecFilterSelections(new Set())
    setOrganizationFilter('')
  }, [lockedServiceId])

  const isClustersPage = lockedServiceId === 'cluster'
  const hasServiceSpecFilters = Boolean(lockedServiceId)
  const hasActiveServiceFilters =
    organizationFilter !== '' ||
    specFilterSelections.size > 0 ||
    (hasServiceSpecFilters && powerStateFilter !== 'all')

  const showBackgroundProvisioningNotice =
    hasProvisioningInstances && !isProvisioningNoticeDismissed

  const instanceServiceIds = useMemo(
    () => scopedInstances.map((instance) => getTenantInstanceServiceId(instance)),
    [scopedInstances],
  )
  const initialServiceFilters = lockedServiceId
    ? [lockedServiceId]
    : instanceServiceIds.length > 0
      ? instanceServiceIds
      : (['baremetal'] as const)
  const [selectedFilters, setSelectedFilters] = useState<Set<CatalogServiceId>>(
    () => new Set(initialServiceFilters),
  )
  const knownServiceFiltersRef = useRef(new Set(initialServiceFilters))

  useEffect(() => {
    if (!lockedServiceId) {
      return
    }
    setSelectedFilters(new Set([lockedServiceId]))
  }, [lockedServiceId])

  const sortedInstances = useMemo(
    () =>
      [...scopedInstances].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ),
    [scopedInstances],
  )

  const serviceCounts = useMemo(
    () => countCatalogServices(instanceServiceIds),
    [instanceServiceIds],
  )

  const specFilterGroups = useMemo(() => {
    if (!lockedServiceId) {
      return []
    }

    return buildInstanceSpecFilterGroups(sortedInstances, lockedServiceId)
  }, [lockedServiceId, sortedInstances])

  const specFilterToggleLabel = useMemo(
    () => getInstanceSpecFilterToggleLabel(specFilterSelections),
    [specFilterSelections],
  )

  const tenantFilterOptions = useMemo(
    () => [
      { value: '', label: 'All tenants' },
      ...organizationOptions.map((organization) => ({
        value: organization.tenantId,
        label: organization.name,
      })),
    ],
    [organizationOptions],
  )

  const powerStateFilterOptions = useMemo(
    () => (isClustersPage ? CLUSTER_STATUS_FILTER_OPTIONS : POWER_STATE_FILTER_OPTIONS),
    [isClustersPage],
  )

  const serviceFilteredInstances = useMemo(
    () =>
      sortedInstances.filter((instance) =>
        selectedFilters.has(getTenantInstanceServiceId(instance)),
      ),
    [sortedInstances, selectedFilters],
  )

  const filteredInstances = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return serviceFilteredInstances.filter((instance) => {
      const serviceId = getTenantInstanceServiceId(instance)

      if (lockedServiceId) {
        if (powerStateFilter !== 'all' && instance.status !== powerStateFilter) {
          return false
        }

        if (!instanceMatchesSpecFilter(instance, specFilterSelections, lockedServiceId)) {
          return false
        }
      }

      if (!query) {
        return true
      }

      const serviceLabel = CATALOG_SERVICE_FILTER_LABELS[serviceId]
      const specRows = getTenantInstanceSpecRows(instance)
      const statusLabel =
        serviceId === 'cluster'
          ? getClusterStatusLabel(instance.status)
          : getTenantInstanceStatusLabel(instance.status)

      return (
        instance.name.toLowerCase().includes(query) ||
        formatTenantInstanceName(instance.name).toLowerCase().includes(query) ||
        instance.catalogItemDisplayName.toLowerCase().includes(query) ||
        serviceLabel.toLowerCase().includes(query) ||
        statusLabel.toLowerCase().includes(query) ||
        instance.osImage.toLowerCase().includes(query) ||
        getTenantInstanceGpuLabel(instance).toLowerCase().includes(query) ||
        getClusterPlatformLabel(instance).toLowerCase().includes(query) ||
        getClusterNodeSetTypeLabel(instance).toLowerCase().includes(query) ||
        specRows.some(
          (row) =>
            row.label.toLowerCase().includes(query) || row.value.toLowerCase().includes(query),
        )
      )
    })
  }, [
    serviceFilteredInstances,
    searchValue,
    lockedServiceId,
    powerStateFilter,
    specFilterSelections,
  ])

  const filterDescriptionParts = useMemo(() => {
    const parts: string[] = []

    if (!lockedServiceId) {
      const serviceDescription = describeCatalogServiceFilter(selectedFilters, instanceServiceIds)
      if (serviceDescription) {
        parts.push(`service: ${serviceDescription}`)
      }
    }

    if (hasServiceSpecFilters) {
      const powerOptions = isClustersPage ? CLUSTER_STATUS_FILTER_OPTIONS : POWER_STATE_FILTER_OPTIONS
      if (powerStateFilter !== 'all') {
        const label =
          powerOptions.find((option) => option.value === powerStateFilter)?.label ??
          powerStateFilter
        parts.push(`status: ${label}`)
      }
    }

    for (const description of describeInstanceSpecFilterSelections(specFilterSelections)) {
      parts.push(description)
    }

    if (organizationFilter) {
      const tenantLabel =
        selectedOrganization?.name ??
        organizations.find(
          (organization) =>
            organization.tenantId === organizationFilter || organization.id === organizationFilter,
        )?.name ??
        organizationFilter
      parts.push(`tenant: ${tenantLabel}`)
    }

    if (searchValue.trim()) {
      parts.push(`search: "${searchValue.trim()}"`)
    }

    return parts
  }, [
    hasServiceSpecFilters,
    instanceServiceIds,
    isClustersPage,
    lockedServiceId,
    organizationFilter,
    organizations,
    powerStateFilter,
    searchValue,
    selectedFilters,
    selectedOrganization?.name,
    specFilterSelections,
  ])

  const clearAllFilters = () => {
    setSearchValue('')
    setOrganizationFilter('')
    setPowerStateFilter('all')
    setSpecFilterSelections(new Set())
    if (!lockedServiceId) {
      setSelectedFilters(createCatalogServiceFilterSet(instanceServiceIds))
    }
  }

  const selectedInstance = useMemo(
    () => instances.find((instance) => instance.id === selectedInstanceId) ?? null,
    [instances, selectedInstanceId],
  )

  useEffect(() => {
    if (lockedServiceId) {
      return
    }
    setSelectedFilters((current) => {
      const next = new Set(current)
      let changed = false
      for (const serviceId of instanceServiceIds) {
        if (!knownServiceFiltersRef.current.has(serviceId)) {
          knownServiceFiltersRef.current.add(serviceId)
          next.add(serviceId)
          changed = true
        }
      }
      return changed ? next : current
    })
  }, [instanceServiceIds, lockedServiceId])

  useEffect(() => {
    return () => {
      for (const timeoutId of restartTimersRef.current.values()) {
        window.clearTimeout(timeoutId)
      }
      restartTimersRef.current.clear()
    }
  }, [])

  const closeDetails = () => {
    setIsDetailsDrawerOpen(false)
  }

  const handleTerminateInstance = (instanceId: string) => {
    const timeoutId = restartTimersRef.current.get(instanceId)
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
      restartTimersRef.current.delete(instanceId)
    }
    removeStoredInstance(instanceId)
    if (selectedInstanceId === instanceId) {
      setSelectedInstanceId(null)
      setIsDetailsDrawerOpen(false)
    }
  }

  const openTerminateConfirm = (instance: TenantInstance) => {
    setInstancePendingTerminate(instance)
  }

  const closeTerminateConfirm = () => {
    setInstancePendingTerminate(null)
  }

  const handleConfirmTerminate = () => {
    if (!instancePendingTerminate) {
      return
    }
    const instanceId = instancePendingTerminate.id
    setInstancePendingTerminate(null)
    handleTerminateInstance(instanceId)
  }

  const handleRestartInstance = (instanceId: string) => {
    const instance = instances.find((item) => item.id === instanceId)
    if (!instance || (instance.status !== 'running' && instance.status !== 'stopped')) {
      return
    }

    const existingTimeout = restartTimersRef.current.get(instanceId)
    if (existingTimeout !== undefined) {
      window.clearTimeout(existingTimeout)
    }

    patchStoredInstance(instanceId, {
      status: 'restarting',
    })

    const timeoutId = window.setTimeout(() => {
      restartTimersRef.current.delete(instanceId)
      patchStoredInstance(instanceId, {
        status: 'running',
      })
    }, TENANT_INSTANCE_RESTART_DURATION_MS)
    restartTimersRef.current.set(instanceId, timeoutId)
  }

  const handleStartInstance = (instanceId: string) => {
    const instance = instances.find((item) => item.id === instanceId)
    if (!instance || instance.status !== 'stopped') {
      return
    }
    patchStoredInstance(instanceId, {
      status: 'running',
    })
  }

  const handleStopInstance = (instanceId: string) => {
    const instance = instances.find((item) => item.id === instanceId)
    if (!instance || instance.status !== 'running') {
      return
    }
    const existingTimeout = restartTimersRef.current.get(instanceId)
    if (existingTimeout !== undefined) {
      window.clearTimeout(existingTimeout)
      restartTimersRef.current.delete(instanceId)
    }
    patchStoredInstance(instanceId, {
      status: 'stopped',
    })
  }

  const handleViewDetails = (instance: TenantInstance) => {
    setSelectedInstanceId(instance.id)
    setIsDetailsDrawerOpen(true)
  }

  const clusterKebabActions = {
    onDownloadKubeconfig: downloadClusterKubeconfig,
    onViewPassword: (instance: TenantInstance) => {
      setInstancePendingPassword(instance)
    },
  }

  const getInstanceKebabActions = (instance: TenantInstance) =>
    getTenantInstanceActions(
      instance,
      openTerminateConfirm,
      handleViewDetails,
      handleRestartInstance,
      clusterKebabActions,
      {
        onStart: handleStartInstance,
        onStop: handleStopInstance,
      },
      {
        onAttachPublicIp: (target) => {
          setPublicIpFamily('IPv4')
          setInstancePendingPublicIp(target)
        },
      },
      {
        onConnectSsh: (target) => {
          setSshAccessInstance(target)
        },
        onOpenSerialConsole: (target) => {
          window.open(getBareMetalSerialConsoleUrl(target), '_blank', 'noopener,noreferrer')
        },
      },
    )

  const handleUpdateNetworking = (
    instanceId: string,
    networking: TenantInstanceNetworking,
    networkLabel: string,
  ) => {
    patchStoredInstance(instanceId, {
      networking,
      networkLabel,
    })
  }

  const closeAttachPublicIp = () => {
    setInstancePendingPublicIp(null)
    setPublicIpFamily('IPv4')
  }

  const handleConfirmAttachPublicIp = () => {
    if (!instancePendingPublicIp) {
      return
    }

    const currentConfig = resolveVmConfig(instancePendingPublicIp)
    const publicIp = createDemoPublicIp(publicIpFamily, instancePendingPublicIp.id)
    const instanceId = instancePendingPublicIp.id
    patchStoredInstance(instanceId, {
      vmConfig: {
        ...currentConfig,
        publicIp,
        publicIpFamily,
      },
    })
    closeAttachPublicIp()
  }

  const handleViewModeChange = (nextViewMode: ViewMode) => {
    setViewMode(nextViewMode)
    setInstancesViewMode(nextViewMode)
  }

  const handleFilterToggle = (serviceId: CatalogServiceId, isSelected: boolean) => {
    setSelectedFilters((current) => toggleCatalogServiceFilter(current, serviceId, isSelected))
  }

  const pageTitle = lockedServiceId
    ? CATALOG_SERVICE_FILTER_LABELS[lockedServiceId]
    : 'Services'
  const pageLede = lockedServiceId
    ? isAllProjectsScope(projectScopeId)
      ? `Monitor and manage ${CATALOG_SERVICE_FILTER_LABELS[lockedServiceId].toLowerCase()} instances across all projects.`
      : `Monitor and manage ${CATALOG_SERVICE_FILTER_LABELS[lockedServiceId].toLowerCase()} instances in this project.`
    : isAllProjectsScope(projectScopeId)
      ? 'Monitor and manage instances across all projects.'
      : 'Monitor and manage instances in this project.'

  const emptyStateTitle = (() => {
    if (!isAllProjectsScope(projectScopeId) && scopedInstances.length === 0) {
      return lockedServiceId
        ? `No ${CATALOG_SERVICE_FILTER_LABELS[lockedServiceId]} instances in this project`
        : 'No instances in this project'
    }
    if (searchValue.trim()) {
      return 'No instances match your search'
    }
    if (lockedServiceId) {
      return `No ${CATALOG_SERVICE_FILTER_LABELS[lockedServiceId]} instances yet`
    }
    if (scopedInstances.length === 0) {
      return 'No instances yet'
    }
    if (selectedFilters.size === 0) {
      return 'Select a service to view instances'
    }
    if (selectedFilters.size === 1) {
      const [onlyFilter] = selectedFilters
      return `No ${CATALOG_SERVICE_FILTER_LABELS[onlyFilter!]} instances yet`
    }
    return 'No instances for the selected services'
  })()

  if (isDetailsDrawerOpen && selectedInstance) {
    return (
      <>
        <TenantUserInstanceDetailsPage
          instance={selectedInstance}
          tenantSlug={tenantSlug}
          projects={projects}
          onBack={closeDetails}
          onRequestTerminate={openTerminateConfirm}
          onRestart={handleRestartInstance}
          onStart={handleStartInstance}
          onStop={handleStopInstance}
          onAttachPublicIp={(instance) => {
            setPublicIpFamily('IPv4')
            setInstancePendingPublicIp(instance)
          }}
          onUpdateNetworking={handleUpdateNetworking}
          onNavigateToCatalogItem={onNavigateToCatalogItem}
          onNavigateToProject={onNavigateToProject}
          onViewPassword={(instance) => {
            setInstancePendingPassword(instance)
          }}
          instanceNetworkingVariant={instanceNetworkingVariant}
        />

        <Modal
          variant={ModalVariant.small}
          isOpen={instancePendingTerminate !== null}
          onClose={closeTerminateConfirm}
          aria-labelledby="terminate-instance-title"
          aria-describedby="terminate-instance-description"
        >
          <ModalHeader
            title={
              instancePendingTerminate &&
              getTenantInstanceServiceId(instancePendingTerminate) === 'cluster'
                ? 'Delete cluster?'
                : instancePendingTerminate &&
                    getTenantInstanceServiceId(instancePendingTerminate) === 'virtual-machine'
                  ? 'Delete virtual machine?'
                  : 'Delete instance?'
            }
            titleIconVariant="warning"
            labelId="terminate-instance-title"
          />
          <ModalBody>
            <Content component="p" id="terminate-instance-description">
              {instancePendingTerminate ? (
                <>
                  <strong>{formatTenantInstanceName(instancePendingTerminate.name)}</strong> will be
                  permanently removed. This cannot be undone.
                </>
              ) : (
                'This instance will be permanently removed. This cannot be undone.'
              )}
            </Content>
          </ModalBody>
          <ModalFooter>
            <Button variant="danger" onClick={handleConfirmTerminate}>
              Delete
            </Button>
            <Button variant="link" onClick={closeTerminateConfirm}>
              Cancel
            </Button>
          </ModalFooter>
        </Modal>

        <Modal
          variant={ModalVariant.small}
          isOpen={instancePendingPublicIp !== null}
          onClose={closeAttachPublicIp}
          aria-labelledby="attach-public-ip-title"
        >
          <ModalHeader title="Attach public IP" labelId="attach-public-ip-title" />
          <ModalBody>
            <Form>
              <FormGroup label="IP family" fieldId="attach-public-ip-family" isRequired>
                <Radio
                  id="attach-public-ip-ipv4"
                  name="attach-public-ip-family"
                  label="IPv4"
                  isChecked={publicIpFamily === 'IPv4'}
                  onChange={() => setPublicIpFamily('IPv4')}
                />
                <Radio
                  id="attach-public-ip-ipv6"
                  name="attach-public-ip-family"
                  label="IPv6"
                  isChecked={publicIpFamily === 'IPv6'}
                  onChange={() => setPublicIpFamily('IPv6')}
                />
              </FormGroup>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button variant="link" onClick={closeAttachPublicIp}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmAttachPublicIp}>
              Attach
            </Button>
          </ModalFooter>
        </Modal>

        <Modal
          variant={ModalVariant.small}
          isOpen={instancePendingPassword !== null}
          onClose={() => setInstancePendingPassword(null)}
          aria-labelledby="cluster-password-modal-title"
        >
          <ModalHeader title="Cluster password" labelId="cluster-password-modal-title" />
          <ModalBody>
            <Content component="p">
              Use this kubeadmin password with the OpenShift web console.
            </Content>
            {instancePendingPassword ? (
              <code className="tenant-user-instances__cluster-password">
                {getClusterDemoPassword(instancePendingPassword)}
              </code>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" onClick={() => setInstancePendingPassword(null)}>
              Close
            </Button>
          </ModalFooter>
        </Modal>
      </>
    )
  }

  return (
    <>
      <div className="tenant-user-workspace-page tenant-user-instances">
        <Flex
          className="tenant-user-instances__page-header"
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsFlexStart' }}
          gap={{ default: 'gapMd' }}
        >
          <FlexItem>
            <Title headingLevel="h1" size="3xl" className="tenant-user-instances__title">
              {pageTitle}
            </Title>
            <Content component="p" className="tenant-user-instances__lede">
              {pageLede}
            </Content>
          </FlexItem>
        </Flex>

        <div className="catalog-view-toolbar tenant-user-instances__toolbar">
          <div className="catalog-view-toolbar__start">
            <ProjectScopeSwitcher
              tenantSlug={scopeTenantSlug}
              projects={switcherProjects}
              allProjects={switcherAllProjects}
              selectedScopeId={projectScopeId}
              onChange={onProjectScopeChange}
              onNavigateToCreateProject={onNavigateToCreateProject}
              id="tenant-user-instances-project-scope"
            />
            {showTenantFilter ? (
              <PillFilterSelect
                id="instances-organization-filter"
                className="pill-filter-select--organization"
                value={organizationFilter}
                options={tenantFilterOptions}
                onChange={setOrganizationFilter}
                ariaLabel="Filter instances by tenant"
              />
            ) : null}
            {lockedServiceId ? null : (
              <CatalogServiceFilterToggle
                selectedFilters={selectedFilters}
                serviceCounts={serviceCounts}
                onToggle={handleFilterToggle}
                idPrefix="instances-filter-"
                ariaLabel="Instance service filters"
              />
            )}
            {hasServiceSpecFilters ? (
              <>
                <PillFilterSelect
                  id="instances-power-state-filter"
                  className="pill-filter-select--status"
                  value={powerStateFilter}
                  options={powerStateFilterOptions}
                  onChange={(value) => setPowerStateFilter(value as 'all' | TenantInstanceStatus)}
                  ariaLabel={
                    isClustersPage
                      ? 'Filter clusters by status'
                      : 'Filter instances by power state'
                  }
                />
                <InstanceSpecMultiFilter
                  id="instances-spec-filter"
                  groups={specFilterGroups}
                  selectedOptionIds={specFilterSelections}
                  onChange={setSpecFilterSelections}
                  toggleLabel={specFilterToggleLabel}
                  ariaLabel="Filter instances by specifications"
                />
              </>
            ) : null}
            <SearchInput
              className="catalog-search"
              placeholder="Search instances"
              value={searchValue}
              onChange={(_event, value) => setSearchValue(value)}
              onClear={() => setSearchValue('')}
              aria-label="Search instances"
            />
          </div>
          {instances.length > 0 ? (
            <ViewModeToggle
              viewMode={viewMode}
              onChange={handleViewModeChange}
              ariaLabel="Services view"
              idPrefix="instances-view"
            />
          ) : null}
        </div>

        {showBackgroundProvisioningNotice ? (
          <Alert
            variant="info"
            isInline
            title={LAUNCH_INSTANCE_WIZARD_DEMO.backgroundProvisioningAlertTitle}
            className="tenant-user-instances__provisioning-alert"
            actionClose={
              <AlertActionCloseButton
                onClose={() => setIsProvisioningNoticeDismissed(true)}
                aria-label="Close provisioning notice"
              />
            }
          >
            <Content component="p">
              {LAUNCH_INSTANCE_WIZARD_DEMO.backgroundProvisioningAlertBody}
            </Content>
          </Alert>
        ) : null}

        {filteredInstances.length === 0 ? (
          filterDescriptionParts.length > 0 ? (
            <CatalogFilterEmptyState
              title="No instances match your filters"
              description="Try a different filter option or search term."
              onClearFilters={clearAllFilters}
            />
          ) : (
          <EmptyState className="tenant-user-instances__empty">
            <span className="tenant-user-instances__empty-icon" aria-hidden>
              {getCatalogServiceIcon(lockedServiceId ?? 'baremetal')}
            </span>
            <Title headingLevel="h2" size="lg">
              {emptyStateTitle}
            </Title>
            <EmptyStateBody>
              {scopedInstances.length === 0
                ? isAllProjectsScope(projectScopeId)
                  ? 'Launch an instance from the catalog to start provisioning capacity.'
                  : 'Launch an instance from the catalog while this project is selected, or switch to All projects.'
                : selectedFilters.size === 0
                  ? 'Choose one or more services above to filter your instances.'
                  : searchValue.trim() || hasActiveServiceFilters
                    ? 'Try a different search term or clear the filters above.'
                    : 'No instances match the selected services.'}
            </EmptyStateBody>
          </EmptyState>
          )
        ) : viewMode === 'grid' ? (
            <>
            <CatalogFilterResultsSummary
              filteredCount={filteredInstances.length}
              totalCount={serviceFilteredInstances.length}
              singular="instance"
              filterParts={filterDescriptionParts}
              onClearFilters={clearAllFilters}
            />
            <div className="catalog-card-grid tenant-user-instances__grid">
              {filteredInstances.map((instance) => {
                const serviceId = getTenantInstanceServiceId(instance)
                const cardSpecRows = getTenantInstanceCardSpecRows(instance)

                return (
                <Card key={instance.id} isCompact={false} className="tenant-user-instances__card">
                  <CardBody>
                    <div className="tenant-user-instances__card-header">
                      <span className="tenant-user-instances__card-icon" aria-hidden>
                        {getCatalogServiceIcon(serviceId)}
                      </span>
                      <div className="tenant-user-instances__card-header-actions">
                        <InstanceStatusLabel status={instance.status} />
                        <ActionsColumn items={getInstanceKebabActions(instance)} />
                      </div>
                    </div>

                    <div className="tenant-user-instances__card-title-block">
                      <Content component="p" className="tenant-user-instances__primary-cell">
                        <Button
                          variant="link"
                          isInline
                          className="tenant-user-instances__name-link catalog-item-name-link"
                          onClick={() => handleViewDetails(instance)}
                        >
                          {formatTenantInstanceName(instance.name)}
                        </Button>
                      </Content>
                      <Content component="p" className="tenant-user-instances__secondary-cell">
                        {instance.catalogItemDisplayName}
                      </Content>
                    </div>

                    <CatalogSpecRowsList
                      rows={cardSpecRows}
                      className="tenant-user-catalog__specs-list"
                      rowClassName="tenant-user-catalog__spec-row"
                      labelClassName="tenant-user-catalog__spec-label"
                      valueClassName="tenant-user-catalog__spec-value"
                    />

                    <dl className="tenant-user-instances__card-footer">
                      <div className="tenant-user-instances__card-footer-row">
                        <dt>Project</dt>
                        <dd>{getTenantInstanceProjectLabel(instance, projects)}</dd>
                      </div>
                      <div className="tenant-user-instances__card-footer-row">
                        <dt>Created</dt>
                        <dd>{formatTenantInstanceCreatedAt(instance.createdAt)}</dd>
                      </div>
                    </dl>

                    {serviceId === 'cluster' || serviceId === 'virtual-machine' ? (
                      <div className="tenant-user-instances__card-console">
                        <Button
                          variant="primary"
                          isDisabled={instance.status !== 'running'}
                          className="tenant-user-instances__console-button"
                        >
                          Console
                        </Button>
                      </div>
                    ) : null}
                    {serviceId === 'baremetal' ? (
                      <div className="tenant-user-instances__card-console">
                        <Button
                          variant="primary"
                          isDisabled={instance.status !== 'running'}
                          className="tenant-user-instances__console-button"
                          onClick={(event) => {
                            event.stopPropagation()
                            setSshAccessInstance(instance)
                          }}
                        >
                          Connect via SSH
                        </Button>
                      </div>
                    ) : null}
                  </CardBody>
                </Card>
                )
              })}
            </div>
            </>
          ) : (
            <div className="catalog-table-panel">
              <CatalogFilterResultsSummary
                filteredCount={filteredInstances.length}
                totalCount={serviceFilteredInstances.length}
                singular="instance"
                filterParts={filterDescriptionParts}
                onClearFilters={clearAllFilters}
              />
              <Table
                aria-label="My instances"
                className="catalog-data-table tenant-user-instances__table"
              >
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Status</Th>
                    <Th>Project</Th>
                    <Th>Profile</Th>
                    <Th>Detail</Th>
                    <Th>Created</Th>
                    <Th screenReaderText="Actions" />
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredInstances.map((instance) => {
                    const tableSpecRows = getTenantInstanceSpecRows(instance)
                    const profileRow = tableSpecRows[0]
                    const detailRow = tableSpecRows[1]

                    return (
                    <Tr key={instance.id}>
                      <Td dataLabel="Name">
                        <Button
                          variant="link"
                          isInline
                          className="catalog-table-name-link"
                          onClick={() => handleViewDetails(instance)}
                        >
                        {formatTenantInstanceName(instance.name)}
                      </Button>
                    </Td>
                    <Td dataLabel="Status">
                      <InstanceStatusLabel status={instance.status} />
                    </Td>
                      <Td dataLabel="Project">{getTenantInstanceProjectLabel(instance, projects)}</Td>
                      <Td dataLabel={profileRow?.label ?? 'Profile'}>{profileRow?.value ?? '—'}</Td>
                      <Td dataLabel={detailRow?.label ?? 'Detail'}>{detailRow?.value ?? '—'}</Td>
                      <Td dataLabel="Created">
                        {formatTenantInstanceCreatedAt(instance.createdAt)}
                      </Td>
                      <Td isActionCell>
                        <ActionsColumn items={getInstanceKebabActions(instance)} />
                      </Td>
                    </Tr>
                    )
                  })}
                </Tbody>
              </Table>
            </div>
          )}
      </div>

      <Modal
        variant={ModalVariant.small}
        isOpen={instancePendingTerminate !== null}
        onClose={closeTerminateConfirm}
        aria-labelledby="terminate-instance-title"
        aria-describedby="terminate-instance-description"
      >
        <ModalHeader
          title={
            instancePendingTerminate &&
            getTenantInstanceServiceId(instancePendingTerminate) === 'cluster'
              ? 'Delete cluster?'
              : instancePendingTerminate &&
                  getTenantInstanceServiceId(instancePendingTerminate) === 'virtual-machine'
                ? 'Delete virtual machine?'
                : 'Delete instance?'
          }
          titleIconVariant="warning"
          labelId="terminate-instance-title"
        />
        <ModalBody>
          <Content component="p" id="terminate-instance-description">
            {instancePendingTerminate ? (
              <>
                <strong>{formatTenantInstanceName(instancePendingTerminate.name)}</strong> will be
                permanently removed. This cannot be undone.
              </>
            ) : (
              'This instance will be permanently removed. This cannot be undone.'
            )}
          </Content>
        </ModalBody>
        <ModalFooter>
          <Button variant="danger" onClick={handleConfirmTerminate}>
            Delete
          </Button>
          <Button variant="link" onClick={closeTerminateConfirm}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        variant={ModalVariant.small}
        isOpen={instancePendingPublicIp !== null}
        onClose={closeAttachPublicIp}
        aria-labelledby="attach-public-ip-title"
      >
        <ModalHeader title="Attach public IP" labelId="attach-public-ip-title" />
        <ModalBody>
          <Form>
            <FormGroup label="IP family" fieldId="attach-public-ip-family" isRequired>
              <Radio
                id="attach-public-ip-ipv4"
                name="attach-public-ip-family"
                label="IPv4"
                isChecked={publicIpFamily === 'IPv4'}
                onChange={() => setPublicIpFamily('IPv4')}
              />
              <Radio
                id="attach-public-ip-ipv6"
                name="attach-public-ip-family"
                label="IPv6"
                isChecked={publicIpFamily === 'IPv6'}
                onChange={() => setPublicIpFamily('IPv6')}
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button variant="link" onClick={closeAttachPublicIp}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirmAttachPublicIp}>
            Attach
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        variant={ModalVariant.small}
        isOpen={instancePendingPassword !== null}
        onClose={() => setInstancePendingPassword(null)}
        aria-labelledby="cluster-password-modal-title"
      >
        <ModalHeader title="Cluster password" labelId="cluster-password-modal-title" />
        <ModalBody>
          <Content component="p">
            Use this kubeadmin password with the OpenShift web console.
          </Content>
          {instancePendingPassword ? (
            <code className="tenant-user-instances__cluster-password">
              {getClusterDemoPassword(instancePendingPassword)}
            </code>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button variant="primary" onClick={() => setInstancePendingPassword(null)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      <BareMetalConnectSshModal
        instance={sshAccessInstance}
        isOpen={sshAccessInstance !== null}
        onClose={() => setSshAccessInstance(null)}
      />
    </>
  )
}
