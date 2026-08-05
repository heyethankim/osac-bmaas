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
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
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
import { ViewModeToggle } from '../../components/catalog/CatalogViewToggle'
import { CatalogSpecRowsList } from '../../components/catalog/CatalogSpecRowsList'
import { TenantUserInstanceDetailsDrawer } from '../../components/tenant-user/TenantUserInstanceDetailsDrawer'
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'
import { formatCatalogTableResultCount } from '../../catalog/tableResultCount'
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
  getClusterDemoPassword,
  getClusterNodeSetTypeLabel,
  getClusterPlatformLabel,
  getClusterStatusLabel,
  getTenantInstanceActions,
  getTenantInstanceCardSpecRows,
  getTenantInstanceGpuLabel,
  getTenantInstanceScopeFieldLabel,
  getTenantInstanceServiceId,
  getTenantInstanceSpecRows,
  getTenantInstanceStatusLabel,
  resolveVmConfig,
  TENANT_INSTANCE_RESTART_DURATION_MS,
  type TenantInstance,
  type TenantInstanceNetworking,
  type TenantInstanceStatus,
} from '../../tenantUser/instances'
import { LAUNCH_INSTANCE_WIZARD_DEMO } from '../../tenantUser/launchInstanceWizard'
import { removeTenantUserInstance, updateTenantUserInstance } from '../../tenantUser/storage'

type TenantUserInstancesPageProps = {
  tenantSlug: string
  instances: TenantInstance[]
  onInstancesChange: Dispatch<SetStateAction<TenantInstance[]>>
  defaultScopeFieldLabel?: 'Organization' | 'Project'
  /** When set, page is scoped to one service (nav-driven) and hides service filters. */
  lockedServiceId?: CatalogServiceId
  /** Closes the instance detail drawer when left-nav selection changes. */
  activeNavId?: string
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
  { value: 'running', label: 'Ready' },
  { value: 'provisioning', label: 'Provisioning' },
  { value: 'restarting', label: 'Restarting' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'failed', label: 'Failed' },
]

export function TenantUserInstancesPage({
  tenantSlug,
  instances,
  onInstancesChange,
  defaultScopeFieldLabel = 'Project',
  lockedServiceId,
  activeNavId,
}: TenantUserInstancesPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(() => getInstancesViewMode('grid'))
  const [searchValue, setSearchValue] = useState('')
  const [powerStateFilter, setPowerStateFilter] = useState<'all' | TenantInstanceStatus>('all')
  const [osFilter, setOsFilter] = useState('all')
  const [gpuFilter, setGpuFilter] = useState('all')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [nodeSetTypeFilter, setNodeSetTypeFilter] = useState('all')
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false)
  const [instancePendingTerminate, setInstancePendingTerminate] = useState<TenantInstance | null>(
    null,
  )
  const [instancePendingPassword, setInstancePendingPassword] = useState<TenantInstance | null>(
    null,
  )
  const [instancePendingPublicIp, setInstancePendingPublicIp] = useState<TenantInstance | null>(
    null,
  )
  const [publicIpFamily, setPublicIpFamily] = useState<'IPv4' | 'IPv6'>('IPv4')
  const [isProvisioningNoticeDismissed, setIsProvisioningNoticeDismissed] = useState(false)
  const restartTimersRef = useRef<Map<string, number>>(new Map())

  const hasProvisioningInstances = instances.some((instance) => {
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
    setPowerStateFilter('all')
    setOsFilter('all')
    setGpuFilter('all')
    setPlatformFilter('all')
    setNodeSetTypeFilter('all')
  }, [lockedServiceId])

  const isBareMetalPage = lockedServiceId === 'baremetal'
  const isClustersPage = lockedServiceId === 'cluster'
  const isVirtualMachinesPage = lockedServiceId === 'virtual-machine'
  const hasActiveServiceFilters =
    (isBareMetalPage &&
      (powerStateFilter !== 'all' || osFilter !== 'all' || gpuFilter !== 'all')) ||
    (isClustersPage &&
      (powerStateFilter !== 'all' ||
        platformFilter !== 'all' ||
        nodeSetTypeFilter !== 'all')) ||
    (isVirtualMachinesPage && (powerStateFilter !== 'all' || osFilter !== 'all'))

  const showBackgroundProvisioningNotice =
    hasProvisioningInstances && !isProvisioningNoticeDismissed

  const instanceServiceIds = useMemo(
    () => instances.map((instance) => getTenantInstanceServiceId(instance)),
    [instances],
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

  const scopeColumnLabel = useMemo(() => {
    if (instances.length === 0) {
      return defaultScopeFieldLabel
    }
    const labels = new Set(
      instances.map((instance) => getTenantInstanceScopeFieldLabel(instance)),
    )
    return labels.size === 1 ? [...labels][0] : 'Scope'
  }, [defaultScopeFieldLabel, instances])

  const sortedInstances = useMemo(
    () =>
      [...instances].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ),
    [instances],
  )

  const serviceCounts = useMemo(
    () => countCatalogServices(instanceServiceIds),
    [instanceServiceIds],
  )

  const bareMetalOsOptions = useMemo(() => {
    const osValues = new Set<string>()
    for (const instance of sortedInstances) {
      if (getTenantInstanceServiceId(instance) !== 'baremetal') {
        continue
      }
      const osImage = instance.osImage.trim()
      if (osImage) {
        osValues.add(osImage)
      }
    }
    return [...osValues].sort((left, right) => left.localeCompare(right))
  }, [sortedInstances])

  const bareMetalGpuOptions = useMemo(() => {
    const gpuValues = new Set<string>()
    for (const instance of sortedInstances) {
      if (getTenantInstanceServiceId(instance) !== 'baremetal') {
        continue
      }
      const gpuLabel = getTenantInstanceGpuLabel(instance)
      if (gpuLabel && gpuLabel !== '—') {
        gpuValues.add(gpuLabel)
      }
    }
    return [...gpuValues].sort((left, right) => left.localeCompare(right))
  }, [sortedInstances])

  const clusterPlatformOptions = useMemo(() => {
    const platformValues = new Set<string>()
    for (const instance of sortedInstances) {
      if (getTenantInstanceServiceId(instance) !== 'cluster') {
        continue
      }
      const platform = getClusterPlatformLabel(instance)
      if (platform && platform !== '—') {
        platformValues.add(platform)
      }
    }
    return [...platformValues].sort((left, right) => left.localeCompare(right))
  }, [sortedInstances])

  const clusterNodeSetTypeOptions = useMemo(() => {
    const typeValues = new Set<string>()
    for (const instance of sortedInstances) {
      if (getTenantInstanceServiceId(instance) !== 'cluster') {
        continue
      }
      const nodeSetType = getClusterNodeSetTypeLabel(instance)
      if (nodeSetType && nodeSetType !== '—') {
        typeValues.add(nodeSetType)
      }
    }
    return [...typeValues].sort((left, right) => left.localeCompare(right))
  }, [sortedInstances])

  const vmOsOptions = useMemo(() => {
    const osValues = new Set<string>()
    for (const instance of sortedInstances) {
      if (getTenantInstanceServiceId(instance) !== 'virtual-machine') {
        continue
      }
      const osImage = instance.osImage.trim()
      if (osImage) {
        osValues.add(osImage)
      }
    }
    return [...osValues].sort((left, right) => left.localeCompare(right))
  }, [sortedInstances])

  const filteredInstances = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return sortedInstances.filter((instance) => {
      const serviceId = getTenantInstanceServiceId(instance)
      if (!selectedFilters.has(serviceId)) {
        return false
      }

      if (isBareMetalPage) {
        if (powerStateFilter !== 'all' && instance.status !== powerStateFilter) {
          return false
        }
        if (osFilter !== 'all' && instance.osImage !== osFilter) {
          return false
        }
        if (gpuFilter !== 'all' && getTenantInstanceGpuLabel(instance) !== gpuFilter) {
          return false
        }
      }

      if (isClustersPage) {
        if (powerStateFilter !== 'all' && instance.status !== powerStateFilter) {
          return false
        }
        if (platformFilter !== 'all' && getClusterPlatformLabel(instance) !== platformFilter) {
          return false
        }
        if (
          nodeSetTypeFilter !== 'all' &&
          getClusterNodeSetTypeLabel(instance) !== nodeSetTypeFilter
        ) {
          return false
        }
      }

      if (isVirtualMachinesPage) {
        if (powerStateFilter !== 'all' && instance.status !== powerStateFilter) {
          return false
        }
        if (osFilter !== 'all' && instance.osImage !== osFilter) {
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
    sortedInstances,
    selectedFilters,
    searchValue,
    isBareMetalPage,
    isClustersPage,
    isVirtualMachinesPage,
    powerStateFilter,
    osFilter,
    gpuFilter,
    platformFilter,
    nodeSetTypeFilter,
  ])

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
    onInstancesChange((current) => removeTenantUserInstance(tenantSlug, instanceId, current))
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

    onInstancesChange((current) =>
      updateTenantUserInstance(
        tenantSlug,
        instanceId,
        {
          status: 'restarting',
        },
        current,
      ),
    )

    const timeoutId = window.setTimeout(() => {
      restartTimersRef.current.delete(instanceId)
      onInstancesChange((current) =>
        updateTenantUserInstance(
          tenantSlug,
          instanceId,
          {
            status: 'running',
          },
          current,
        ),
      )
    }, TENANT_INSTANCE_RESTART_DURATION_MS)
    restartTimersRef.current.set(instanceId, timeoutId)
  }

  const handleStartInstance = (instanceId: string) => {
    const instance = instances.find((item) => item.id === instanceId)
    if (!instance || instance.status !== 'stopped') {
      return
    }
    onInstancesChange((current) =>
      updateTenantUserInstance(
        tenantSlug,
        instanceId,
        {
          status: 'running',
        },
        current,
      ),
    )
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
    onInstancesChange((current) =>
      updateTenantUserInstance(
        tenantSlug,
        instanceId,
        {
          status: 'stopped',
        },
        current,
      ),
    )
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
    )

  const handleUpdateNetworking = (
    instanceId: string,
    networking: TenantInstanceNetworking,
    networkLabel: string,
  ) => {
    onInstancesChange((current) =>
      updateTenantUserInstance(
        tenantSlug,
        instanceId,
        {
          networking,
          networkLabel,
        },
        current,
      ),
    )
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
    onInstancesChange((current) =>
      updateTenantUserInstance(
        tenantSlug,
        instanceId,
        {
          vmConfig: {
            ...currentConfig,
            publicIp,
            publicIpFamily,
          },
        },
        current,
      ),
    )
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
    ? `Monitor and manage ${CATALOG_SERVICE_FILTER_LABELS[lockedServiceId].toLowerCase()} instances provisioned in your project.`
    : 'Monitor and manage instances provisioned in your project.'

  const emptyStateTitle = (() => {
    if (searchValue.trim()) {
      return 'No instances match your search'
    }
    if (lockedServiceId) {
      return `No ${CATALOG_SERVICE_FILTER_LABELS[lockedServiceId]} instances yet`
    }
    if (instances.length === 0) {
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

  return (
    <>
    <TenantUserInstanceDetailsDrawer
      isExpanded={isDetailsDrawerOpen && selectedInstance !== null}
      onClose={closeDetails}
      instance={isDetailsDrawerOpen ? selectedInstance : null}
      onRequestTerminate={openTerminateConfirm}
      onRestart={handleRestartInstance}
      onStart={handleStartInstance}
      onStop={handleStopInstance}
      onAttachPublicIp={(instance) => {
        setPublicIpFamily('IPv4')
        setInstancePendingPublicIp(instance)
      }}
      onUpdateNetworking={handleUpdateNetworking}
    >
      <div className="tenant-user-workspace-page tenant-user-instances">
        <Title headingLevel="h1" size="3xl" className="tenant-user-instances__title">
          {pageTitle}
        </Title>
        <Content component="p" className="tenant-user-instances__lede">
          {pageLede}
        </Content>

        <div className="catalog-view-toolbar tenant-user-instances__toolbar">
          <div className="catalog-view-toolbar__start">
            {lockedServiceId ? null : (
              <CatalogServiceFilterToggle
                selectedFilters={selectedFilters}
                serviceCounts={serviceCounts}
                onToggle={handleFilterToggle}
                idPrefix="instances-filter-"
                ariaLabel="Instance service filters"
              />
            )}
            {isBareMetalPage ? (
              <>
                <FormSelect
                  className="catalog-status-filter"
                  id="instances-bm-power-state-filter"
                  value={powerStateFilter}
                  onChange={(_event, value) =>
                    setPowerStateFilter(value as 'all' | TenantInstanceStatus)
                  }
                  aria-label="Filter bare metal by power state"
                >
                  {POWER_STATE_FILTER_OPTIONS.map((option) => (
                    <FormSelectOption
                      key={option.value}
                      value={option.value}
                      label={option.label}
                    />
                  ))}
                </FormSelect>
                <FormSelect
                  className="catalog-status-filter"
                  id="instances-bm-os-filter"
                  value={osFilter}
                  onChange={(_event, value) => setOsFilter(value)}
                  aria-label="Filter bare metal by operating system"
                >
                  <FormSelectOption value="all" label="All operating systems" />
                  {bareMetalOsOptions.map((osImage) => (
                    <FormSelectOption key={osImage} value={osImage} label={osImage} />
                  ))}
                </FormSelect>
                <FormSelect
                  className="catalog-status-filter"
                  id="instances-bm-gpu-filter"
                  value={gpuFilter}
                  onChange={(_event, value) => setGpuFilter(value)}
                  aria-label="Filter bare metal by GPU type"
                >
                  <FormSelectOption value="all" label="All GPU types" />
                  {bareMetalGpuOptions.map((gpuLabel) => (
                    <FormSelectOption key={gpuLabel} value={gpuLabel} label={gpuLabel} />
                  ))}
                </FormSelect>
              </>
            ) : null}
            {isClustersPage ? (
              <>
                <FormSelect
                  className="catalog-status-filter"
                  id="instances-cluster-status-filter"
                  value={powerStateFilter}
                  onChange={(_event, value) =>
                    setPowerStateFilter(value as 'all' | TenantInstanceStatus)
                  }
                  aria-label="Filter clusters by status"
                >
                  {CLUSTER_STATUS_FILTER_OPTIONS.map((option) => (
                    <FormSelectOption
                      key={option.value}
                      value={option.value}
                      label={option.label}
                    />
                  ))}
                </FormSelect>
                <FormSelect
                  className="catalog-status-filter"
                  id="instances-cluster-platform-filter"
                  value={platformFilter}
                  onChange={(_event, value) => setPlatformFilter(value)}
                  aria-label="Filter clusters by platform"
                >
                  <FormSelectOption value="all" label="All platforms" />
                  {clusterPlatformOptions.map((platform) => (
                    <FormSelectOption key={platform} value={platform} label={platform} />
                  ))}
                </FormSelect>
                <FormSelect
                  className="catalog-status-filter"
                  id="instances-cluster-node-set-filter"
                  value={nodeSetTypeFilter}
                  onChange={(_event, value) => setNodeSetTypeFilter(value)}
                  aria-label="Filter clusters by node set type"
                >
                  <FormSelectOption value="all" label="All node set types" />
                  {clusterNodeSetTypeOptions.map((nodeSetType) => (
                    <FormSelectOption key={nodeSetType} value={nodeSetType} label={nodeSetType} />
                  ))}
                </FormSelect>
              </>
            ) : null}
            {isVirtualMachinesPage ? (
              <>
                <FormSelect
                  className="catalog-status-filter"
                  id="instances-vm-power-state-filter"
                  value={powerStateFilter}
                  onChange={(_event, value) =>
                    setPowerStateFilter(value as 'all' | TenantInstanceStatus)
                  }
                  aria-label="Filter virtual machines by power state"
                >
                  {POWER_STATE_FILTER_OPTIONS.map((option) => (
                    <FormSelectOption
                      key={option.value}
                      value={option.value}
                      label={option.label}
                    />
                  ))}
                </FormSelect>
                <FormSelect
                  className="catalog-status-filter"
                  id="instances-vm-os-filter"
                  value={osFilter}
                  onChange={(_event, value) => setOsFilter(value)}
                  aria-label="Filter virtual machines by operating system"
                >
                  <FormSelectOption value="all" label="All operating systems" />
                  {vmOsOptions.map((osImage) => (
                    <FormSelectOption key={osImage} value={osImage} label={osImage} />
                  ))}
                </FormSelect>
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
          <EmptyState className="tenant-user-instances__empty">
            <span className="tenant-user-instances__empty-icon" aria-hidden>
              {getCatalogServiceIcon(lockedServiceId ?? 'baremetal')}
            </span>
            <Title headingLevel="h2" size="lg">
              {emptyStateTitle}
            </Title>
            <EmptyStateBody>
              {instances.length === 0
                ? 'Launch an instance from the catalog to start provisioning capacity for your project.'
                : selectedFilters.size === 0
                  ? 'Choose one or more services above to filter your instances.'
                  : searchValue.trim() || hasActiveServiceFilters
                    ? 'Try a different search term or clear the filters above.'
                    : 'No instances match the selected services.'}
            </EmptyStateBody>
          </EmptyState>
        ) : viewMode === 'grid' ? (
            <div className="catalog-card-grid tenant-user-instances__grid">
              {filteredInstances.map((instance) => {
                const serviceId = getTenantInstanceServiceId(instance)
                const cardSpecRows = getTenantInstanceCardSpecRows(instance)
                const isClusterCard = serviceId === 'cluster'

                return (
                <Card key={instance.id} isCompact={false} className="tenant-user-instances__card">
                  <CardBody>
                    <div className="tenant-user-instances__card-header">
                      <span className="tenant-user-instances__card-icon" aria-hidden>
                        {getCatalogServiceIcon(serviceId)}
                      </span>
                      <div className="tenant-user-instances__card-header-actions">
                        {isClusterCard ? null : <InstanceStatusLabel status={instance.status} />}
                        <ActionsColumn items={getInstanceKebabActions(instance)} />
                      </div>
                    </div>

                    <div className="tenant-user-instances__card-title-block">
                      {isClusterCard ? (
                        <div className="tenant-user-instances__name-status-row">
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
                          <InstanceStatusLabel status={instance.status} />
                        </div>
                      ) : (
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
                      )}
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
                  </CardBody>
                </Card>
                )
              })}
            </div>
          ) : (
            <div className="catalog-table-panel">
              <Content component="p" className="catalog-table-result-count">
                {formatCatalogTableResultCount(filteredInstances.length, 'instance')}
              </Content>
              <Table
                aria-label="My instances"
                className="catalog-data-table tenant-user-instances__table"
              >
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Status</Th>
                    <Th>{scopeColumnLabel}</Th>
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
                      <Td dataLabel={getTenantInstanceScopeFieldLabel(instance)}>
                        {instance.projectName}
                      </Td>
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
    </TenantUserInstanceDetailsDrawer>

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
