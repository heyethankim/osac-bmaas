import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowLeftIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-left-icon'
import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import { CheckIcon } from '@patternfly/react-icons/dist/esm/icons/check-icon'
import { InfoCircleIcon } from '@patternfly/react-icons/dist/esm/icons/info-circle-icon'
import { LockIcon } from '@patternfly/react-icons/dist/esm/icons/lock-icon'
import {
  Alert,
  Button,
  Card,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  MenuToggle,
  Modal,
  ModalVariant,
  Spinner,
  TextArea,
  TextInput,
  Wizard,
  WizardHeader,
  WizardStep,
} from '@patternfly/react-core'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import type { CatalogServiceId } from '../../providerSetup/templateDemo'
import { isValidKubernetesResourceName } from '../../shared/kubernetesResourceName'
import {
  DEFAULT_CREATE_PROJECT_WIZARD_FORM,
  DEFAULT_PROJECT_IP_SLICE,
} from '../../tenantAdmin/createProjectWizard'
import { getWorkspaceOrganization } from '../../tenantAdmin/organizations'
import {
  generateTenantProjectId,
  resolveOrganizationExternalIpPool,
  TENANT_PROJECTS_TEAMS_DEMO,
  type TenantProject,
} from '../../tenantAdmin/projects'
import { addTenantProject } from '../../tenantAdmin/storage'
import { resolveCatalogSpecRows, resolveClusterCatalogHighlightRows } from '../../catalog/catalogSpecs'
import {
  formatClusterHostTypeLabel,
  formatClusterNodeSetLabel,
  formatClusterPlatformLabel,
  getCatalogClusterHostTypeOptions,
  getCatalogClusterNodeSetOptions,
  getCatalogClusterNodeTopologyModeLabel,
  getCatalogClusterVersionLifecycleMeta,
  getCatalogClusterVersionModeLabel,
  getCatalogClusterVersionOptions,
  getLatestCatalogClusterVersionId,
  getReleaseImageForClusterVersion,
  resolveCatalogClusterNodeTopologyMode,
  resolveCatalogClusterVersionMode,
} from '../../catalog/catalogPublishConfig'
import type { TenantUserCatalogCard } from '../../tenantUser/catalog'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import { MinusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/minus-circle-icon'
import {
  createDefaultClusterNodeSet,
  createLaunchInstanceWizardForm,
  getLaunchInstanceWizardSteps,
  getNextLaunchInstanceName,
  getLaunchInstanceNamePlaceholder,
  isClusterConfigureStepValid,
  isClusterGeneralStepValid,
  isClusterNetworkingStepValid,
  isInstanceNameValid,
  isVmConfigureStepValid,
  isVmGeneralStepValid,
  isVmNetworkingStepValid,
  isBareMetalGeneralStepValid,
  BAREMETAL_LAUNCH_INSTANCE_DEMO,
  CLUSTER_LAUNCH_INSTANCE_DEMO,
  LAUNCH_INSTANCE_BOOT_LOG_STEP_MS,
  LAUNCH_INSTANCE_PROVISIONING_SETTLE_MS,
  LAUNCH_INSTANCE_WIZARD_DEMO,
  PROVISIONING_BOOT_LOG_STEPS,
  VM_LAUNCH_INSTANCE_DEMO,
  parseVmLaunchInstanceTypeOption,
  type LaunchInstanceWizardForm,
  type LaunchInstanceWizardStepId,
  type ProvisioningBootLogStatus,
} from '../../tenantUser/launchInstanceWizard'
import {
  formatLaunchInstanceNetworkLabel,
  getLaunchNetworkFieldLabel,
  resolveLaunchInstanceNetworking,
  resolveLaunchNetworkContext,
  type LaunchNetworkFieldView,
} from '../../tenantUser/launchNetworking'
import { resolveNetworkInventoryScope } from '../../shared/networkInventoryScope'
import { formatTenantInstanceName, generateTenantInstanceId, type TenantInstance } from '../../tenantUser/instances'
import type { TenantUserScopeKind } from '../../tenantUser/scope'
import { KubernetesResourceNameField } from '../shared/KubernetesResourceNameHelper'
import { CatalogWizardPageShell } from '../catalog/CatalogWizardPageShell'
import { useWizardLeaveConfirm } from '../shared/useWizardLeaveConfirm'

type TenantUserLaunchInstanceWizardProps = {
  isOpen: boolean
  /** `page` replaces the catalog landing (breadcrumb back to Catalog). Default `modal`. */
  presentation?: 'modal' | 'page'
  catalogItem: TenantUserCatalogCard
  organization: RegisteredOrganization | null
  catalogDraft: ProviderCatalogDraft | null
  preferCatalogDraft?: boolean
  tenantSlug: string
  projects: readonly TenantProject[]
  /** Prefill from Services project switcher when a specific project is selected. */
  initialProjectId?: string | null
  onProjectScopeChange?: (projectId: string) => void
  onProjectsChange: (projects: TenantProject[]) => void
  existingInstanceNames?: readonly string[]
  onClose: () => void
  onProvisioningStarted: (instance: TenantInstance) => void
  onDismissDuringProvisioning: (instanceId: string, serviceId: CatalogServiceId) => void
  onWizardFinished: (instanceId: string, serviceId: CatalogServiceId) => void
}

function resolveInitialLaunchProjectId(
  projects: readonly TenantProject[],
  initialProjectId?: string | null,
): string {
  if (initialProjectId && projects.some((project) => project.id === initialProjectId)) {
    return initialProjectId
  }
  return projects[0]?.id ?? ''
}

function getBootLogStatus(
  stepIndex: number,
  activeIndex: number,
): ProvisioningBootLogStatus {
  if (stepIndex < activeIndex) {
    return 'completed'
  }

  if (stepIndex === activeIndex) {
    return 'in-progress'
  }

  return 'pending'
}

function getCatalogOptionLabel(name: string, detail: string): string {
  return `${name} · ${detail}`
}

export function TenantUserLaunchInstanceWizard({
  isOpen,
  presentation = 'modal',
  catalogItem,
  organization,
  catalogDraft,
  preferCatalogDraft = false,
  tenantSlug,
  projects,
  initialProjectId = null,
  onProjectScopeChange,
  onProjectsChange,
  existingInstanceNames = [],
  onClose,
  onProvisioningStarted,
  onDismissDuringProvisioning,
  onWizardFinished,
}: TenantUserLaunchInstanceWizardProps) {
  const networkContext = useMemo(
    () =>
      resolveLaunchNetworkContext(
        organization,
        catalogDraft,
        preferCatalogDraft,
        catalogItem.catalogItemId,
      ),
    [organization, catalogDraft, preferCatalogDraft, catalogItem.catalogItemId],
  )
  const networkInventory = useMemo(
    () => resolveNetworkInventoryScope(organization?.slug ?? tenantSlug),
    [organization?.slug, tenantSlug],
  )
  const isClusterCatalogItem = catalogItem.serviceId === 'cluster'
  const isVmCatalogItem = catalogItem.serviceId === 'virtual-machine'
  const isBareMetalCatalogItem = catalogItem.serviceId === 'baremetal'
  const isServiceAwareCatalogItem = isClusterCatalogItem || isVmCatalogItem
  const usesGeneralFirstStep =
    isClusterCatalogItem || isVmCatalogItem || isBareMetalCatalogItem
  const [selectedProjectId, setSelectedProjectId] = useState(() =>
    resolveInitialLaunchProjectId(projects, initialProjectId),
  )
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const resolvedOrganization = organization ?? getWorkspaceOrganization(tenantSlug)
  const organizationPool = resolveOrganizationExternalIpPool(resolvedOrganization)
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null
  const launchScopeKind: TenantUserScopeKind = selectedProject ? 'project' : 'organization'
  const launchScopeLabel = selectedProject?.name ?? organization?.name ?? tenantSlug
  const launchScopeFieldLabel = selectedProject ? 'Project' : 'Organization'
  const selectedProjectLabel = selectedProject?.name ?? 'Select a project'
  const projectToggleLabel = isCreatingProject
    ? TENANT_PROJECTS_TEAMS_DEMO.createProjectLabel
    : selectedProjectLabel
  const canCreateProject = isValidKubernetesResourceName(newProjectName)
  const isProjectSelectionValid =
    projects.length === 0 ||
    Boolean(selectedProjectId) ||
    (isCreatingProject && canCreateProject)

  const selectProject = (projectId: string) => {
    setIsCreatingProject(false)
    setNewProjectName('')
    setSelectedProjectId(projectId)
    onProjectScopeChange?.(projectId)
  }

  const startCreateProject = () => {
    setIsProjectMenuOpen(false)
    setSelectedProjectId('')
    setNewProjectName(getNextQuickCreateProjectName(projects))
    setIsCreatingProject(true)
  }

  const handleQuickCreateProject = () => {
    if (!canCreateProject) {
      return
    }

    const project: TenantProject = {
      id: generateTenantProjectId(),
      name: newProjectName.trim(),
      description: '',
      environmentType: DEFAULT_CREATE_PROJECT_WIZARD_FORM.environmentType,
      instanceQuota: DEFAULT_CREATE_PROJECT_WIZARD_FORM.instanceQuota,
      externalIpPoolId: organizationPool?.id ?? null,
      externalIpPoolName: organizationPool?.name ?? null,
      externalIpPoolCidr: DEFAULT_PROJECT_IP_SLICE,
      catalogItems: [],
      members: [],
      createdAt: new Date().toISOString(),
    }

    addTenantProject(tenantSlug, project)
    onProjectsChange([...projects, project])
    setIsCreatingProject(false)
    setNewProjectName('')
    setSelectedProjectId(project.id)
    onProjectScopeChange?.(project.id)
  }

  const commitPendingProjectIfNeeded = () => {
    if (isCreatingProject) {
      handleQuickCreateProject()
    }
  }
  const catalogDetailSpecRows = useMemo(
    () =>
      isServiceAwareCatalogItem
        ? resolveCatalogSpecRows(
            {
              serviceId: catalogItem.serviceId,
              templateRefId: catalogItem.templateRefId,
              templateName: catalogItem.templateName,
              instanceTypeLabel: catalogItem.instanceTypeLabel,
              diskImageLabel: catalogItem.diskImageLabel,
              diskImageId: catalogItem.diskImageId,
              clusterVersionMode: catalogItem.clusterVersionMode,
              nodeSetId: catalogItem.nodeSetId,
              nodeSetLabel: catalogItem.nodeSetLabel,
              hostTypeId: catalogItem.hostTypeId,
              hostTypeLabel: catalogItem.hostTypeLabel,
              clusterNodeTopologyMode: catalogItem.clusterNodeTopologyMode,
            },
            { includeDetails: true },
          )
        : catalogItem.specRows,
    [
      isServiceAwareCatalogItem,
      catalogItem.serviceId,
      catalogItem.templateRefId,
      catalogItem.templateName,
      catalogItem.instanceTypeLabel,
      catalogItem.diskImageLabel,
      catalogItem.diskImageId,
      catalogItem.clusterVersionMode,
      catalogItem.nodeSetId,
      catalogItem.nodeSetLabel,
      catalogItem.hostTypeId,
      catalogItem.hostTypeLabel,
      catalogItem.clusterNodeTopologyMode,
      catalogItem.specRows,
    ],
  )
  const launchCatalogSummaryRows = useMemo(() => {
    if (catalogDetailSpecRows.length > 0) {
      return catalogDetailSpecRows.slice(0, 4)
    }

    return [
      { label: 'CPU', value: catalogItem.cpu },
      { label: 'RAM', value: catalogItem.ram },
      { label: 'GPU', value: catalogItem.gpu },
      { label: 'OS image', value: catalogItem.osImage },
    ].filter((row) => row.value.trim().length > 0 && row.value !== '—')
  }, [
    catalogDetailSpecRows,
    catalogItem.cpu,
    catalogItem.ram,
    catalogItem.gpu,
    catalogItem.osImage,
  ])
  const resolvedVmOsImage = useMemo(() => {
    if (!isVmCatalogItem) {
      return ''
    }
    if (catalogItem.osImage.trim() && catalogItem.osImage !== '—') {
      return catalogItem.osImage.trim()
    }
    return (
      catalogDetailSpecRows.find((row) => row.label === 'OS image')?.value ??
      catalogItem.diskImageLabel?.trim() ??
      'RHEL 9.4'
    )
  }, [
    isVmCatalogItem,
    catalogItem.osImage,
    catalogItem.diskImageLabel,
    catalogDetailSpecRows,
  ])
  // Networking is service-level — always available at launch for every catalog service.
  const includeNetworkingStep = true
  const wizardSteps = useMemo(
    () =>
      getLaunchInstanceWizardSteps({
        includeNetworking: includeNetworkingStep,
        serviceId: catalogItem.serviceId,
      }),
    [catalogItem.serviceId],
  )

  const catalogClusterVersion =
    catalogItem.diskImageId?.trim() ||
    catalogItem.diskImageLabel?.trim() ||
    catalogDetailSpecRows.find(
      (row) => row.label === 'Cluster version' || row.label === 'Platform',
    )?.value ||
    ''
  const isClusterVersionEditable =
    isClusterCatalogItem &&
    resolveCatalogClusterVersionMode(catalogItem.clusterVersionMode) === 'editable'
  const isClusterNodeTopologyEditable =
    isClusterCatalogItem &&
    resolveCatalogClusterNodeTopologyMode(catalogItem.clusterNodeTopologyMode) === 'editable'
  const clusterVersionOptions = useMemo(() => getCatalogClusterVersionOptions(), [])
  const latestClusterVersionId = getLatestCatalogClusterVersionId()
  const catalogDefaultHostType =
    catalogItem.hostTypeId?.trim() ||
    catalogItem.hostTypeLabel?.trim() ||
    catalogDetailSpecRows.find((row) => row.label === 'Host type')?.value ||
    CLUSTER_LAUNCH_INSTANCE_DEMO.defaultHostType
  const catalogDefaultNodeSetId =
    catalogItem.nodeSetId?.trim() ||
    catalogItem.nodeSetLabel?.trim() ||
    catalogDetailSpecRows.find((row) => row.label === 'Node set')?.value ||
    'fc430-worker'
  const clusterNodeSetOptions = useMemo(() => getCatalogClusterNodeSetOptions(), [])
  const clusterHostTypeOptions = useMemo(() => getCatalogClusterHostTypeOptions(), [])
  const clusterTopologyModeLabel = getCatalogClusterNodeTopologyModeLabel(
    resolveCatalogClusterNodeTopologyMode(catalogItem.clusterNodeTopologyMode),
  )
  const clusterVersionModeLabel = getCatalogClusterVersionModeLabel(
    resolveCatalogClusterVersionMode(catalogItem.clusterVersionMode),
  )

  const [form, setForm] = useState<LaunchInstanceWizardForm>(() =>
    createLaunchInstanceWizardForm({
      virtualNetworkId: networkContext.policy.virtualNetwork.id,
      subnetId: networkContext.policy.subnet.id,
      securityGroupId: networkContext.policy.securityGroup.id,
      externalIpPoolId: networkContext.policy.externalIpPool.id,
      serviceId: catalogItem.serviceId,
      instanceName: getNextLaunchInstanceName(existingInstanceNames, catalogItem.serviceId),
      clusterVersion: catalogClusterVersion || catalogItem.osImage,
      hostType: catalogDefaultHostType,
      nodeSetId: catalogDefaultNodeSetId,
    }),
  )
  const [activeStepId, setActiveStepId] = useState<LaunchInstanceWizardStepId>(
    usesGeneralFirstStep ? 'general' : 'configure',
  )
  const [activeBootLogIndex, setActiveBootLogIndex] = useState(0)
  const [isProvisioningComplete, setIsProvisioningComplete] = useState(false)
  const provisioningStartedRef = useRef(false)
  const provisioningInstanceIdRef = useRef<string | null>(null)
  const isOpenRef = useRef(isOpen)
  const onProvisioningStartedRef = useRef(onProvisioningStarted)
  const onWizardFinishedRef = useRef(onWizardFinished)

  onProvisioningStartedRef.current = onProvisioningStarted
  onWizardFinishedRef.current = onWizardFinished

  const activeStepDescription =
    wizardSteps.find((step) => step.id === activeStepId)?.description ?? ''

  const networkSelections = {
    virtualNetworkId: form.virtualNetworkId || networkContext.policy.virtualNetwork.id,
    subnetId: form.subnetId || networkContext.policy.subnet.id,
    securityGroupId: form.securityGroupId || networkContext.policy.securityGroup.id,
    externalIpPoolId: form.externalIpPoolId || networkContext.policy.externalIpPool.id,
  }

  const networkLabel = isClusterCatalogItem
    ? `Pod ${form.podCidr.trim()} · Service ${form.serviceCidr.trim()}`
    : formatLaunchInstanceNetworkLabel(networkContext, networkSelections)
  const networking = resolveLaunchInstanceNetworking(networkContext, networkSelections)
  const assignedNetworkSummary = networkContext.assignedNetworkSummary
  const securityGroupField = networkContext.fields.find(
    (field) => field.kind === 'security-group',
  )
  const securityGroupLabel = securityGroupField
    ? getLaunchNetworkFieldLabel(securityGroupField, networkSelections.securityGroupId)
    : networkContext.policy.securityGroup.name

  const resetWizard = () => {
    setForm(
      createLaunchInstanceWizardForm({
        virtualNetworkId: networkContext.policy.virtualNetwork.id,
        subnetId: networkContext.policy.subnet.id,
        securityGroupId: networkContext.policy.securityGroup.id,
        externalIpPoolId: networkContext.policy.externalIpPool.id,
        serviceId: catalogItem.serviceId,
        instanceName: getNextLaunchInstanceName(
          existingInstanceNames,
          catalogItem.serviceId,
        ),
        clusterVersion: catalogClusterVersion || catalogItem.osImage,
        hostType: catalogDefaultHostType,
        nodeSetId: catalogDefaultNodeSetId,
      }),
    )
    setSelectedProjectId(resolveInitialLaunchProjectId(projects, initialProjectId))
    setIsCreatingProject(false)
    setNewProjectName('')
    setIsProjectMenuOpen(false)
    setActiveStepId(usesGeneralFirstStep ? 'general' : 'configure')
    setActiveBootLogIndex(0)
    setIsProvisioningComplete(false)
    provisioningStartedRef.current = false
    provisioningInstanceIdRef.current = null
  }

  const handleClose = () => {
    const provisioningId = provisioningInstanceIdRef.current
    // Any close after provisioning has started should land on Services.
    if (provisioningId) {
      onDismissDuringProvisioning(provisioningId, catalogItem.serviceId)
      resetWizard()
      onClose()
      return
    }

    resetWizard()
    onClose()
  }

  const { requestClose: showLeaveConfirm, leaveConfirmModal, wrapStepFooter } =
    useWizardLeaveConfirm({
      onLeave: handleClose,
      primaryActionLabel: 'Leave',
      titleId: 'launch-instance-leave-confirm',
    })

  const requestClose = () => {
    if (provisioningInstanceIdRef.current) {
      handleClose()
      return
    }
    showLeaveConfirm()
  }

  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      resetWizard()
      return
    }

    setForm(
      createLaunchInstanceWizardForm({
        virtualNetworkId: networkContext.policy.virtualNetwork.id,
        subnetId: networkContext.policy.subnet.id,
        securityGroupId: networkContext.policy.securityGroup.id,
        externalIpPoolId: networkContext.policy.externalIpPool.id,
        serviceId: catalogItem.serviceId,
        instanceName: getNextLaunchInstanceName(
          existingInstanceNames,
          catalogItem.serviceId,
        ),
        clusterVersion: catalogClusterVersion || catalogItem.osImage,
        hostType: catalogDefaultHostType,
        nodeSetId: catalogDefaultNodeSetId,
      }),
    )
    setSelectedProjectId(resolveInitialLaunchProjectId(projects, initialProjectId))
    setIsCreatingProject(false)
    setNewProjectName('')
    setIsProjectMenuOpen(false)
    setActiveStepId(usesGeneralFirstStep ? 'general' : 'configure')
  }, [
    isOpen,
    networkContext,
    existingInstanceNames,
    catalogItem.serviceId,
    usesGeneralFirstStep,
    projects,
    initialProjectId,
    catalogClusterVersion,
    catalogItem.osImage,
    catalogDefaultHostType,
    catalogDefaultNodeSetId,
  ])

  useEffect(() => {
    if (!isOpen || activeStepId !== 'provisioning' || provisioningStartedRef.current) {
      return
    }

    provisioningStartedRef.current = true

    const detailSpecRows = catalogDetailSpecRows
    const vmInstanceTypeParts = isVmCatalogItem
      ? parseVmLaunchInstanceTypeOption(form.instanceType.trim())
      : null
    const vmOsImage = isVmCatalogItem ? resolvedVmOsImage : null

    const instance: TenantInstance = {
      id: generateTenantInstanceId(),
      name:
        isClusterCatalogItem || isVmCatalogItem || isBareMetalCatalogItem
          ? form.instanceName.trim()
          : formatTenantInstanceName(form.instanceName.trim()),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      catalogItemDisplayName: catalogItem.displayName,
      serviceId: catalogItem.serviceId,
      hardwareProfile: catalogItem.hardwareProfile,
      osImage: isClusterCatalogItem
        ? formatClusterPlatformLabel(form.clusterVersionId || form.releaseImage)
        : isVmCatalogItem
          ? (vmOsImage ?? catalogItem.osImage)
          : catalogItem.osImage,
      networkLabel,
      networking,
      gpuLabel: isClusterCatalogItem
        ? (detailSpecRows.find((row) => row.label === 'Node set')?.value ?? catalogItem.gpu)
        : isVmCatalogItem
          ? (vmInstanceTypeParts?.size ?? catalogItem.gpu)
          : catalogItem.gpu,
      specRows: isServiceAwareCatalogItem
        ? isVmCatalogItem
          ? [
              {
                label: 'Instance type',
                value: vmInstanceTypeParts?.instanceType || form.instanceType.trim(),
              },
              { label: 'Size', value: vmInstanceTypeParts?.size || form.instanceType.trim() },
              { label: 'OS image', value: vmOsImage ?? catalogItem.osImage },
              { label: 'Container disk image', value: form.containerDiskImage.trim() },
              { label: 'Boot disk', value: `${form.bootDiskSizeGiB} GiB` },
              { label: 'Image source type', value: form.imageSourceType.trim() },
              { label: 'Run strategy', value: form.runStrategy.trim() },
              ...(form.cloudInitUserData.trim()
                ? [{ label: 'Cloud-init', value: form.cloudInitUserData.trim() }]
                : []),
            ]
          : [
              ...resolveClusterCatalogHighlightRows({
                serviceId: 'cluster',
                templateRefId: catalogItem.templateRefId,
                templateName: catalogItem.templateName,
                diskImageId: form.clusterVersionId || catalogItem.diskImageId,
                diskImageLabel: formatClusterPlatformLabel(
                  form.clusterVersionId || form.releaseImage || catalogItem.diskImageLabel,
                ),
                clusterVersionMode: catalogItem.clusterVersionMode,
                nodeSetId: form.nodeSets[0]?.nodeSetId || catalogItem.nodeSetId,
                nodeSetLabel: formatClusterNodeSetLabel(
                  form.nodeSets[0]?.nodeSetId ||
                    catalogItem.nodeSetLabel ||
                    catalogItem.nodeSetId,
                ),
                hostTypeId: form.nodeSets[0]?.hostType || catalogItem.hostTypeId,
                hostTypeLabel: formatClusterHostTypeLabel(
                  form.nodeSets[0]?.hostType ||
                    catalogItem.hostTypeLabel ||
                    catalogItem.hostTypeId,
                ),
                clusterNodeTopologyMode: catalogItem.clusterNodeTopologyMode,
              }),
              { label: 'Release image', value: form.releaseImage.trim() },
              ...form.nodeSets.map((nodeSet, index) => ({
                label: `Node set ${index + 1}`,
                value: `${formatClusterNodeSetLabel(nodeSet.nodeSetId)} · ${nodeSet.hostType} · ${nodeSet.nodeCount} ${
                  nodeSet.nodeCount === 1 ? 'node' : 'nodes'
                }`,
              })),
              { label: 'Pod CIDR', value: form.podCidr.trim() },
              { label: 'Service CIDR', value: form.serviceCidr.trim() },
            ]
        : catalogItem.specRows,
      clusterConfig: isClusterCatalogItem
        ? {
            releaseImage: form.releaseImage.trim(),
            podCidr: form.podCidr.trim(),
            serviceCidr: form.serviceCidr.trim(),
            catalogShortName: 'ocp-small',
            creator: 'Alex Johnson',
            upgradeStatus: 'up-to-date',
            nodeSets: form.nodeSets.map((nodeSet, index) => ({
              id: nodeSet.id,
              name: index === 0 ? 'workers' : `node-set-${index + 1}`,
              hostType: nodeSet.hostType,
              nodeCount: nodeSet.nodeCount,
              version: formatClusterPlatformLabel(
                form.clusterVersionId || form.releaseImage.trim(),
              ) || undefined,
              status: 'pending' as const,
            })),
          }
        : undefined,
      sshPublicKey:
        isBareMetalCatalogItem || isVmCatalogItem || isClusterCatalogItem
          ? form.sshPublicKey.trim()
          : undefined,
      vmConfig: isVmCatalogItem
        ? {
            instanceType: form.instanceType.trim() || 'small - 1 vCPU, 2 GiB',
            containerDiskImage:
              form.containerDiskImage.trim() || 'quay.io/containerdisks/fedora:latest',
            bootDiskSizeGiB: form.bootDiskSizeGiB,
            sshPublicKey: form.sshPublicKey.trim(),
            internalIp: '10.99.1.11',
            publicIp: null,
            publicIpFamily: null,
          }
        : undefined,
      projectIds: selectedProject ? [selectedProject.id] : [],
      projectName: launchScopeLabel,
      scopeKind: launchScopeKind,
      status: 'provisioning',
      createdAt: new Date().toISOString(),
      provisionedAt: null,
    }

    provisioningInstanceIdRef.current = instance.id
    onProvisioningStartedRef.current(instance)

    const totalSteps = PROVISIONING_BOOT_LOG_STEPS.length
    let stepIndex = 0
    let settleTimeoutId: number | undefined

    const intervalId = window.setInterval(() => {
      stepIndex += 1
      setActiveBootLogIndex(stepIndex)

      if (stepIndex >= totalSteps) {
        window.clearInterval(intervalId)
        setIsProvisioningComplete(true)

        settleTimeoutId = window.setTimeout(() => {
          const instanceId = provisioningInstanceIdRef.current
          if (isOpenRef.current && instanceId) {
            onWizardFinishedRef.current(instanceId, catalogItem.serviceId)
            resetWizard()
          }
        }, LAUNCH_INSTANCE_PROVISIONING_SETTLE_MS)
      }
    }, LAUNCH_INSTANCE_BOOT_LOG_STEP_MS)

    return () => {
      window.clearInterval(intervalId)
      if (settleTimeoutId !== undefined) {
        window.clearTimeout(settleTimeoutId)
      }
    }
    // Intentionally start once when entering provisioning; callbacks via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- provisioning snapshot
  }, [isOpen, activeStepId])

  const updateNetworkSelection = (
    kind: LaunchNetworkFieldView['kind'],
    value: string,
  ) => {
    setForm((current) => {
      if (kind === 'virtual-network') {
        const nextSubnetId =
          networkInventory
            .getSubnetOptions(value)
            .find((option) => option.id === current.subnetId)?.id ??
          networkInventory.getSubnetOptions(value)[0]?.id ??
          current.subnetId
        return { ...current, virtualNetworkId: value, subnetId: nextSubnetId }
      }
      if (kind === 'subnet') {
        return { ...current, subnetId: value }
      }
      if (kind === 'security-group') {
        return { ...current, securityGroupId: value }
      }
      return { ...current, externalIpPoolId: value }
    })
  }

  const getSelectedIdForField = (field: LaunchNetworkFieldView): string => {
    if (field.kind === 'virtual-network') {
      return networkSelections.virtualNetworkId
    }
    if (field.kind === 'subnet') {
      return networkSelections.subnetId
    }
    if (field.kind === 'security-group') {
      return networkSelections.securityGroupId
    }
    return networkSelections.externalIpPoolId
  }

  const renderProjectField = (fieldId: string) => (
    <FormGroup label="Project" fieldId={fieldId} isRequired={projects.length > 0 || isCreatingProject}>
      <div className="tenant-user-launch-wizard__project-control">
        <Dropdown
          isOpen={isProjectMenuOpen}
          onOpenChange={setIsProjectMenuOpen}
          onSelect={(_event, value) => {
            if (value == null) {
              return
            }
            selectProject(String(value))
            setIsProjectMenuOpen(false)
          }}
          toggle={(toggleRef) => (
            <MenuToggle
              ref={toggleRef}
              id={fieldId}
              isExpanded={isProjectMenuOpen}
              onClick={() => setIsProjectMenuOpen((open) => !open)}
              className="tenant-user-launch-wizard__project-toggle"
              aria-label={`Project: ${projectToggleLabel}`}
            >
              {projectToggleLabel}
            </MenuToggle>
          )}
        >
          <DropdownList>
            {projects.map((project) => (
              <DropdownItem
                key={project.id}
                value={project.id}
                isSelected={!isCreatingProject && selectedProjectId === project.id}
              >
                {project.name}
              </DropdownItem>
            ))}
            {projects.length > 0 ? (
              <Divider component="li" key="create-project-separator" />
            ) : null}
            <DropdownItem
              icon={<PlusIcon />}
              isSelected={isCreatingProject}
              onClick={startCreateProject}
            >
              {TENANT_PROJECTS_TEAMS_DEMO.createProjectLabel}
            </DropdownItem>
          </DropdownList>
        </Dropdown>
      </div>
      {isCreatingProject ? (
        <>
          <div className="tenant-user-launch-wizard__project-name">
            <KubernetesResourceNameField
              id={`${fieldId}-name`}
              value={newProjectName}
              onChange={setNewProjectName}
              placeholder="my-project"
              isRequired
            />
          </div>
          <FormHelperText>
            <HelperText>
              <HelperTextItem>Add team members later in Projects & teams.</HelperTextItem>
            </HelperText>
          </FormHelperText>
        </>
      ) : null}
      {!isCreatingProject && projects.length === 0 ? (
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              Create a project to launch into, or this instance will use the organization.
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      ) : null}
    </FormGroup>
  )

  const renderCatalogOfferingSummary = (options?: { includeAssignedNetwork?: boolean }) => {
    const includeAssignedNetwork = Boolean(
      options?.includeAssignedNetwork && networkContext.enabled && !includeNetworkingStep,
    )

    if (launchCatalogSummaryRows.length === 0 && !includeAssignedNetwork) {
      return null
    }

    return (
      <div className="tenant-user-launch-wizard__preconfigured-section">
        <div className="tenant-user-launch-wizard__preconfigured-title">
          <LockIcon aria-hidden />
          <span>{LAUNCH_INSTANCE_WIZARD_DEMO.preConfiguredTitle}</span>
        </div>
        <Content component="p" className="tenant-user-launch-wizard__preconfigured-catalog-name">
          {catalogItem.displayName}
        </Content>

        <div
          className={`tenant-user-launch-wizard__preconfigured-grid${
            includeAssignedNetwork
              ? ' tenant-user-launch-wizard__preconfigured-grid--with-network'
              : ''
          }`}
        >
          {launchCatalogSummaryRows.map((row) => (
            <div key={row.label} className="tenant-user-launch-wizard__preconfigured-item">
              <Content component="p" className="tenant-user-launch-wizard__preconfigured-label">
                {row.label}
              </Content>
              <Content component="p" className="tenant-user-launch-wizard__preconfigured-value">
                {row.value}
              </Content>
            </div>
          ))}
          {includeAssignedNetwork ? (
            <div className="tenant-user-launch-wizard__preconfigured-item">
              <Content component="p" className="tenant-user-launch-wizard__preconfigured-label">
                Network
              </Content>
              <Content component="p" className="tenant-user-launch-wizard__preconfigured-value">
                {assignedNetworkSummary}
              </Content>
              <Content component="p" className="tenant-user-launch-wizard__assigned-helper">
                {LAUNCH_INSTANCE_WIZARD_DEMO.networkingAssignedHelper}
              </Content>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  const renderGeneralStep = () => {
    const nameFieldId = isBareMetalCatalogItem
      ? 'launch-bm-name'
      : isVmCatalogItem
        ? 'launch-vm-name'
        : 'launch-cluster-name'
    const sshFieldId = isBareMetalCatalogItem
      ? 'launch-bm-ssh-key'
      : isVmCatalogItem
        ? 'launch-vm-ssh-key'
        : 'launch-cluster-ssh-key'
    const sshHelper = isBareMetalCatalogItem
      ? BAREMETAL_LAUNCH_INSTANCE_DEMO.sshHelper
      : isVmCatalogItem
        ? VM_LAUNCH_INSTANCE_DEMO.sshHelper
      : CLUSTER_LAUNCH_INSTANCE_DEMO.sshHelper

    return (
      <div className="tenant-user-launch-wizard__step">
        {renderCatalogOfferingSummary()}

        <Form autoComplete="off" className="tenant-user-launch-wizard__form">
          {renderProjectField(
            isBareMetalCatalogItem
              ? 'launch-bm-project'
              : isVmCatalogItem
                ? 'launch-vm-project'
                : 'launch-cluster-project',
          )}

          <FormGroup label="Name" fieldId={nameFieldId} isRequired>
            <KubernetesResourceNameField
              id={nameFieldId}
              value={form.instanceName}
              onChange={(value) => setForm((current) => ({ ...current, instanceName: value }))}
              placeholder={getLaunchInstanceNamePlaceholder(catalogItem.serviceId)}
              isRequired
            />
          </FormGroup>

          <FormGroup label="Description" fieldId={`${nameFieldId}-description`}>
            <TextArea
              id={`${nameFieldId}-description`}
              value={form.description}
              onChange={(_event, value) =>
                setForm((current) => ({ ...current, description: value }))
              }
              aria-label="Description"
              rows={3}
              resizeOrientation="vertical"
            />
          </FormGroup>

          <FormGroup label="SSH public key" fieldId={sshFieldId} isRequired>
            <TextArea
              id={sshFieldId}
              value={form.sshPublicKey}
              onChange={(_event, value) =>
                setForm((current) => ({ ...current, sshPublicKey: value }))
              }
              resizeOrientation="vertical"
              rows={4}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>{sshHelper}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          {isClusterCatalogItem ? (
            <FormGroup label="Pull secret" fieldId="launch-cluster-pull-secret" isRequired>
              <TextArea
                id="launch-cluster-pull-secret"
                value={form.pullSecret}
                onChange={(_event, value) =>
                  setForm((current) => ({ ...current, pullSecret: value }))
                }
                resizeOrientation="vertical"
                rows={8}
              />
            </FormGroup>
          ) : null}
        </Form>
      </div>
    )
  }

  const renderVmConfigureStep = () => (
    <div className="tenant-user-launch-wizard__step">
      <Form autoComplete="off" className="tenant-user-launch-wizard__form">
        <FormGroup label="OS image" fieldId="launch-vm-os-image">
          <TextInput id="launch-vm-os-image" value={resolvedVmOsImage} isDisabled readOnly />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>{VM_LAUNCH_INSTANCE_DEMO.osImageHelper}</HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>

        <FormGroup label="Container Disk Image" fieldId="launch-vm-container-disk" isRequired>
          <TextInput
            id="launch-vm-container-disk"
            value={form.containerDiskImage}
            onChange={(_event, value) =>
              setForm((current) => ({ ...current, containerDiskImage: value }))
            }
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>{VM_LAUNCH_INSTANCE_DEMO.containerDiskImageHelper}</HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>

        <FormGroup label="Instance type" fieldId="launch-vm-instance-type" isRequired>
          <FormSelect
            id="launch-vm-instance-type"
            value={form.instanceType}
            onChange={(_event, value) =>
              setForm((current) => ({ ...current, instanceType: value }))
            }
            aria-label="Instance type"
          >
            {VM_LAUNCH_INSTANCE_DEMO.instanceTypeOptions.map((option) => (
              <FormSelectOption key={option} value={option} label={option} />
            ))}
          </FormSelect>
        </FormGroup>

        <FormGroup label="Boot Disk Size (GiB)" fieldId="launch-vm-boot-disk" isRequired>
          <TextInput
            id="launch-vm-boot-disk"
            type="number"
            min={1}
            value={String(form.bootDiskSizeGiB)}
            onChange={(_event, value) => {
              const parsed = Number.parseInt(value, 10)
              setForm((current) => ({
                ...current,
                bootDiskSizeGiB: Number.isNaN(parsed) ? 1 : Math.max(1, parsed),
              }))
            }}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>{VM_LAUNCH_INSTANCE_DEMO.bootDiskSizeHelper}</HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>

        <FormGroup label="Image Source Type" fieldId="launch-vm-image-source">
          <TextInput
            id="launch-vm-image-source"
            value={form.imageSourceType}
            isDisabled
            readOnly
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>{VM_LAUNCH_INSTANCE_DEMO.imageSourceTypeHelper}</HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>

        <FormGroup label="Run Strategy" fieldId="launch-vm-run-strategy" isRequired>
          <FormSelect
            id="launch-vm-run-strategy"
            value={form.runStrategy}
            onChange={(_event, value) =>
              setForm((current) => ({ ...current, runStrategy: value }))
            }
            aria-label="Run Strategy"
          >
            {VM_LAUNCH_INSTANCE_DEMO.runStrategyOptions.map((option) => (
              <FormSelectOption key={option} value={option} label={option} />
            ))}
          </FormSelect>
          <FormHelperText>
            <HelperText>
              <HelperTextItem>{VM_LAUNCH_INSTANCE_DEMO.runStrategyHelper}</HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>

        <FormGroup label="Cloud Init User Data" fieldId="launch-vm-cloud-init" isRequired>
          <TextArea
            id="launch-vm-cloud-init"
            value={form.cloudInitUserData}
            onChange={(_event, value) =>
              setForm((current) => ({ ...current, cloudInitUserData: value }))
            }
            resizeOrientation="vertical"
            rows={6}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>{VM_LAUNCH_INSTANCE_DEMO.cloudInitHelper}</HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </Form>
    </div>
  )

  const renderPlacementNetworkingFields = (idPrefix: string) => {
    const virtualNetworkField = networkContext.fields.find(
      (field) => field.kind === 'virtual-network',
    )
    const subnetField = networkContext.fields.find((field) => field.kind === 'subnet')
    const securityGroupField = networkContext.fields.find(
      (field) => field.kind === 'security-group',
    )
    const externalIpPoolField = networkContext.fields.find(
      (field) => field.kind === 'external-ip-pool',
    )
    const virtualNetworkOptions =
      virtualNetworkField?.options ?? networkInventory.getVirtualNetworkOptions()
    const subnetOptions =
      subnetField?.options ??
      networkInventory.getSubnetOptions(networkSelections.virtualNetworkId)
    const securityGroupOptions =
      securityGroupField?.options ?? networkInventory.getSecurityGroupOptions()
    const externalIpPoolOptions =
      externalIpPoolField?.options ?? networkInventory.getExternalIpPoolOptions()

    return (
      <>
        <FormGroup label="Virtual network" fieldId={`${idPrefix}-virtual-network`} isRequired>
          <FormSelect
            id={`${idPrefix}-virtual-network`}
            value={networkSelections.virtualNetworkId}
            onChange={(_event, value) => updateNetworkSelection('virtual-network', value)}
            aria-label="Virtual network"
          >
            {virtualNetworkOptions.map((option) => (
              <FormSelectOption
                key={option.id}
                value={option.id}
                label={getCatalogOptionLabel(option.name, option.detail)}
              />
            ))}
          </FormSelect>
        </FormGroup>

        <FormGroup label="Subnet" fieldId={`${idPrefix}-subnet`} isRequired>
          <FormSelect
            id={`${idPrefix}-subnet`}
            value={networkSelections.subnetId}
            onChange={(_event, value) => updateNetworkSelection('subnet', value)}
            aria-label="Subnet"
          >
            {subnetOptions.map((option) => (
              <FormSelectOption
                key={option.id}
                value={option.id}
                label={getCatalogOptionLabel(option.name, option.detail)}
              />
            ))}
          </FormSelect>
        </FormGroup>

        <FormGroup label="Security group" fieldId={`${idPrefix}-security-group`} isRequired>
          <FormSelect
            id={`${idPrefix}-security-group`}
            value={networkSelections.securityGroupId}
            onChange={(_event, value) => updateNetworkSelection('security-group', value)}
            aria-label="Security group"
          >
            {securityGroupOptions.map((option) => (
              <FormSelectOption
                key={option.id}
                value={option.id}
                label={getCatalogOptionLabel(option.name, option.detail)}
              />
            ))}
          </FormSelect>
        </FormGroup>

        <FormGroup label="External IP pool" fieldId={`${idPrefix}-external-ip-pool`} isRequired>
          <FormSelect
            id={`${idPrefix}-external-ip-pool`}
            value={networkSelections.externalIpPoolId}
            onChange={(_event, value) => updateNetworkSelection('external-ip-pool', value)}
            aria-label="External IP pool"
          >
            {externalIpPoolOptions.map((option) => (
              <FormSelectOption
                key={option.id}
                value={option.id}
                label={getCatalogOptionLabel(option.name, option.detail)}
              />
            ))}
          </FormSelect>
        </FormGroup>
      </>
    )
  }

  const renderVmNetworkingStep = () => (
    <div className="tenant-user-launch-wizard__step">
      <Form autoComplete="off" className="tenant-user-launch-wizard__form">
        {renderPlacementNetworkingFields('launch-vm')}
      </Form>
    </div>
  )

  const renderBareMetalNetworkingStep = () => (
    <div className="tenant-user-launch-wizard__step">
      <Content component="p" className="tenant-user-launch-wizard__step-lede">
        {LAUNCH_INSTANCE_WIZARD_DEMO.networkingLede}
      </Content>
      <Form autoComplete="off" className="tenant-user-launch-wizard__form">
        {renderPlacementNetworkingFields('launch-bm')}
      </Form>
    </div>
  )

  const renderClusterConfigureStep = () => {
    const selectedVersionLabel = formatClusterPlatformLabel(
      form.clusterVersionId || catalogClusterVersion || form.releaseImage,
    )

    return (
    <div className="tenant-user-launch-wizard__step">
      <Form autoComplete="off" className="tenant-user-launch-wizard__form">
        <FormGroup
          label="Cluster version"
          fieldId="launch-cluster-version"
          isRequired={isClusterVersionEditable}
        >
          {isClusterVersionEditable ? (
            <FormSelect
              id="launch-cluster-version"
              value={form.clusterVersionId || latestClusterVersionId}
              onChange={(_event, value) => {
                setForm((current) => ({
                  ...current,
                  clusterVersionId: value,
                  releaseImage: getReleaseImageForClusterVersion(value),
                }))
              }}
              aria-label="Cluster version"
            >
              {clusterVersionOptions.map((option) => {
                const lifecycleMeta = getCatalogClusterVersionLifecycleMeta(option.lifecycle)
                const isLatest = option.id === latestClusterVersionId
                return (
                  <FormSelectOption
                    key={option.id}
                    value={option.id}
                    label={`${option.label}${isLatest ? ' (Latest)' : ''} · ${lifecycleMeta.text}`}
                  />
                )
              })}
            </FormSelect>
          ) : (
            <TextInput
              id="launch-cluster-version"
              value={selectedVersionLabel}
              isDisabled
              aria-label="Cluster version"
            />
          )}
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                {isClusterVersionEditable
                  ? `Editable on this catalog item (${clusterVersionModeLabel}). Release image: `
                  : `Locked by the catalog item (${clusterVersionModeLabel}). Release image: `}
                {form.releaseImage.trim() ||
                  getReleaseImageForClusterVersion(
                    form.clusterVersionId || catalogClusterVersion,
                  )}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>

        <div className="tenant-user-launch-wizard__node-sets">
          <Content component="h3" className="tenant-user-launch-wizard__node-sets-title">
            Node topology
          </Content>
          <Content component="p" className="tenant-user-launch-wizard__step-lede">
            {isClusterNodeTopologyEditable
              ? `Node set and host type are editable on this catalog item (${clusterTopologyModeLabel}). Add more node sets if this cluster needs additional worker pools.`
              : `Node set and host type are locked by the catalog item (${clusterTopologyModeLabel}).`}
          </Content>

          {form.nodeSets.map((nodeSet, index) => (
            <div key={nodeSet.id} className="tenant-user-launch-wizard__node-set">
              <Flex
                justifyContent={{ default: 'justifyContentSpaceBetween' }}
                alignItems={{ default: 'alignItemsCenter' }}
                className="tenant-user-launch-wizard__node-set-header"
              >
                <FlexItem>
                  <Content component="p" className="tenant-user-launch-wizard__node-set-heading">
                    Node set {index + 1}
                  </Content>
                </FlexItem>
                {isClusterNodeTopologyEditable && form.nodeSets.length > 1 ? (
                  <FlexItem>
                    <Button
                      variant="link"
                      isInline
                      isDanger
                      icon={<MinusCircleIcon />}
                      aria-label={`Remove node set ${index + 1}`}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          nodeSets: current.nodeSets.filter((entry) => entry.id !== nodeSet.id),
                        }))
                      }
                    >
                      {CLUSTER_LAUNCH_INSTANCE_DEMO.removeNodeSetLabel}
                    </Button>
                  </FlexItem>
                ) : null}
              </Flex>

              <FormGroup
                label="Node set"
                fieldId={`launch-cluster-node-set-${nodeSet.id}`}
                isRequired
              >
                {isClusterNodeTopologyEditable ? (
                  <FormSelect
                    id={`launch-cluster-node-set-${nodeSet.id}`}
                    value={nodeSet.nodeSetId}
                    onChange={(_event, value) =>
                      setForm((current) => ({
                        ...current,
                        nodeSets: current.nodeSets.map((entry) =>
                          entry.id === nodeSet.id ? { ...entry, nodeSetId: value } : entry,
                        ),
                      }))
                    }
                    aria-label={`Node set ${index + 1}`}
                  >
                    {clusterNodeSetOptions.map((option) => (
                      <FormSelectOption
                        key={option.id}
                        value={option.id}
                        label={`${option.label} · ${option.detail}`}
                      />
                    ))}
                  </FormSelect>
                ) : (
                  <TextInput
                    id={`launch-cluster-node-set-${nodeSet.id}`}
                    value={formatClusterNodeSetLabel(nodeSet.nodeSetId)}
                    isDisabled
                    aria-label={`Node set ${index + 1}`}
                  />
                )}
              </FormGroup>

              <FormGroup
                label="Host type"
                fieldId={`launch-cluster-host-type-${nodeSet.id}`}
                isRequired
              >
                {isClusterNodeTopologyEditable ? (
                  <FormSelect
                    id={`launch-cluster-host-type-${nodeSet.id}`}
                    value={nodeSet.hostType}
                    onChange={(_event, value) =>
                      setForm((current) => ({
                        ...current,
                        nodeSets: current.nodeSets.map((entry) =>
                          entry.id === nodeSet.id ? { ...entry, hostType: value } : entry,
                        ),
                      }))
                    }
                    aria-label={`Host type for node set ${index + 1}`}
                  >
                    {clusterHostTypeOptions.map((option) => (
                      <FormSelectOption
                        key={option.id}
                        value={option.id}
                        label={option.label}
                      />
                    ))}
                  </FormSelect>
                ) : (
                  <TextInput
                    id={`launch-cluster-host-type-${nodeSet.id}`}
                    value={formatClusterHostTypeLabel(nodeSet.hostType)}
                    isDisabled
                    aria-label={`Host type for node set ${index + 1}`}
                  />
                )}
              </FormGroup>

              <FormGroup
                label="Nodes"
                fieldId={`launch-cluster-nodes-${nodeSet.id}`}
                isRequired
              >
                <TextInput
                  id={`launch-cluster-nodes-${nodeSet.id}`}
                  type="number"
                  min={1}
                  value={String(nodeSet.nodeCount)}
                  isDisabled={!isClusterNodeTopologyEditable}
                  onChange={(_event, value) => {
                    const parsed = Number.parseInt(value, 10)
                    setForm((current) => ({
                      ...current,
                      nodeSets: current.nodeSets.map((entry) =>
                        entry.id === nodeSet.id
                          ? {
                              ...entry,
                              nodeCount: Number.isNaN(parsed) ? 1 : Math.max(1, parsed),
                            }
                          : entry,
                      ),
                    }))
                  }}
                />
              </FormGroup>
            </div>
          ))}

          {isClusterNodeTopologyEditable ? (
            <Button
              variant="link"
              isInline
              icon={<PlusCircleIcon />}
              className="tenant-user-launch-wizard__add-node-set"
              onClick={() =>
                setForm((current) => {
                  const nextIndex = current.nodeSets.length + 1
                  return {
                    ...current,
                    nodeSets: [
                      ...current.nodeSets,
                      {
                        ...createDefaultClusterNodeSet(
                          nextIndex,
                          catalogDefaultHostType,
                          catalogDefaultNodeSetId,
                        ),
                        id: `node-set-${nextIndex}-${Date.now()}`,
                      },
                    ],
                  }
                })
              }
            >
              {CLUSTER_LAUNCH_INSTANCE_DEMO.addNodeSetLabel}
            </Button>
          ) : null}
        </div>
      </Form>
    </div>
  )
  }

  const renderClusterNetworkingStep = () => (
    <div className="tenant-user-launch-wizard__step">
      <Form autoComplete="off" className="tenant-user-launch-wizard__form">
        <div className="tenant-user-launch-wizard__network-section">
          <Content component="h3" className="tenant-user-launch-wizard__network-section-title">
            {CLUSTER_LAUNCH_INSTANCE_DEMO.infrastructureNetworkingTitle}
          </Content>
          <Content component="p" className="tenant-user-launch-wizard__network-section-lede">
            {CLUSTER_LAUNCH_INSTANCE_DEMO.infrastructureNetworkingLede}
          </Content>
          {renderPlacementNetworkingFields('launch-cluster')}
        </div>

        <div className="tenant-user-launch-wizard__network-section">
          <Content component="h3" className="tenant-user-launch-wizard__network-section-title">
            {CLUSTER_LAUNCH_INSTANCE_DEMO.clusterNetworkTitle}
          </Content>
          <Content component="p" className="tenant-user-launch-wizard__network-section-lede">
            {CLUSTER_LAUNCH_INSTANCE_DEMO.clusterNetworkLede}
          </Content>
          <FormGroup label="Pod CIDR" fieldId="launch-cluster-pod-cidr">
            <TextInput
              id="launch-cluster-pod-cidr"
              value={form.podCidr}
              onChange={(_event, value) => setForm((current) => ({ ...current, podCidr: value }))}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>{CLUSTER_LAUNCH_INSTANCE_DEMO.podCidrHelper}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <FormGroup label="Service CIDR" fieldId="launch-cluster-service-cidr">
            <TextInput
              id="launch-cluster-service-cidr"
              value={form.serviceCidr}
              onChange={(_event, value) =>
                setForm((current) => ({ ...current, serviceCidr: value }))
              }
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>{CLUSTER_LAUNCH_INSTANCE_DEMO.serviceCidrHelper}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </div>
      </Form>
    </div>
  )

  const renderConfigureStep = () => (
    <div className="tenant-user-launch-wizard__step">
      <Content component="h2" className="tenant-user-launch-wizard__step-title">
        {LAUNCH_INSTANCE_WIZARD_DEMO.configureTitle}
      </Content>
      <Content component="p" className="tenant-user-launch-wizard__step-lede">
        {LAUNCH_INSTANCE_WIZARD_DEMO.configureLede}
      </Content>

      <Form autoComplete="off" className="tenant-user-launch-wizard__form">
        {renderProjectField('launch-instance-project')}

        <FormGroup label="Instance name" fieldId="launch-instance-name" isRequired>
          <KubernetesResourceNameField
            id="launch-instance-name"
            value={form.instanceName}
            onChange={(value) => setForm((current) => ({ ...current, instanceName: value }))}
            placeholder={getLaunchInstanceNamePlaceholder(catalogItem.serviceId)}
            isRequired
          />
        </FormGroup>

        <FormGroup label="Description" fieldId="launch-instance-description">
          <TextArea
            id="launch-instance-description"
            value={form.description}
            onChange={(_event, value) =>
              setForm((current) => ({ ...current, description: value }))
            }
            aria-label="Description"
            rows={3}
            resizeOrientation="vertical"
          />
        </FormGroup>

        <FormGroup label="SSH public key" fieldId="launch-instance-ssh-key" isRequired>
          <TextArea
            id="launch-instance-ssh-key"
            value={form.sshPublicKey}
            onChange={(_event, value) => setForm((current) => ({ ...current, sshPublicKey: value }))}
            placeholder={LAUNCH_INSTANCE_WIZARD_DEMO.sshPlaceholder}
            resizeOrientation="vertical"
          />
        </FormGroup>

        {renderCatalogOfferingSummary({ includeAssignedNetwork: true })}
      </Form>
    </div>
  )

  const renderNetworkingStep = () => (
    <div className="tenant-user-launch-wizard__step">
      <Content component="h2" className="tenant-user-launch-wizard__step-title">
        {LAUNCH_INSTANCE_WIZARD_DEMO.networkingTitle}
      </Content>
      <Content component="p" className="tenant-user-launch-wizard__step-lede">
        {LAUNCH_INSTANCE_WIZARD_DEMO.networkingLede}
      </Content>

      <Form autoComplete="off" className="tenant-user-launch-wizard__form">
        {networkContext.fields.map((field) => {
          const fieldId = `launch-instance-${field.kind}`
          const selectedId = getSelectedIdForField(field)

          return (
            <FormGroup key={field.kind} label={field.label} fieldId={fieldId} isRequired>
              <FormSelect
                id={fieldId}
                value={selectedId}
                onChange={(_event, value) => updateNetworkSelection(field.kind, value)}
                aria-label={field.label}
              >
                {field.options.map((option) => (
                  <FormSelectOption
                    key={option.id}
                    value={option.id}
                    label={getCatalogOptionLabel(option.name, option.detail)}
                  />
                ))}
              </FormSelect>
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Choose the {field.label.toLowerCase()} for this instance.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          )
        })}
      </Form>
    </div>
  )

  const renderReviewStep = () => {
    const reviewInstanceName =
      isVmCatalogItem || isBareMetalCatalogItem || isClusterCatalogItem
        ? formatTenantInstanceName(form.instanceName.trim())
        : form.instanceName.trim()

    const virtualNetworkLabel =
      networkInventory
        .getVirtualNetworkOptions()
        .find((option) => option.id === networkSelections.virtualNetworkId)?.name ??
      networking.virtualNetwork
    const subnetLabel =
      networkInventory
        .getSubnetOptions(networkSelections.virtualNetworkId)
        .find((option) => option.id === networkSelections.subnetId)?.name ?? networking.subnet
    const securityGroupReviewLabel =
      networkInventory
        .getSecurityGroupOptions()
        .find((option) => option.id === networkSelections.securityGroupId)?.name ??
      securityGroupLabel
    const externalIpPoolReviewLabel =
      networkInventory
        .getExternalIpPoolOptions()
        .find((option) => option.id === networkSelections.externalIpPoolId)?.name ??
      networking.externalIpPool

    const renderReviewRow = (term: string, description: ReactNode) => (
      <DescriptionListGroup key={term}>
        <DescriptionListTerm>{term}</DescriptionListTerm>
        <DescriptionListDescription>{description}</DescriptionListDescription>
      </DescriptionListGroup>
    )

    const renderGeneralStepRows = () => [
      renderReviewRow(launchScopeFieldLabel, launchScopeLabel),
      renderReviewRow('Instance name', reviewInstanceName),
      renderReviewRow('Description', form.description.trim() || '—'),
      renderReviewRow('SSH public key', form.sshPublicKey.trim() || '—'),
      ...(isClusterCatalogItem
        ? [
            renderReviewRow(
              'Pull secret',
              form.pullSecret.trim() ? 'Provided' : '—',
            ),
          ]
        : []),
    ]

    const renderPlacementNetworkingRows = () => [
      renderReviewRow('Virtual network', virtualNetworkLabel),
      renderReviewRow('Subnet', subnetLabel),
      renderReviewRow('Security group', securityGroupReviewLabel),
      renderReviewRow('External IP pool', externalIpPoolReviewLabel),
    ]

    const renderServiceSpecificRows = () => {
      if (isBareMetalCatalogItem) {
        return renderPlacementNetworkingRows()
      }

      if (isVmCatalogItem) {
        return [
          renderReviewRow('OS image', resolvedVmOsImage),
          renderReviewRow('Container disk image', form.containerDiskImage.trim() || '—'),
          renderReviewRow('Instance type', form.instanceType.trim() || '—'),
          renderReviewRow('Boot disk size', `${form.bootDiskSizeGiB} GiB`),
          renderReviewRow('Image source type', form.imageSourceType.trim() || '—'),
          renderReviewRow('Run strategy', form.runStrategy.trim() || '—'),
          ...(form.cloudInitUserData.trim()
            ? [renderReviewRow('Cloud-init user data', form.cloudInitUserData.trim())]
            : []),
          ...renderPlacementNetworkingRows(),
        ]
      }

      if (isClusterCatalogItem) {
        return [
          renderReviewRow(
            'Cluster version',
            formatClusterPlatformLabel(
              form.clusterVersionId || catalogClusterVersion || form.releaseImage,
            ),
          ),
          renderReviewRow('Release image', form.releaseImage.trim() || '—'),
          ...form.nodeSets.map((nodeSet, index) =>
            renderReviewRow(
              `Node set ${index + 1}`,
              `${formatClusterNodeSetLabel(nodeSet.nodeSetId)} · ${formatClusterHostTypeLabel(nodeSet.hostType)} · ${nodeSet.nodeCount} ${nodeSet.nodeCount === 1 ? 'node' : 'nodes'}`,
            ),
          ),
          ...renderPlacementNetworkingRows(),
          renderReviewRow('Pod CIDR', form.podCidr.trim() || '—'),
          renderReviewRow('Service CIDR', form.serviceCidr.trim() || '—'),
        ]
      }

      return [
        renderReviewRow('Catalog item', catalogItem.displayName),
        renderReviewRow('Hardware', catalogItem.hardwareProfile),
        renderReviewRow('GPU', catalogItem.gpu),
        renderReviewRow('OS image', catalogItem.osImage),
        ...(!networkContext.enabled
          ? []
          : [
              renderReviewRow('Network', assignedNetworkSummary),
              renderReviewRow('Security group', securityGroupLabel),
            ]),
      ]
    }

    const reviewRows = [...renderGeneralStepRows(), ...renderServiceSpecificRows()]

    return (
      <div className="tenant-user-launch-wizard__step">
        <Content component="h2" className="tenant-user-launch-wizard__step-title">
          {LAUNCH_INSTANCE_WIZARD_DEMO.reviewTitle}
        </Content>

        <Alert
          variant="info"
          isInline
          title="Provisioning time"
          className="tenant-user-launch-wizard__review-alert"
          customIcon={<InfoCircleIcon />}
        >
          <Content component="p" className="tenant-user-launch-wizard__review-alert-text">
            {LAUNCH_INSTANCE_WIZARD_DEMO.reviewProvisioningNote}
          </Content>
        </Alert>

        {usesGeneralFirstStep ? renderCatalogOfferingSummary() : null}

        <DescriptionList isCompact className="tenant-user-launch-wizard__review-list">
          {reviewRows}
        </DescriptionList>
      </div>
    )
  }

  const renderProvisioningStep = () => (
    <div className="tenant-user-launch-wizard__step tenant-user-launch-wizard__step--provisioning">
      <Content component="h2" className="tenant-user-launch-wizard__step-title">
        {LAUNCH_INSTANCE_WIZARD_DEMO.provisioningTitle}
      </Content>
      <Content component="p" className="tenant-user-launch-wizard__step-lede">
        {LAUNCH_INSTANCE_WIZARD_DEMO.provisioningLede}
      </Content>

      <Alert
        variant="info"
        isInline
        title="You can close this wizard anytime"
        className="tenant-user-launch-wizard__provisioning-alert"
        customIcon={<InfoCircleIcon />}
      >
        <Content component="p">
          Provisioning will continue in the background—check status under{' '}
          {isClusterCatalogItem
            ? 'Clusters'
            : isVmCatalogItem
              ? 'Virtual machines'
              : isBareMetalCatalogItem
                ? 'Bare metal'
                : catalogItem.serviceId === 'models'
                  ? 'Models'
                  : 'Services'}
          .
        </Content>
      </Alert>

      <Card className="tenant-user-launch-wizard__boot-log">
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          className="tenant-user-launch-wizard__boot-log-header"
        >
          <FlexItem>
            <Content component="p" className="tenant-user-launch-wizard__boot-log-title">
              Boot log ·{' '}
              {isVmCatalogItem || isBareMetalCatalogItem || isClusterCatalogItem
                ? formatTenantInstanceName(form.instanceName.trim())
                : form.instanceName.trim()}
            </Content>
          </FlexItem>
          <FlexItem>
            <Content component="p" className="tenant-user-launch-wizard__boot-log-remaining">
              {LAUNCH_INSTANCE_WIZARD_DEMO.bootLogRemaining}
            </Content>
          </FlexItem>
        </Flex>

        <ul className="tenant-user-launch-wizard__boot-log-list">
          {PROVISIONING_BOOT_LOG_STEPS.map((step, index) => {
            const status = getBootLogStatus(index, activeBootLogIndex)

            return (
              <li
                key={step.id}
                className={`tenant-user-launch-wizard__boot-log-item tenant-user-launch-wizard__boot-log-item--${status}`}
              >
                {status === 'completed' ? (
                  <CheckIcon aria-hidden />
                ) : status === 'in-progress' ? (
                  <Spinner
                    size="sm"
                    className="tenant-user-launch-wizard__boot-log-spinner"
                    aria-label="Step in progress"
                  />
                ) : (
                  <span className="tenant-user-launch-wizard__boot-log-bullet" aria-hidden />
                )}
                <span>{step.label}</span>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )

  const renderStepContent = (stepId: LaunchInstanceWizardStepId) => {
    if (isClusterCatalogItem) {
      switch (stepId) {
        case 'general':
          return renderGeneralStep()
        case 'configure':
          return renderClusterConfigureStep()
        case 'networking':
          return renderClusterNetworkingStep()
        case 'review':
          return renderReviewStep()
        case 'provisioning':
          return renderProvisioningStep()
        default:
          return null
      }
    }

    if (isVmCatalogItem) {
      switch (stepId) {
        case 'general':
          return renderGeneralStep()
        case 'configure':
          return renderVmConfigureStep()
        case 'networking':
          return renderVmNetworkingStep()
        case 'review':
          return renderReviewStep()
        case 'provisioning':
          return renderProvisioningStep()
        default:
          return null
      }
    }

    if (isBareMetalCatalogItem) {
      switch (stepId) {
        case 'general':
          return renderGeneralStep()
        case 'networking':
          return renderBareMetalNetworkingStep()
        case 'review':
          return renderReviewStep()
        case 'provisioning':
          return renderProvisioningStep()
        default:
          return null
      }
    }

    switch (stepId) {
      case 'configure':
        return renderConfigureStep()
      case 'networking':
        return renderNetworkingStep()
      case 'review':
        return renderReviewStep()
      case 'provisioning':
        return renderProvisioningStep()
      default:
        return null
    }
  }

  const clusterStepFooter = (stepId: LaunchInstanceWizardStepId) => {
    if (
      stepId === 'general' ||
      stepId === 'configure' ||
      stepId === 'networking' ||
      stepId === 'review'
    ) {
      const isNextDisabled =
        stepId === 'general'
          ? !isClusterGeneralStepValid(form) || !isProjectSelectionValid
          : stepId === 'configure'
            ? !isClusterConfigureStepValid(form)
            : stepId === 'networking'
              ? !isClusterNetworkingStepValid(form)
              : false

      return {
        isNextDisabled,
        nextButtonText:
          stepId === 'review' ? LAUNCH_INSTANCE_WIZARD_DEMO.confirmProvisioningLabel : 'Next',
        backButtonText: 'Back',
        ...(stepId === 'general' ? { isBackDisabled: true } : {}),
        ...(stepId === 'review' ? { isCancelHidden: true } : {}),
      }
    }

    return {
      isCancelHidden: false,
      cancelButtonText: LAUNCH_INSTANCE_WIZARD_DEMO.closeWhileProvisioningLabel,
      isBackHidden: true,
      isNextDisabled: true,
      nextButtonText: isProvisioningComplete ? 'Complete' : 'Provisioning…',
      onClose: handleClose,
    }
  }

  const vmStepFooter = (stepId: LaunchInstanceWizardStepId) => {
    if (
      stepId === 'general' ||
      stepId === 'configure' ||
      stepId === 'networking' ||
      stepId === 'review'
    ) {
      const isNextDisabled =
        stepId === 'general'
          ? !isVmGeneralStepValid(form) || !isProjectSelectionValid
          : stepId === 'configure'
            ? !isVmConfigureStepValid(form)
            : stepId === 'networking'
              ? !isVmNetworkingStepValid(form)
              : false

      return {
        isNextDisabled,
        nextButtonText:
          stepId === 'review' ? LAUNCH_INSTANCE_WIZARD_DEMO.confirmProvisioningLabel : 'Next',
        backButtonText: 'Back',
        ...(stepId === 'general' ? { isBackDisabled: true } : {}),
        ...(stepId === 'review' ? { isCancelHidden: true } : {}),
      }
    }

    return {
      isCancelHidden: false,
      cancelButtonText: LAUNCH_INSTANCE_WIZARD_DEMO.closeWhileProvisioningLabel,
      isBackHidden: true,
      isNextDisabled: true,
      nextButtonText: isProvisioningComplete ? 'Complete' : 'Provisioning…',
      onClose: handleClose,
    }
  }

  const bareMetalStepFooter = (stepId: LaunchInstanceWizardStepId) => {
    if (stepId === 'general' || stepId === 'networking' || stepId === 'review') {
      const isNextDisabled =
        stepId === 'general'
          ? !isBareMetalGeneralStepValid(form) || !isProjectSelectionValid
          : stepId === 'networking'
            ? !isVmNetworkingStepValid(form)
            : false

      return {
        isNextDisabled,
        nextButtonText:
          stepId === 'review' ? LAUNCH_INSTANCE_WIZARD_DEMO.confirmProvisioningLabel : 'Next',
        backButtonText: 'Back',
        ...(stepId === 'general' ? { isBackDisabled: true } : {}),
        ...(stepId === 'review' ? { isCancelHidden: true } : {}),
      }
    }

    return {
      isCancelHidden: false,
      cancelButtonText: LAUNCH_INSTANCE_WIZARD_DEMO.closeWhileProvisioningLabel,
      isBackHidden: true,
      isNextDisabled: true,
      nextButtonText: isProvisioningComplete ? 'Complete' : 'Provisioning…',
      onClose: handleClose,
    }
  }

  const getStepFooter = (stepId: LaunchInstanceWizardStepId) => {
    if (isClusterCatalogItem) {
      return wrapStepFooter(clusterStepFooter(stepId))
    }

    if (isVmCatalogItem) {
      return wrapStepFooter(vmStepFooter(stepId))
    }

    if (isBareMetalCatalogItem) {
      return wrapStepFooter(bareMetalStepFooter(stepId))
    }

    if (stepId === 'configure' || stepId === 'networking') {
      return wrapStepFooter({
        isNextDisabled:
          stepId === 'configure'
            ? !isInstanceNameValid(form.instanceName) ||
              !form.sshPublicKey.trim() ||
              !isProjectSelectionValid
            : false,
        nextButtonText: (
          <span className="tenant-user-launch-wizard__footer-label">
            <span>Continue</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
        ...(stepId === 'networking'
          ? {
              backButtonText: (
                <span className="tenant-user-launch-wizard__footer-label">
                  <ArrowLeftIcon aria-hidden />
                  <span>Back</span>
                </span>
              ),
            }
          : {}),
      })
    }

    if (stepId === 'review') {
      return wrapStepFooter({
        isCancelHidden: true,
        backButtonText: (
          <span className="tenant-user-launch-wizard__footer-label">
            <ArrowLeftIcon aria-hidden />
            <span>Back</span>
          </span>
        ),
        nextButtonText: (
          <span className="tenant-user-launch-wizard__footer-label">
            <span>{LAUNCH_INSTANCE_WIZARD_DEMO.confirmProvisioningLabel}</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
      })
    }

    return wrapStepFooter({
      isCancelHidden: false,
      cancelButtonText: LAUNCH_INSTANCE_WIZARD_DEMO.closeWhileProvisioningLabel,
      isBackHidden: true,
      isNextDisabled: true,
      nextButtonText: isProvisioningComplete ? 'Complete' : 'Provisioning…',
      onClose: handleClose,
    })
  }

  const isPage = presentation === 'page'
  const wizardTitle = isClusterCatalogItem
    ? 'Launch instance for cluster'
    : isVmCatalogItem
      ? 'Launch instance for virtual machine'
      : isBareMetalCatalogItem
        ? 'Launch instance for bare metal'
        : catalogItem.serviceId === 'models'
          ? 'Launch instance for model'
          : 'Launch instance'

  const wizard = isOpen ? (
    <Wizard
      key={`launch-instance-wizard-${catalogItem.serviceId}-${includeNetworkingStep ? 'net' : 'no-net'}`}
      className="tenant-user-launch-wizard"
      height={isPage ? '100%' : '40rem'}
      isPlain={isPage}
      onClose={isPage ? undefined : requestClose}
      onStepChange={(_event, currentStep, prevStep) => {
        const stepId = String(currentStep?.id ?? '').replace('launch-instance-step-', '')
        const previousStepId = String(prevStep?.id ?? '').replace('launch-instance-step-', '')
        // Commit quick-create project when leaving the step that collects it.
        // Do not put this in footer onNext — that overrides Wizard navigation.
        if (
          previousStepId === 'general' ||
          (previousStepId === 'configure' &&
            !isClusterCatalogItem &&
            !isVmCatalogItem &&
            !isBareMetalCatalogItem)
        ) {
          commitPendingProjectIfNeeded()
        }
        if (
          stepId === 'general' ||
          stepId === 'configure' ||
          stepId === 'networking' ||
          stepId === 'review' ||
          stepId === 'provisioning'
        ) {
          setActiveStepId(stepId)
        }
      }}
      header={
        isPage ? undefined : (
          <WizardHeader
            title={wizardTitle}
            titleId="launch-instance-wizard-title"
            description={activeStepDescription || undefined}
            onClose={requestClose}
            closeButtonAriaLabel="Close launch instance wizard"
          />
        )
      }
    >
      {wizardSteps.map((step) => (
        <WizardStep
          key={step.id}
          name={step.label}
          id={`launch-instance-step-${step.id}`}
          footer={getStepFooter(step.id)}
        >
          {renderStepContent(step.id)}
        </WizardStep>
      ))}
    </Wizard>
  ) : null

  if (isPage) {
    if (!isOpen) {
      return null
    }
    return (
      <>
        <CatalogWizardPageShell
          title={wizardTitle}
          description={activeStepDescription || undefined}
          onBackToCatalog={requestClose}
        >
          {wizard}
        </CatalogWizardPageShell>
        {leaveConfirmModal}
      </>
    )
  }

  return (
    <>
      <Modal
        variant={ModalVariant.medium}
        width="64rem"
        maxWidth="64rem"
        isOpen={isOpen}
        onEscapePress={requestClose}
        aria-labelledby="launch-instance-wizard-title"
        className="tenant-user-launch-wizard__modal"
      >
        {wizard}
      </Modal>
      {leaveConfirmModal}
    </>
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
