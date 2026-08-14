import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import { CatalogIcon } from '@patternfly/react-icons/dist/esm/icons/catalog-icon'
import { LockIcon } from '@patternfly/react-icons/dist/esm/icons/lock-icon'
import { MinusIcon } from '@patternfly/react-icons/dist/esm/icons/minus-icon'
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons/dist/esm/icons/outlined-question-circle-icon'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import { UnlockIcon } from '@patternfly/react-icons/dist/esm/icons/unlock-icon'
import {
  Alert,
  Button,
  Card,
  CardBody,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  ExpandableSection,
  ExpandableSectionToggle,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Icon,
  InputGroup,
  InputGroupItem,
  Label,
  List,
  ListComponent,
  ListItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Spinner,
  TextArea,
  TextInput,
  Title,
  Tooltip,
  Wizard,
  WizardHeader,
  WizardStep,
} from '@patternfly/react-core'
import { CatalogPublishScopeIcon } from '../../components/provider-admin/CatalogPublishScopeIcon'
import { CatalogEditChangesSummary } from '../../components/provider-admin/CatalogEditChangesSummary'
import { CatalogEditPreviousValue } from '../../components/provider-admin/CatalogEditPreviousValue'
import { CatalogWizardPageShell } from '../../components/catalog/CatalogWizardPageShell'
import {
  formatVipEnterpriseVisibilityLabel,
  getCatalogEnterpriseTenantIds,
  normalizeEnterpriseTenantIds,
  VipEnterpriseOrganizationField,
} from '../../components/provider-admin/VipEnterpriseOrganizationField'
import { KubernetesResourceNameField } from '../../components/shared/KubernetesResourceNameHelper'
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'
import {
  buildCustomInstanceTypeOption,
  buildDefaultCatalogFieldPolicies,
  CATALOG_GPU_ACCELERATOR_OPTIONS,
  DEFAULT_CLUSTER_HOST_TYPE_ID,
  DEFAULT_CLUSTER_NODE_SET_ID,
  formatClusterHostTypeLabel,
  formatClusterNodeSetLabel,
  formatClusterPlatformLabel,
  formatCustomInstanceTypeLabel,
  getCatalogClusterHostTypeOptions,
  getCatalogClusterNodeSetOptions,
  getCatalogClusterNodeTopologyModeLabel,
  getCatalogClusterVersionLifecycleMeta,
  getCatalogClusterVersionModeLabel,
  getCatalogClusterVersionOptions,
  getLatestCatalogClusterVersionId,
  getCatalogDiskImageOptions,
  getCatalogInstanceTypeOptions,
  getDefaultCustomInstanceTypeConfig,
  getProvisioningTemplatePresentation,
  isCustomInstanceTypeId,
  isValidCustomInstanceTypeConfig,
  resolveCatalogClusterNodeTopologyMode,
  resolveCatalogClusterVersionMode,
  type CatalogClusterNodeTopologyMode,
  type CatalogClusterVersionMode,
  type CatalogClusterVersionOption,
  type CatalogFieldPolicy,
  type CustomInstanceTypeConfig,
} from '../../catalog/catalogPublishConfig'
import {
  buildCatalogEditSnapshotFromWizardState,
  getCatalogEditChanges,
  getCatalogEditModifiedStepIds,
  getCatalogEditPreviousValue,
  type CatalogEditSnapshot,
} from '../../catalog/catalogEditDiff'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import { DEFAULT_CATALOG_NETWORK_POLICY } from '../../providerAdmin/catalogNetworkPolicy'
import { isValidKubernetesResourceName } from '../../shared/kubernetesResourceName'
import {
  CATALOG_SERVICE_OFFERINGS,
  getCatalogServiceOffering,
  getPublishCatalogSuggestedDisplayName,
  getPublishCatalogSuggestedDescription,
  formatRateCardSummary,
  resolveRateCard,
  PUBLISH_CATALOG_STEPS,
  type CatalogServiceId,
  type PublishCatalogScope,
  type PublishedTemplatePayload,
  type SavedMasterTemplate,
} from '../../providerSetup/templateDemo'
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import { getCatalogItemStatus } from '../../providerSetup/storage'

type ProviderSetupPublishCatalogWizardProps = {
  isOpen: boolean
  mode?: 'create' | 'edit'
  /** Required when `mode` is `edit`. */
  editingCatalog?: ProviderCatalogDraft | null
  /** `page` replaces the catalog landing (breadcrumb back to Catalog). Default `modal`. */
  presentation?: 'modal' | 'page'
  templates: SavedMasterTemplate[]
  organizations: RegisteredOrganization[]
  defaultTemplateRefId?: string
  /**
   * Optional Name step override. Prefer service-specific suggestions from
   * `getPublishCatalogSuggestedDisplayName` when omitted.
   */
  defaultDisplayName?: string
  /** Resume VIP after registering an organization. */
  initialPublishScope?: PublishCatalogScope
  initialEnterpriseTenantId?: string
  /** Primary action label for the leave-without-saving confirm modal. */
  leaveConfirmActionLabel?: string
  onClose: () => void
  onCreateCatalogItem: (payload: PublishedTemplatePayload) => void
  onSaveCatalogItem?: (catalogItemId: string, payload: PublishedTemplatePayload) => void
  onRegisterOrganization?: () => void
  isPublishing?: boolean
  isSaving?: boolean
}

function CustomHardwareUnitNumberInput({
  id,
  value,
  min,
  max,
  unit,
  onValueChange,
  inputAriaLabel,
  minusBtnAriaLabel,
  plusBtnAriaLabel,
}: {
  id: string
  value: number
  min: number
  max: number
  unit: string
  onValueChange: (value: number) => void
  inputAriaLabel: string
  minusBtnAriaLabel: string
  plusBtnAriaLabel: string
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next)))
  const unitId = `${id}-unit`

  return (
    <InputGroup className="provider-setup-template__custom-unit-input">
      <InputGroupItem>
        <Button
          variant="control"
          aria-label={minusBtnAriaLabel}
          onClick={() => onValueChange(clamp(value - 1))}
          isDisabled={value <= min}
          icon={<MinusIcon />}
        />
      </InputGroupItem>
      <InputGroupItem isFill>
        <div className="provider-setup-template__custom-unit-field">
          <TextInput
            id={id}
            type="number"
            value={value}
            min={min}
            max={max}
            onChange={(_event, nextValue) => {
              const next = Number(nextValue)
              if (Number.isNaN(next)) {
                return
              }
              onValueChange(clamp(next))
            }}
            aria-label={inputAriaLabel}
            aria-describedby={unitId}
          />
          <span id={unitId} className="provider-setup-template__custom-unit-field__suffix">
            {unit}
          </span>
        </div>
      </InputGroupItem>
      <InputGroupItem>
        <Button
          variant="control"
          aria-label={plusBtnAriaLabel}
          onClick={() => onValueChange(clamp(value + 1))}
          isDisabled={value >= max}
          icon={<PlusIcon />}
        />
      </InputGroupItem>
    </InputGroup>
  )
}

export function ProviderSetupPublishCatalogWizard({
  isOpen,
  mode = 'create',
  editingCatalog = null,
  presentation = 'modal',
  templates,
  organizations,
  defaultTemplateRefId,
  defaultDisplayName,
  initialPublishScope = 'global-public',
  initialEnterpriseTenantId = '',
  leaveConfirmActionLabel,
  onClose,
  onCreateCatalogItem,
  onSaveCatalogItem,
  onRegisterOrganization,
  isPublishing = false,
  isSaving = false,
}: ProviderSetupPublishCatalogWizardProps) {
  const isEditMode = mode === 'edit'
  const isSubmitting = isPublishing || isSaving
  const skipNextServiceHardwareResetRef = useRef(false)
  const hydratedEditServiceIdRef = useRef<CatalogServiceId | null>(null)
  const editBaselineCapturedRef = useRef(false)
  const [selectedServiceId, setSelectedServiceId] = useState<CatalogServiceId | null>('baremetal')
  const [selectedTemplateRefId, setSelectedTemplateRefId] = useState('')
  const [selectedInstanceTypeId, setSelectedInstanceTypeId] = useState('')
  const [customInstanceType, setCustomInstanceType] = useState<CustomInstanceTypeConfig>(
    () => getDefaultCustomInstanceTypeConfig('baremetal'),
  )
  const [selectedDiskImageId, setSelectedDiskImageId] = useState('')
  const [clusterVersionMode, setClusterVersionMode] =
    useState<CatalogClusterVersionMode>('locked')
  const [selectedNodeSetId, setSelectedNodeSetId] = useState(DEFAULT_CLUSTER_NODE_SET_ID)
  const [selectedHostTypeId, setSelectedHostTypeId] = useState(DEFAULT_CLUSTER_HOST_TYPE_ID)
  const [clusterNodeTopologyMode, setClusterNodeTopologyMode] =
    useState<CatalogClusterNodeTopologyMode>('locked')
  const [fieldPolicies, setFieldPolicies] = useState<CatalogFieldPolicy[]>([])
  const [expandedClusterVersionIds, setExpandedClusterVersionIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [publishScope, setPublishScope] = useState<PublishCatalogScope>('global-public')
  const [enterpriseTenantIds, setEnterpriseTenantIds] = useState<string[]>([])
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false)
  const [editBaseline, setEditBaseline] = useState<CatalogEditSnapshot | null>(null)

  const selectedTemplate =
    templates.find((template) => template.templateRefId === selectedTemplateRefId) ?? null
  const instanceTypeOptions = useMemo(
    () => getCatalogInstanceTypeOptions(selectedServiceId),
    [selectedServiceId],
  )
  const isClusterService = selectedServiceId === 'cluster'
  const softwareImageOptions = useMemo(
    () =>
      isClusterService ? getCatalogClusterVersionOptions() : getCatalogDiskImageOptions(),
    [isClusterService],
  )
  const selectedInstanceType = useMemo(() => {
    if (isCustomInstanceTypeId(selectedInstanceTypeId)) {
      return isValidCustomInstanceTypeConfig(customInstanceType)
        ? buildCustomInstanceTypeOption(customInstanceType)
        : null
    }

    return instanceTypeOptions.find((option) => option.id === selectedInstanceTypeId) ?? null
  }, [customInstanceType, instanceTypeOptions, selectedInstanceTypeId])
  const selectedInstanceTypeLabel = useMemo(() => {
    if (!selectedInstanceType) {
      return ''
    }
    if (isCustomInstanceTypeId(selectedInstanceType.id)) {
      return formatCustomInstanceTypeLabel(customInstanceType)
    }
    return selectedInstanceType.accelerator
      ? `${selectedInstanceType.label} (${selectedInstanceType.detail} · ${selectedInstanceType.accelerator})`
      : `${selectedInstanceType.label} (${selectedInstanceType.detail})`
  }, [customInstanceType, selectedInstanceType])
  const isCustomInstanceTypeSelected = isCustomInstanceTypeId(selectedInstanceTypeId)
  const instanceTypeCards = useMemo(
    () =>
      instanceTypeOptions.map((option) =>
        isCustomInstanceTypeId(option.id)
          ? buildCustomInstanceTypeOption(customInstanceType)
          : option,
      ),
    [customInstanceType, instanceTypeOptions],
  )
  const selectedDiskImage =
    softwareImageOptions.find((option) => option.id === selectedDiskImageId) ?? null
  const selectedClusterVersionLifecycleMeta =
    isClusterService && selectedDiskImage && 'lifecycle' in selectedDiskImage
      ? getCatalogClusterVersionLifecycleMeta(
          (selectedDiskImage as CatalogClusterVersionOption).lifecycle,
        )
      : null
  const softwareImageStepLabel = isClusterService ? 'Cluster version' : 'Disk image'
  const hardwareOsStepLabel = isClusterService ? 'Cluster version' : 'Hardware & OS'
  const latestClusterVersionId = isClusterService ? getLatestCatalogClusterVersionId() : ''
  const isVipEnterprise = publishScope === 'vip-enterprise'
  const selectedVipOrganizations = useMemo(
    () =>
      organizations.filter((organization) =>
        enterpriseTenantIds.includes(organization.tenantId),
      ),
    [organizations, enterpriseTenantIds],
  )
  const isVipUnassigned = isVipEnterprise && enterpriseTenantIds.length === 0
  const currentDiskImageLabel = selectedDiskImage
    ? isClusterService
      ? formatClusterPlatformLabel(selectedDiskImage.id)
      : selectedDiskImage.label
    : ''
  const currentEditSnapshot = useMemo(() => {
    if (!isEditMode) {
      return null
    }

    return buildCatalogEditSnapshotFromWizardState(
      {
        serviceId: selectedServiceId,
        templateRefId: selectedTemplateRefId,
        displayName: displayName.trim(),
        description: description.trim(),
        instanceTypeId: selectedInstanceTypeId,
        instanceTypeLabel: selectedInstanceTypeLabel,
        diskImageId: selectedDiskImageId,
        diskImageLabel: currentDiskImageLabel,
        clusterVersionMode,
        nodeSetId: selectedNodeSetId,
        hostTypeId: selectedHostTypeId,
        clusterNodeTopologyMode,
        fieldPolicies,
        publishScope,
        enterpriseTenantIds,
      },
      templates,
      organizations,
    )
  }, [
    clusterNodeTopologyMode,
    clusterVersionMode,
    currentDiskImageLabel,
    description,
    displayName,
    enterpriseTenantIds,
    fieldPolicies,
    isEditMode,
    organizations,
    publishScope,
    selectedDiskImageId,
    selectedHostTypeId,
    selectedInstanceTypeId,
    selectedInstanceTypeLabel,
    selectedNodeSetId,
    selectedServiceId,
    selectedTemplateRefId,
    templates,
  ])
  const editChanges = useMemo(() => {
    if (!isEditMode || !editBaseline || !currentEditSnapshot) {
      return []
    }

    return getCatalogEditChanges(editBaseline, currentEditSnapshot).filter(
      (change) => !isEditMode || change.id !== 'service',
    )
  }, [currentEditSnapshot, editBaseline, isEditMode])
  const modifiedStepIds = useMemo(
    () => getCatalogEditModifiedStepIds(editChanges),
    [editChanges],
  )
  const editPrevious = (fieldId: keyof CatalogEditSnapshot) =>
    getCatalogEditPreviousValue(editBaseline, fieldId, currentEditSnapshot)
  const isEditingLiveCatalog =
    isEditMode && editingCatalog ? getCatalogItemStatus(editingCatalog) === 'live' : false
  const canCreateCatalogItem =
    Boolean(selectedServiceId) &&
    Boolean(selectedTemplate) &&
    Boolean(selectedInstanceType) &&
    Boolean(selectedDiskImage) &&
    (!isClusterService || (Boolean(selectedNodeSetId) && Boolean(selectedHostTypeId))) &&
    isValidKubernetesResourceName(displayName)
  const canSaveCatalogEdit = canCreateCatalogItem && (!isEditMode || editChanges.length > 0)
  const hasLockableParameters = fieldPolicies.length > 0
  const hasSingleTemplate = templates.length <= 1
  const publishSteps = useMemo(
    () =>
      PUBLISH_CATALOG_STEPS.filter((step) => {
        if (step.id === 'template' && hasSingleTemplate) {
          return false
        }
        if (step.id === 'node-topology' && !isClusterService) {
          return false
        }
        if (step.id === 'field-policies' && !hasLockableParameters) {
          return false
        }
        return true
      }).map((step) =>
        step.id === 'hardware-os' ? { ...step, label: hardwareOsStepLabel } : step,
      ),
    [hasLockableParameters, hasSingleTemplate, hardwareOsStepLabel, isClusterService],
  )

  const selectVipEnterprise = () => {
    setPublishScope('vip-enterprise')
    setEnterpriseTenantIds((current) => {
      const validCurrent = current.filter((tenantId) =>
        organizations.some((organization) => organization.tenantId === tenantId),
      )
      if (validCurrent.length > 0) {
        return validCurrent
      }
      return organizations[0]?.tenantId ? [organizations[0].tenantId] : []
    })
  }

  const resetWizard = () => {
    setSelectedServiceId(null)
    setSelectedTemplateRefId('')
    setSelectedInstanceTypeId('')
    setCustomInstanceType(getDefaultCustomInstanceTypeConfig(null))
    setSelectedDiskImageId('')
    setClusterVersionMode('locked')
    setSelectedNodeSetId(DEFAULT_CLUSTER_NODE_SET_ID)
    setSelectedHostTypeId(DEFAULT_CLUSTER_HOST_TYPE_ID)
    setClusterNodeTopologyMode('locked')
    setFieldPolicies([])
    setExpandedClusterVersionIds(new Set())
    setDisplayName('')
    setDescription('')
    setPublishScope('global-public')
    setEnterpriseTenantIds([])
  }

  const handleClose = () => {
    resetWizard()
    onClose()
  }

  const requestClose = () => {
    if (isSubmitting) {
      return
    }
    setIsLeaveConfirmOpen(true)
  }

  const closeLeaveConfirm = () => {
    setIsLeaveConfirmOpen(false)
  }

  const confirmLeave = () => {
    setIsLeaveConfirmOpen(false)
    handleClose()
  }

  const leaveConfirmPrimaryLabel =
    leaveConfirmActionLabel ?? (isEditMode ? 'Leave without saving' : 'Go to Catalog')

  const leaveConfirmModal = (
    <Modal
      variant={ModalVariant.small}
      isOpen={isLeaveConfirmOpen}
      onClose={closeLeaveConfirm}
      aria-labelledby="publish-catalog-leave-title"
      aria-describedby="publish-catalog-leave-description"
    >
      <ModalHeader
        title="Are you sure?"
        titleIconVariant="warning"
        labelId="publish-catalog-leave-title"
      />
      <ModalBody>
        <Content component="p" id="publish-catalog-leave-description">
          Your progress will not be saved.
        </Content>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={confirmLeave}>
          {leaveConfirmPrimaryLabel}
        </Button>
        <Button variant="link" onClick={closeLeaveConfirm}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )

  const hydrateWizardStateFromCatalog = (catalog: ProviderCatalogDraft) => {
    const serviceId = catalog.serviceId ?? 'baremetal'
    hydratedEditServiceIdRef.current = serviceId
    const preferredTemplate =
      templates.find((template) => template.templateRefId === catalog.templateRefId) ??
      templates[0] ??
      null

    setSelectedServiceId(serviceId)
    setSelectedTemplateRefId(preferredTemplate?.templateRefId ?? catalog.templateRefId)
    setDisplayName(catalog.displayName)
    setDescription(catalog.description ?? '')
    setPublishScope(catalog.scope)

    const preferredTenantIds = getCatalogEnterpriseTenantIds(catalog).filter((tenantId) =>
      organizations.some((organization) => organization.tenantId === tenantId),
    )
    if (catalog.scope === 'vip-enterprise') {
      const resumeTenantIds = normalizeEnterpriseTenantIds(initialEnterpriseTenantId).filter(
        (tenantId) => organizations.some((organization) => organization.tenantId === tenantId),
      )
      setEnterpriseTenantIds(
        resumeTenantIds.length > 0
          ? resumeTenantIds
          : preferredTenantIds.length > 0
            ? preferredTenantIds
            : organizations[0]?.tenantId
              ? [organizations[0].tenantId]
              : [],
      )
    } else {
      setEnterpriseTenantIds([])
    }

    if (catalog.instanceTypeId) {
      setSelectedInstanceTypeId(catalog.instanceTypeId)
      if (isCustomInstanceTypeId(catalog.instanceTypeId)) {
        setCustomInstanceType(getDefaultCustomInstanceTypeConfig(serviceId))
      }
    } else {
      const nextInstanceOptions = getCatalogInstanceTypeOptions(serviceId)
      setSelectedInstanceTypeId(nextInstanceOptions[0]?.id ?? '')
    }

    if (catalog.diskImageId) {
      setSelectedDiskImageId(catalog.diskImageId)
    } else {
      const nextSoftwareOptions =
        serviceId === 'cluster'
          ? getCatalogClusterVersionOptions()
          : getCatalogDiskImageOptions()
      setSelectedDiskImageId(nextSoftwareOptions[0]?.id ?? '')
    }
    setClusterVersionMode(catalog.clusterVersionMode ?? 'locked')
    setSelectedNodeSetId(catalog.nodeSetId ?? DEFAULT_CLUSTER_NODE_SET_ID)
    setSelectedHostTypeId(catalog.hostTypeId ?? DEFAULT_CLUSTER_HOST_TYPE_ID)
    setClusterNodeTopologyMode(catalog.clusterNodeTopologyMode ?? 'locked')
    setFieldPolicies(catalog.fieldPolicies ?? [])
    setExpandedClusterVersionIds(new Set())
  }

  useEffect(() => {
    if (!isOpen) {
      resetWizard()
      setEditBaseline(null)
      editBaselineCapturedRef.current = false
      hydratedEditServiceIdRef.current = null
      return
    }

    if (isEditMode && editingCatalog) {
      skipNextServiceHardwareResetRef.current = true
      hydrateWizardStateFromCatalog(editingCatalog)
      return
    }

    setEditBaseline(null)

    const preferredTemplate =
      templates.find((template) => template.templateRefId === defaultTemplateRefId) ??
      templates[0] ??
      null

    if (preferredTemplate) {
      setSelectedTemplateRefId(preferredTemplate.templateRefId)
    }

    setSelectedServiceId('baremetal')
    setDisplayName(defaultDisplayName ?? getPublishCatalogSuggestedDisplayName('baremetal'))
    setDescription(getPublishCatalogSuggestedDescription('baremetal'))
    setPublishScope(initialPublishScope)
    if (initialPublishScope === 'vip-enterprise') {
      const preferredTenantIds = normalizeEnterpriseTenantIds(initialEnterpriseTenantId).filter(
        (tenantId) => organizations.some((organization) => organization.tenantId === tenantId),
      )
      setEnterpriseTenantIds(
        preferredTenantIds.length > 0
          ? preferredTenantIds
          : organizations[0]?.tenantId
            ? [organizations[0].tenantId]
            : [],
      )
    } else {
      setEnterpriseTenantIds([])
    }
    // Initialize only when the wizard opens; resume props are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open-only init
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || publishScope !== 'vip-enterprise' || enterpriseTenantIds.length > 0) {
      return
    }

    const firstOrganization = organizations[0]
    if (firstOrganization) {
      setEnterpriseTenantIds([firstOrganization.tenantId])
    }
  }, [isOpen, organizations, publishScope, enterpriseTenantIds])

  useEffect(() => {
    if (!selectedServiceId || isEditMode) {
      return
    }

    // Keep Name and Description aligned with the chosen service.
    setDisplayName(getPublishCatalogSuggestedDisplayName(selectedServiceId))
    setDescription(getPublishCatalogSuggestedDescription(selectedServiceId))
  }, [isEditMode, selectedServiceId])

  useEffect(() => {
    if (!selectedServiceId) {
      setSelectedInstanceTypeId('')
      setSelectedDiskImageId('')
      setClusterVersionMode('locked')
      setSelectedNodeSetId(DEFAULT_CLUSTER_NODE_SET_ID)
      setSelectedHostTypeId(DEFAULT_CLUSTER_HOST_TYPE_ID)
      setClusterNodeTopologyMode('locked')
      setFieldPolicies([])
      return
    }

    if (skipNextServiceHardwareResetRef.current) {
      if (
        isEditMode &&
        hydratedEditServiceIdRef.current &&
        selectedServiceId !== hydratedEditServiceIdRef.current
      ) {
        return
      }

      skipNextServiceHardwareResetRef.current = false
      hydratedEditServiceIdRef.current = null
      return
    }

    const nextInstanceOptions = getCatalogInstanceTypeOptions(selectedServiceId)
    const nextSoftwareOptions =
      selectedServiceId === 'cluster'
        ? getCatalogClusterVersionOptions()
        : getCatalogDiskImageOptions()
    setSelectedInstanceTypeId(nextInstanceOptions[0]?.id ?? '')
    setCustomInstanceType(getDefaultCustomInstanceTypeConfig(selectedServiceId))
    setSelectedDiskImageId(nextSoftwareOptions[0]?.id ?? '')
    setClusterVersionMode('locked')
    setSelectedNodeSetId(DEFAULT_CLUSTER_NODE_SET_ID)
    setSelectedHostTypeId(DEFAULT_CLUSTER_HOST_TYPE_ID)
    setClusterNodeTopologyMode('locked')
  }, [isEditMode, selectedServiceId])

  useEffect(() => {
    if (!selectedServiceId || !selectedTemplate) {
      setFieldPolicies([])
      return
    }

    const provisionerParameters = getProvisioningTemplatePresentation(
      selectedTemplate,
      selectedServiceId,
    ).parameters

    setFieldPolicies((current) => {
      const defaults = buildDefaultCatalogFieldPolicies({ provisionerParameters })

      if (current.length === 0) {
        return defaults
      }

      return defaults.map((policy) => {
        const existing = current.find((entry) => entry.id === policy.id)
        if (!existing) {
          return policy
        }

        return { ...policy, mode: existing.mode, defaultValue: existing.defaultValue }
      })
    })
  }, [selectedServiceId, selectedTemplate?.templateRefId])

  useEffect(() => {
    if (!isOpen || !isEditMode || !editingCatalog || editBaselineCapturedRef.current) {
      return
    }

    if (!selectedServiceId || !selectedTemplateRefId || !currentEditSnapshot) {
      return
    }

    if (selectedServiceId === 'cluster') {
      if (!selectedDiskImageId || !selectedNodeSetId || !selectedHostTypeId) {
        return
      }
    } else if (!selectedInstanceTypeId || !selectedDiskImageId) {
      return
    }

    const storedPolicies = editingCatalog.fieldPolicies ?? []
    const provisionerParameters = selectedTemplate
      ? getProvisioningTemplatePresentation(selectedTemplate, selectedServiceId).parameters
      : []
    const expectedDefaultPolicies = buildDefaultCatalogFieldPolicies({ provisionerParameters })
    if (
      expectedDefaultPolicies.length > 0 &&
      fieldPolicies.length === 0 &&
      storedPolicies.length === 0
    ) {
      return
    }

    setEditBaseline(currentEditSnapshot)
    editBaselineCapturedRef.current = true
  }, [
    currentEditSnapshot,
    editingCatalog,
    fieldPolicies,
    isEditMode,
    isOpen,
    selectedDiskImageId,
    selectedHostTypeId,
    selectedInstanceTypeId,
    selectedNodeSetId,
    selectedServiceId,
    selectedTemplate,
    selectedTemplateRefId,
  ])

  const buildCatalogItemPayload = (): PublishedTemplatePayload | null => {
    if (
      !canCreateCatalogItem ||
      !selectedServiceId ||
      !selectedTemplate ||
      !selectedInstanceType ||
      !selectedDiskImage
    ) {
      return null
    }

    const vipOrganizationIds = selectedVipOrganizations.map((organization) => organization.id)

    return {
      serviceId: selectedServiceId,
      templateRefId: selectedTemplate.templateRefId,
      templateName: selectedTemplate.templateName,
      displayName: displayName.trim(),
      description: description.trim(),
      scope: publishScope,
      rateCard: resolveRateCard(selectedTemplate),
      instanceTypeId: selectedInstanceType.id,
      instanceTypeLabel: selectedInstanceTypeLabel,
      diskImageId: selectedDiskImage.id,
      diskImageLabel: isClusterService
        ? formatClusterPlatformLabel(selectedDiskImage.id)
        : selectedDiskImage.label,
      ...(isClusterService
        ? {
            clusterVersionMode: resolveCatalogClusterVersionMode(clusterVersionMode),
            nodeSetId: selectedNodeSetId,
            nodeSetLabel: formatClusterNodeSetLabel(selectedNodeSetId),
            hostTypeId: selectedHostTypeId,
            hostTypeLabel: formatClusterHostTypeLabel(selectedHostTypeId),
            clusterNodeTopologyMode: resolveCatalogClusterNodeTopologyMode(
              clusterNodeTopologyMode,
            ),
          }
        : {}),
      fieldPolicies,
      networkPolicy: {
        ...DEFAULT_CATALOG_NETWORK_POLICY,
        virtualNetwork: { ...DEFAULT_CATALOG_NETWORK_POLICY.virtualNetwork },
        subnet: { ...DEFAULT_CATALOG_NETWORK_POLICY.subnet },
        securityGroup: { ...DEFAULT_CATALOG_NETWORK_POLICY.securityGroup },
        externalIpPool: { ...DEFAULT_CATALOG_NETWORK_POLICY.externalIpPool },
      },
      ...(isVipEnterprise && enterpriseTenantIds.length > 0
        ? {
            enterpriseTenantId: enterpriseTenantIds[0],
            enterpriseTenantIds,
          }
        : {}),
      ...(vipOrganizationIds.length > 0
        ? {
            vipOrganizationId: vipOrganizationIds[0],
            vipOrganizationIds,
          }
        : {}),
    }
  }

  const handleCreateCatalogItem = () => {
    const payload = buildCatalogItemPayload()
    if (!payload) {
      return
    }

    onCreateCatalogItem({
      ...payload,
      status: 'unpublished',
    })
  }

  const handleSaveCatalogItem = () => {
    if (!editingCatalog || !onSaveCatalogItem || !canSaveCatalogEdit) {
      return
    }

    const payload = buildCatalogItemPayload()
    if (!payload) {
      return
    }

    onSaveCatalogItem(editingCatalog.catalogItemId, payload)
  }

  const toggleFieldPolicyMode = (policyId: string) => {
    setFieldPolicies((current) =>
      current.map((policy) =>
        policy.id === policyId
          ? { ...policy, mode: policy.mode === 'exposed' ? 'locked' : 'exposed' }
          : policy,
      ),
    )
  }

  const updateFieldPolicyValue = (policyId: string, defaultValue: string) => {
    setFieldPolicies((current) =>
      current.map((policy) =>
        policy.id === policyId ? { ...policy, defaultValue } : policy,
      ),
    )
  }

  function renderStepContent(stepId: (typeof PUBLISH_CATALOG_STEPS)[number]['id']) {
    switch (stepId) {
      case 'service': {
        const selectedService = selectedServiceId
          ? getCatalogServiceOffering(selectedServiceId)
          : null

        return (
          <div className="provider-setup-template__publish-service-step">
            <Content component="p" className="provider-setup-template__publish-step-lede">
              {isEditMode
                ? 'Service is fixed for this catalog item and cannot be changed.'
                : 'Choose the service this catalog item belongs to.'}
            </Content>
            {isEditMode && selectedService ? (
              <Card
                className="provider-setup-template__service-card provider-setup-template__service-card--readonly"
                aria-labelledby={`publish-catalog-service-${selectedService.id}-title`}
              >
                <CardBody className="provider-setup-template__service-card-body">
                  <Label
                    color="grey"
                    isCompact
                    className="provider-setup-template__service-card-badge"
                  >
                    In use
                  </Label>
                  <div className="provider-setup-template__service-card-icon-wrap">
                    <Icon size="lg">{getCatalogServiceIcon(selectedService.id)}</Icon>
                  </div>
                  <Title
                    id={`publish-catalog-service-${selectedService.id}-title`}
                    headingLevel="h3"
                    size="md"
                    className="provider-setup-template__service-card-title"
                  >
                    {selectedService.title}
                  </Title>
                  <Content
                    component="p"
                    className="provider-setup-template__service-card-description"
                  >
                    {selectedService.description}
                  </Content>
                </CardBody>
              </Card>
            ) : (
              <>
                <CatalogEditPreviousValue previous={editPrevious('service')} />
                <div
                  className="provider-setup-template__service-cards"
                  role="radiogroup"
                  aria-label="Catalog service"
                >
                  {CATALOG_SERVICE_OFFERINGS.map((service) => {
                    const isSelected = selectedServiceId === service.id
                    const titleId = `publish-catalog-service-${service.id}-title`

                    return (
                      <Card
                        key={service.id}
                        isSelectable
                        isSelected={isSelected}
                        className="provider-setup-template__service-card"
                        aria-labelledby={titleId}
                        onClick={() => setSelectedServiceId(service.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setSelectedServiceId(service.id)
                          }
                        }}
                      >
                        <CardBody className="provider-setup-template__service-card-body">
                          {isSelected ? (
                            <Label
                              color="grey"
                              isCompact
                              className="provider-setup-template__service-card-badge"
                            >
                              Selected
                            </Label>
                          ) : null}
                          <div className="provider-setup-template__service-card-icon-wrap">
                            <Icon size="lg">{getCatalogServiceIcon(service.id)}</Icon>
                          </div>
                          <Title
                            id={titleId}
                            headingLevel="h3"
                            size="md"
                            className="provider-setup-template__service-card-title"
                          >
                            {service.title}
                          </Title>
                          <Content
                            component="p"
                            className="provider-setup-template__service-card-description"
                          >
                            {service.description}
                          </Content>
                        </CardBody>
                      </Card>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )
      }
      case 'template':
        return (
          <div className="provider-setup-template__publish-template-step">
            <Content component="p" className="provider-setup-template__publish-step-lede">
              {hasSingleTemplate
                ? 'This offering uses your saved template.'
                : 'Choose the template that defines how this offering is provisioned.'}
            </Content>
            <CatalogEditPreviousValue previous={editPrevious('template')} />
            <div
              className="provider-setup-template__card-group"
              role={hasSingleTemplate ? undefined : 'radiogroup'}
              aria-label="Template"
            >
              {templates.map((template) => {
                const isSelected = template.templateRefId === selectedTemplateRefId
                const presentation = getProvisioningTemplatePresentation(
                  template,
                  selectedServiceId,
                )

                return (
                  <div
                    key={template.templateRefId}
                    role={hasSingleTemplate ? undefined : 'radio'}
                    tabIndex={hasSingleTemplate ? undefined : 0}
                    aria-checked={hasSingleTemplate ? undefined : isSelected}
                    className={`provider-setup-template__select-card provider-setup-template__select-card--template${
                      isSelected ? ' provider-setup-template__select-card--selected' : ''
                    }${hasSingleTemplate ? ' provider-setup-template__select-card--static' : ''}`}
                    onClick={
                      hasSingleTemplate
                        ? undefined
                        : () => setSelectedTemplateRefId(template.templateRefId)
                    }
                    onKeyDown={
                      hasSingleTemplate
                        ? undefined
                        : (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              setSelectedTemplateRefId(template.templateRefId)
                            }
                          }
                    }
                  >
                    <div className="provider-setup-template__select-card-header">
                      <Label color="green" isCompact className="provider-setup-template__select-card-badge">
                        Saved
                      </Label>
                      {isSelected ? (
                        <Label
                          color="grey"
                          isCompact
                          className="provider-setup-template__select-card-selected-badge"
                        >
                          {hasSingleTemplate ? 'In use' : 'Selected'}
                        </Label>
                      ) : null}
                    </div>
                    <Title
                      headingLevel="h3"
                      size="md"
                      className="provider-setup-template__select-card-title"
                    >
                      {presentation.title}
                    </Title>
                    <Content component="p" className="provider-setup-template__select-card-detail">
                      {presentation.description}
                    </Content>
                    {presentation.parameters.length > 0 ? (
                      <>
                        <Divider className="provider-setup-template__select-card-params-divider" />
                        <div className="provider-setup-template__select-card-params-title-row">
                          <Content
                            component="p"
                            className="provider-setup-template__select-card-params-title"
                          >
                            Parameters
                          </Content>
                          <Tooltip content="These parameters come with this template. You’ll choose Locked or Unlocked later.">
                            <Button
                              variant="plain"
                              aria-label="About parameters"
                              className="provider-setup-template__select-card-params-help"
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              <OutlinedQuestionCircleIcon />
                            </Button>
                          </Tooltip>
                        </div>
                        <ul className="provider-setup-template__select-card-params">
                          {presentation.parameters.map((parameter) => (
                            <li
                              key={parameter.name}
                              className="provider-setup-template__select-card-param"
                            >
                              <code className="provider-setup-template__select-card-param-name">
                                {parameter.name}
                              </code>
                              <span className="provider-setup-template__select-card-param-description">
                                {parameter.description}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                    <div className="provider-setup-template__select-card-footer">
                      <Divider className="provider-setup-template__select-card-footer-divider" />
                      <Content
                        component="p"
                        className="provider-setup-template__select-card-rate"
                      >
                        {formatRateCardSummary(resolveRateCard(template))}
                      </Content>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      case 'hardware-os':
        return (
          <div className="provider-setup-template__publish-hardware-step">
            <Content component="p" className="provider-setup-template__publish-step-lede">
              {isClusterService
                ? 'Choose the OpenShift version for this catalog item.'
                : 'Choose the hardware flavor and OS image for this catalog item.'}
            </Content>
            {isClusterService ? (
              <FormGroup
                label="Tenant access to cluster version"
                fieldId="publish-catalog-cluster-version-mode"
                className="provider-setup-template__publish-subsection"
              >
                <CatalogEditPreviousValue previous={editPrevious('clusterVersionMode')} />
                <div
                  id="publish-catalog-cluster-version-mode"
                  className="provider-setup-template__cluster-version-mode-options"
                  role="radiogroup"
                  aria-label="Tenant access to cluster version"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={clusterVersionMode === 'locked'}
                    className={`provider-setup-template__cluster-version-mode-card${
                      clusterVersionMode === 'locked'
                        ? ' provider-setup-template__cluster-version-mode-card--selected'
                        : ''
                    }`}
                    onClick={() => setClusterVersionMode('locked')}
                  >
                    {clusterVersionMode === 'locked' ? (
                      <Label
                        color="grey"
                        isCompact
                        className="provider-setup-template__select-card-selected-badge"
                      >
                        Selected
                      </Label>
                    ) : null}
                    <span
                      className="provider-setup-template__cluster-version-mode-icon"
                      aria-hidden
                    >
                      <LockIcon />
                    </span>
                    <span className="provider-setup-template__cluster-version-mode-copy">
                      <Title
                        headingLevel="h3"
                        size="md"
                        className="provider-setup-template__select-card-title"
                      >
                        Locked
                      </Title>
                      <Content
                        component="p"
                        className="provider-setup-template__select-card-detail"
                      >
                        Tenants cannot change it.
                      </Content>
                    </span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={clusterVersionMode === 'editable'}
                    className={`provider-setup-template__cluster-version-mode-card${
                      clusterVersionMode === 'editable'
                        ? ' provider-setup-template__cluster-version-mode-card--selected'
                        : ''
                    }`}
                    onClick={() => setClusterVersionMode('editable')}
                  >
                    {clusterVersionMode === 'editable' ? (
                      <Label
                        color="grey"
                        isCompact
                        className="provider-setup-template__select-card-selected-badge"
                      >
                        Selected
                      </Label>
                    ) : null}
                    <span
                      className="provider-setup-template__cluster-version-mode-icon"
                      aria-hidden
                    >
                      <UnlockIcon />
                    </span>
                    <span className="provider-setup-template__cluster-version-mode-copy">
                      <Title
                        headingLevel="h3"
                        size="md"
                        className="provider-setup-template__select-card-title"
                      >
                        Editable at provisioning
                      </Title>
                      <Content
                        component="p"
                        className="provider-setup-template__select-card-detail"
                      >
                        Tenants can change at launch.
                      </Content>
                    </span>
                  </button>
                </div>
              </FormGroup>
            ) : null}
            {!isClusterService ? (
              <>
                <FormGroup
                  label="Instance type"
                  fieldId="publish-catalog-instance-type"
                  isRequired
                  role="radiogroup"
                  className="provider-setup-template__publish-subsection"
                >
                  <CatalogEditPreviousValue previous={editPrevious('instanceType')} />
                  <div
                    id="publish-catalog-instance-type"
                    className={`provider-setup-template__card-group provider-setup-template__card-group--instance-types${
                      instanceTypeCards.length === 3
                        ? ' provider-setup-template__card-group--instance-types-fill'
                        : ''
                    }`}
                    role="presentation"
                  >
                    {instanceTypeCards.map((option) => {
                      const isSelected = option.id === selectedInstanceTypeId

                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          className={`provider-setup-template__select-card provider-setup-template__select-card--instance-type${
                            isSelected ? ' provider-setup-template__select-card--selected' : ''
                          }`}
                          onClick={() => setSelectedInstanceTypeId(option.id)}
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
                            headingLevel="h3"
                            size="md"
                            className="provider-setup-template__select-card-title"
                          >
                            {option.label}
                          </Title>
                          <Content
                            component="p"
                            className="provider-setup-template__select-card-detail"
                          >
                            {option.detail}
                          </Content>
                          {option.accelerator ? (
                            <Content
                              component="p"
                              className="provider-setup-template__select-card-accelerator"
                            >
                              {option.accelerator}
                            </Content>
                          ) : null}
                          {option.hourlyRate ? (
                            <Content
                              component="p"
                              className="provider-setup-template__select-card-rate"
                            >
                              {option.hourlyRate}
                            </Content>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </FormGroup>
                {isCustomInstanceTypeSelected && selectedServiceId === 'virtual-machine' ? (
                  <Form className="provider-setup-template__custom-instance-type">
                    <div className="provider-setup-template__custom-instance-type-fields">
                      <FormGroup label="CPUs" fieldId="custom-instance-type-vcpus" isRequired>
                        <CustomHardwareUnitNumberInput
                          id="custom-instance-type-vcpus"
                          value={customInstanceType.vcpus}
                          min={1}
                          max={128}
                          unit="vCPU"
                          onValueChange={(vcpus) =>
                            setCustomInstanceType((current) => ({ ...current, vcpus }))
                          }
                          inputAriaLabel="CPUs"
                          minusBtnAriaLabel="Decrease CPUs"
                          plusBtnAriaLabel="Increase CPUs"
                        />
                      </FormGroup>
                      <FormGroup
                        label="Memory"
                        fieldId="custom-instance-type-memory"
                        isRequired
                      >
                        <CustomHardwareUnitNumberInput
                          id="custom-instance-type-memory"
                          value={customInstanceType.memoryGb}
                          min={1}
                          max={2048}
                          unit="GB"
                          onValueChange={(memoryGb) =>
                            setCustomInstanceType((current) => ({ ...current, memoryGb }))
                          }
                          inputAriaLabel="Memory"
                          minusBtnAriaLabel="Decrease memory"
                          plusBtnAriaLabel="Increase memory"
                        />
                      </FormGroup>
                      <FormGroup
                        label="Network interfaces"
                        fieldId="custom-instance-type-nics"
                      >
                        <CustomHardwareUnitNumberInput
                          id="custom-instance-type-nics"
                          value={customInstanceType.networkInterfaces}
                          min={1}
                          max={16}
                          unit="NIC"
                          onValueChange={(networkInterfaces) =>
                            setCustomInstanceType((current) => ({
                              ...current,
                              networkInterfaces,
                            }))
                          }
                          inputAriaLabel="Network interfaces"
                          minusBtnAriaLabel="Decrease network interfaces"
                          plusBtnAriaLabel="Increase network interfaces"
                        />
                      </FormGroup>
                      <FormGroup
                        label="GPU accelerator"
                        fieldId="custom-instance-type-gpu"
                      >
                        <FormSelect
                          id="custom-instance-type-gpu"
                          value={customInstanceType.acceleratorId}
                          onChange={(_event, value) =>
                            setCustomInstanceType((current) => ({
                              ...current,
                              acceleratorId: value,
                            }))
                          }
                          aria-label="GPU accelerator"
                        >
                          {CATALOG_GPU_ACCELERATOR_OPTIONS.map((option) => (
                            <FormSelectOption
                              key={option.id}
                              value={option.id}
                              label={option.label}
                            />
                          ))}
                        </FormSelect>
                      </FormGroup>
                    </div>
                  </Form>
                ) : null}
              </>
            ) : null}
            <FormGroup
              label={
                isClusterService
                  ? clusterVersionMode === 'editable'
                    ? 'Default cluster version'
                    : 'Cluster version'
                  : softwareImageStepLabel
              }
              fieldId="publish-catalog-disk-image"
              isRequired
              role="radiogroup"
              className="provider-setup-template__publish-subsection"
            >
              <CatalogEditPreviousValue previous={editPrevious('diskImage')} />
            <div
              id="publish-catalog-disk-image"
              className="provider-setup-template__card-group provider-setup-template__card-group--disk-images"
              role="presentation"
            >
              {isClusterService
                ? getCatalogClusterVersionOptions().map((option) => {
                    const isSelected = option.id === selectedDiskImageId
                    const isLatest = option.id === latestClusterVersionId
                    const lifecycleMeta = getCatalogClusterVersionLifecycleMeta(option.lifecycle)
                    const isFeaturesExpanded = expandedClusterVersionIds.has(option.id)
                    const featuresToggleId = `cluster-version-features-toggle-${option.id}`
                    const featuresContentId = `cluster-version-features-${option.id}`

                    return (
                      <div
                        key={option.id}
                        role="radio"
                        tabIndex={0}
                        aria-checked={isSelected}
                        aria-label={isLatest ? `${option.label}, latest` : option.label}
                        className={`provider-setup-template__select-card provider-setup-template__select-card--disk-image provider-setup-template__select-card--cluster-version${
                          isSelected ? ' provider-setup-template__select-card--selected' : ''
                        }`}
                        onClick={() => setSelectedDiskImageId(option.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setSelectedDiskImageId(option.id)
                          }
                        }}
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
                        <div className="provider-setup-template__cluster-version-header">
                          <div
                            className="provider-setup-template__cluster-version-toggle-wrap"
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            <ExpandableSectionToggle
                              isDetached
                              isExpanded={isFeaturesExpanded}
                              toggleId={featuresToggleId}
                              contentId={featuresContentId}
                              toggleAriaLabel={
                                isFeaturesExpanded
                                  ? `Hide features for ${option.label}`
                                  : `Show features for ${option.label}`
                              }
                              className="provider-setup-template__cluster-version-expand"
                              onToggle={(nextExpanded) => {
                                setExpandedClusterVersionIds((current) => {
                                  const next = new Set(current)
                                  if (nextExpanded) {
                                    next.add(option.id)
                                  } else {
                                    next.delete(option.id)
                                  }
                                  return next
                                })
                              }}
                            />
                          </div>
                          <div className="provider-setup-template__cluster-version-meta">
                            <div className="provider-setup-template__select-card-title-row">
                              <Title
                                headingLevel="h3"
                                size="md"
                                className="provider-setup-template__select-card-title"
                              >
                                {option.label}
                              </Title>
                              {isLatest ? (
                                <Label color="blue" isCompact>
                                  Latest
                                </Label>
                              ) : null}
                              <Label color={lifecycleMeta.color} isCompact>
                                {lifecycleMeta.text}
                              </Label>
                            </div>
                            <Content
                              component="p"
                              className="provider-setup-template__select-card-detail"
                            >
                              {option.detail}
                            </Content>
                          </div>
                        </div>
                        <div
                          className="provider-setup-template__select-card-features"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <ExpandableSection
                            isDetached
                            isExpanded={isFeaturesExpanded}
                            isIndented
                            toggleId={featuresToggleId}
                            contentId={featuresContentId}
                          >
                            <List
                              component={ListComponent.ul}
                              className="provider-setup-template__cluster-version-feature-list"
                            >
                              {option.features.map((feature) => (
                                <ListItem key={feature}>{feature}</ListItem>
                              ))}
                            </List>
                          </ExpandableSection>
                        </div>
                      </div>
                    )
                  })
                : softwareImageOptions.map((option) => {
                    const isSelected = option.id === selectedDiskImageId

                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`provider-setup-template__select-card provider-setup-template__select-card--disk-image${
                          isSelected ? ' provider-setup-template__select-card--selected' : ''
                        }`}
                        onClick={() => setSelectedDiskImageId(option.id)}
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
                          headingLevel="h3"
                          size="md"
                          className="provider-setup-template__select-card-title"
                        >
                          {option.label}
                        </Title>
                        <Content
                          component="p"
                          className="provider-setup-template__select-card-detail"
                        >
                          {option.detail}
                        </Content>
                      </button>
                    )
                  })}
            </div>
            </FormGroup>
          </div>
        )
      case 'node-topology':
        return (
          <div className="provider-setup-template__publish-hardware-step">
            <Content component="p" className="provider-setup-template__publish-step-lede">
              Choose the default node set and host type for this catalog item. When topology is
              editable, tenants can change these and add more node sets at launch.
            </Content>
            <FormGroup
              label="Tenant access to node topology"
              fieldId="publish-catalog-cluster-node-topology-mode"
              className="provider-setup-template__publish-subsection"
            >
              <CatalogEditPreviousValue previous={editPrevious('clusterNodeTopologyMode')} />
              <div
                id="publish-catalog-cluster-node-topology-mode"
                className="provider-setup-template__cluster-version-mode-options"
                role="radiogroup"
                aria-label="Tenant access to node topology"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={clusterNodeTopologyMode === 'locked'}
                  className={`provider-setup-template__cluster-version-mode-card${
                    clusterNodeTopologyMode === 'locked'
                      ? ' provider-setup-template__cluster-version-mode-card--selected'
                      : ''
                  }`}
                  onClick={() => setClusterNodeTopologyMode('locked')}
                >
                  {clusterNodeTopologyMode === 'locked' ? (
                    <Label
                      color="grey"
                      isCompact
                      className="provider-setup-template__select-card-selected-badge"
                    >
                      Selected
                    </Label>
                  ) : null}
                  <span
                    className="provider-setup-template__cluster-version-mode-icon"
                    aria-hidden
                  >
                    <LockIcon />
                  </span>
                  <span className="provider-setup-template__cluster-version-mode-copy">
                    <Title
                      headingLevel="h3"
                      size="md"
                      className="provider-setup-template__select-card-title"
                    >
                      Locked
                    </Title>
                    <Content
                      component="p"
                      className="provider-setup-template__select-card-detail"
                    >
                      Tenants cannot change it.
                    </Content>
                  </span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={clusterNodeTopologyMode === 'editable'}
                  className={`provider-setup-template__cluster-version-mode-card${
                    clusterNodeTopologyMode === 'editable'
                      ? ' provider-setup-template__cluster-version-mode-card--selected'
                      : ''
                  }`}
                  onClick={() => setClusterNodeTopologyMode('editable')}
                >
                  {clusterNodeTopologyMode === 'editable' ? (
                    <Label
                      color="grey"
                      isCompact
                      className="provider-setup-template__select-card-selected-badge"
                    >
                      Selected
                    </Label>
                  ) : null}
                  <span
                    className="provider-setup-template__cluster-version-mode-icon"
                    aria-hidden
                  >
                    <UnlockIcon />
                  </span>
                  <span className="provider-setup-template__cluster-version-mode-copy">
                    <Title
                      headingLevel="h3"
                      size="md"
                      className="provider-setup-template__select-card-title"
                    >
                      Editable at provisioning
                    </Title>
                    <Content
                      component="p"
                      className="provider-setup-template__select-card-detail"
                    >
                      Tenants can change at launch.
                    </Content>
                  </span>
                </button>
              </div>
            </FormGroup>

            <FormGroup
              label={
                clusterNodeTopologyMode === 'editable' ? 'Default node set' : 'Node set'
              }
              fieldId="publish-catalog-cluster-node-set"
              isRequired
              className="provider-setup-template__publish-subsection"
              role="radiogroup"
            >
              <CatalogEditPreviousValue previous={editPrevious('nodeSet')} />
              <div
                id="publish-catalog-cluster-node-set"
                className="provider-setup-template__card-group provider-setup-template__card-group--disk-images"
                role="presentation"
              >
                {getCatalogClusterNodeSetOptions().map((option) => {
                  const isSelected = option.id === selectedNodeSetId
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`provider-setup-template__select-card provider-setup-template__select-card--disk-image${
                        isSelected ? ' provider-setup-template__select-card--selected' : ''
                      }`}
                      onClick={() => setSelectedNodeSetId(option.id)}
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
                        headingLevel="h3"
                        size="md"
                        className="provider-setup-template__select-card-title"
                      >
                        {option.label}
                      </Title>
                      <Content
                        component="p"
                        className="provider-setup-template__select-card-detail"
                      >
                        {option.detail}
                      </Content>
                    </button>
                  )
                })}
              </div>
            </FormGroup>

            <FormGroup
              label={
                clusterNodeTopologyMode === 'editable' ? 'Default host type' : 'Host type'
              }
              fieldId="publish-catalog-cluster-host-type"
              isRequired
              className="provider-setup-template__publish-subsection"
              role="radiogroup"
            >
              <CatalogEditPreviousValue previous={editPrevious('hostType')} />
              <div
                id="publish-catalog-cluster-host-type"
                className="provider-setup-template__card-group provider-setup-template__card-group--disk-images"
                role="presentation"
              >
                {getCatalogClusterHostTypeOptions().map((option) => {
                  const isSelected = option.id === selectedHostTypeId
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`provider-setup-template__select-card provider-setup-template__select-card--disk-image${
                        isSelected ? ' provider-setup-template__select-card--selected' : ''
                      }`}
                      onClick={() => setSelectedHostTypeId(option.id)}
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
                        headingLevel="h3"
                        size="md"
                        className="provider-setup-template__select-card-title"
                      >
                        {option.label}
                      </Title>
                      <Content
                        component="p"
                        className="provider-setup-template__select-card-detail"
                      >
                        {option.detail}
                      </Content>
                    </button>
                  )
                })}
              </div>
            </FormGroup>
          </div>
        )
      case 'field-policies':
        return (
          <div className="provider-setup-template__publish-policies-step">
            <Content component="p" className="provider-setup-template__publish-step-lede">
              Choose Unlocked or Locked for each template parameter.
            </Content>
            <CatalogEditPreviousValue previous={editPrevious('fieldPolicies')} />
            {fieldPolicies.length > 0 ? (
              <Alert
                variant="info"
                isInline
                title="Locked fields stay fixed for the tenant."
                className="provider-setup-template__publish-policies-alert"
              >
                Unlocked fields can be changed by the tenant when they order.
              </Alert>
            ) : null}
            {fieldPolicies.length === 0 ? (
              <Alert variant="info" isInline title="Select a template first">
                Lock fields apply to parameters from the template you chose.
              </Alert>
            ) : (
              <div className="provider-setup-template__field-policy-list" role="list">
                {fieldPolicies.map((policy) => {
                  const isUnlocked = policy.mode === 'exposed'

                  return (
                    <div
                      key={policy.id}
                      className={`provider-setup-template__field-policy-card${
                        isUnlocked ? ' provider-setup-template__field-policy-card--exposed' : ''
                      }`}
                      role="listitem"
                    >
                      <div className="provider-setup-template__field-policy-meta">
                        <span className="provider-setup-template__field-policy-label">
                          {policy.label}
                        </span>
                      </div>
                      <div className="provider-setup-template__field-policy-controls">
                        <Button
                          variant="tertiary"
                          size="sm"
                          className="provider-setup-template__field-policy-toggle"
                          icon={isUnlocked ? <UnlockIcon /> : <LockIcon />}
                          onClick={() => toggleFieldPolicyMode(policy.id)}
                          aria-pressed={isUnlocked}
                          aria-label={`${policy.label} is ${isUnlocked ? 'Unlocked' : 'Locked'}`}
                        >
                          {isUnlocked ? 'Unlocked' : 'Locked'}
                        </Button>
                        {isUnlocked ? (
                          <span className="provider-setup-template__field-policy-hint">
                            Tenant will configure · default: {policy.defaultValue}
                          </span>
                        ) : (
                          <span className="provider-setup-template__field-policy-value-field">
                            <span className="provider-setup-template__field-policy-value-label">
                              Value:
                            </span>
                            <TextInput
                              id={`publish-field-policy-value-${policy.id}`}
                              value={policy.defaultValue}
                              onChange={(_event, value) =>
                                updateFieldPolicyValue(policy.id, value)
                              }
                              aria-label={`${policy.label} locked value`}
                            />
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      case 'display-name':
        return (
          <div className="provider-setup-template__publish-display-step">
            <Content component="p" className="provider-setup-template__publish-step-lede">
              Name this product for the tenant storefront. Pricing is inherited from the linked
              blueprint and cannot be changed here.
            </Content>
            {selectedTemplate ? (
              <Alert
                variant="info"
                isInline
                title="Inherited pricing"
                className="provider-setup-template__publish-review-alert"
              >
                <Content component="p">
                  This catalog item will use{' '}
                  <strong>{formatRateCardSummary(resolveRateCard(selectedTemplate))}</strong>.
                </Content>
              </Alert>
            ) : null}
            <Form autoComplete="off" className="provider-setup-template__publish-display-form">
              <FormGroup label="Name" fieldId="publish-catalog-display-name" isRequired>
                <CatalogEditPreviousValue previous={editPrevious('displayName')} />
                <KubernetesResourceNameField
                  id="publish-catalog-display-name"
                  value={displayName}
                  onChange={setDisplayName}
                  aria-label="Name"
                  placeholder={`e.g. ${
                    selectedServiceId
                      ? getPublishCatalogSuggestedDisplayName(selectedServiceId)
                      : getPublishCatalogSuggestedDisplayName('baremetal')
                  }`}
                  isRequired
                />
              </FormGroup>
              <FormGroup label="Description" fieldId="publish-catalog-description">
                <CatalogEditPreviousValue previous={editPrevious('description')} />
                <TextArea
                  id="publish-catalog-description"
                  value={description}
                  onChange={(_event, value) => setDescription(value)}
                  aria-label="Description"
                  rows={3}
                />
              </FormGroup>
            </Form>
          </div>
        )
      case 'publish-scope':
        return (
          <div className="provider-setup-template__publish-scope-step">
            <Content component="p" className="provider-setup-template__publish-step-lede">
              Control which tenants can discover and order this catalog item.
            </Content>
            <CatalogEditPreviousValue previous={editPrevious('visibility')} />
            <div
              className="provider-admin-catalog__scope-options"
              role="radiogroup"
              aria-label="Visibility"
            >
              <button
                type="button"
                className={`provider-admin-catalog__scope-card${
                  publishScope === 'global-public' ? ' provider-admin-catalog__scope-card--selected' : ''
                }`}
                onClick={() => {
                  setPublishScope('global-public')
                  setEnterpriseTenantIds([])
                }}
                role="radio"
                aria-checked={publishScope === 'global-public'}
              >
                {publishScope === 'global-public' ? (
                  <Label
                    color="grey"
                    isCompact
                    className="provider-admin-catalog__scope-selected-badge"
                  >
                    Selected
                  </Label>
                ) : null}
                <CatalogPublishScopeIcon
                  scope="global-public"
                  className="provider-admin-catalog__scope-icon"
                />
                <span className="provider-admin-catalog__scope-copy">
                  <span className="provider-admin-catalog__scope-title">Global public</span>
                  <span className="provider-admin-catalog__scope-detail">Visible to all tenants.</span>
                </span>
              </button>
              <div className="provider-admin-catalog__scope-vip-group">
                <button
                  type="button"
                  className={`provider-admin-catalog__scope-card${
                    publishScope === 'vip-enterprise'
                      ? ' provider-admin-catalog__scope-card--selected'
                      : ''
                  }`}
                  onClick={selectVipEnterprise}
                  role="radio"
                  aria-checked={publishScope === 'vip-enterprise'}
                >
                  {publishScope === 'vip-enterprise' ? (
                    <Label
                      color="grey"
                      isCompact
                      className="provider-admin-catalog__scope-selected-badge"
                    >
                      Selected
                    </Label>
                  ) : null}
                  <CatalogPublishScopeIcon
                    scope="vip-enterprise"
                    className="provider-admin-catalog__scope-icon"
                  />
                  <span className="provider-admin-catalog__scope-copy">
                    <span className="provider-admin-catalog__scope-title">VIP enterprise</span>
                    <span className="provider-admin-catalog__scope-detail">
                      Visible only to selected enterprise tenants.
                    </span>
                  </span>
                </button>
                {isVipEnterprise ? (
                  <div className="provider-admin-catalog__scope-vip-nested">
                    <VipEnterpriseOrganizationField
                      organizations={organizations}
                      selectedTenantIds={enterpriseTenantIds}
                      onSelectedTenantIdsChange={setEnterpriseTenantIds}
                      onRegisterOrganization={onRegisterOrganization}
                      fieldIdPrefix="publish-catalog"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )
      case 'review': {
        const includesPublishStep = (stepId: (typeof PUBLISH_CATALOG_STEPS)[number]['id']) =>
          publishSteps.some((step) => step.id === stepId)
        const provisioner =
          includesPublishStep('template') && selectedTemplate
            ? getProvisioningTemplatePresentation(selectedTemplate, selectedServiceId)
            : null

        return (
          <div className="provider-setup-template__publish-review-step">
            <Content component="p" className="provider-setup-template__publish-step-lede">
              {isEditMode
                ? 'Review your changes before saving.'
                : 'Confirm the catalog item details before creating.'}
            </Content>
            {isEditMode ? (
              <>
                {isEditingLiveCatalog ? (
                  <Alert
                    variant="warning"
                    isInline
                    title="This catalog item is live"
                    className="provider-setup-template__publish-review-alert"
                  >
                    <Content component="p">
                      Tenants can still order this offering while you edit. Saved changes apply
                      immediately.
                    </Content>
                  </Alert>
                ) : null}
                <CatalogEditChangesSummary changes={editChanges} />
                {!isEditingLiveCatalog ? (
                  <Alert
                    variant="info"
                    isInline
                    title="Changes apply immediately"
                    className="provider-setup-template__publish-review-alert"
                  >
                    <Content component="p">
                      Saving updates this catalog item right away.
                    </Content>
                  </Alert>
                ) : null}
              </>
            ) : (
              <>
            <DescriptionList
              isCompact
              className="provider-setup-template__publish-review-list"
              aria-label="Catalog item review"
            >
              <DescriptionListGroup>
                <DescriptionListTerm>Service</DescriptionListTerm>
                <DescriptionListDescription>
                  {selectedServiceId
                    ? getCatalogServiceOffering(selectedServiceId).title
                    : '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              {includesPublishStep('template') ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>Template</DescriptionListTerm>
                  <DescriptionListDescription>
                    {provisioner?.title ?? '—'}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ) : null}
              <DescriptionListGroup>
                <DescriptionListTerm>Name</DescriptionListTerm>
                <DescriptionListDescription>
                  {displayName.trim() || '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Description</DescriptionListTerm>
                <DescriptionListDescription>
                  {description.trim() || '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              {!isClusterService ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>Instance type</DescriptionListTerm>
                  <DescriptionListDescription>
                    {selectedInstanceTypeLabel || '—'}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ) : null}
              <DescriptionListGroup>
                <DescriptionListTerm>{softwareImageStepLabel}</DescriptionListTerm>
                <DescriptionListDescription>
                  {selectedDiskImage ? (
                    <span className="provider-setup-template__publish-review-version">
                      {selectedDiskImage.label}
                      {isClusterService && selectedDiskImage.id === latestClusterVersionId ? (
                        <Label color="blue" isCompact>
                          Latest
                        </Label>
                      ) : null}
                      {selectedClusterVersionLifecycleMeta ? (
                        <Label
                          color={selectedClusterVersionLifecycleMeta.color}
                          isCompact
                        >
                          {selectedClusterVersionLifecycleMeta.text}
                        </Label>
                      ) : null}
                      {isClusterService ? (
                        <Label
                          color={clusterVersionMode === 'editable' ? 'purple' : 'grey'}
                          isCompact
                        >
                          {getCatalogClusterVersionModeLabel(clusterVersionMode)}
                        </Label>
                      ) : null}
                    </span>
                  ) : (
                    '—'
                  )}
                </DescriptionListDescription>
              </DescriptionListGroup>
              {includesPublishStep('node-topology') ? (
                <>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Node set</DescriptionListTerm>
                    <DescriptionListDescription>
                      <span className="provider-setup-template__publish-review-version">
                        {formatClusterNodeSetLabel(selectedNodeSetId)}
                        <Label
                          color={clusterNodeTopologyMode === 'editable' ? 'purple' : 'grey'}
                          isCompact
                        >
                          {getCatalogClusterNodeTopologyModeLabel(clusterNodeTopologyMode)}
                        </Label>
                      </span>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Host type</DescriptionListTerm>
                    <DescriptionListDescription>
                      <span className="provider-setup-template__publish-review-version">
                        {formatClusterHostTypeLabel(selectedHostTypeId)}
                        <Label
                          color={clusterNodeTopologyMode === 'editable' ? 'purple' : 'grey'}
                          isCompact
                        >
                          {getCatalogClusterNodeTopologyModeLabel(clusterNodeTopologyMode)}
                        </Label>
                      </span>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </>
              ) : null}
              {includesPublishStep('field-policies') ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>Lock fields</DescriptionListTerm>
                  <DescriptionListDescription>
                    {`${fieldPolicies.filter((policy) => policy.mode === 'locked').length} locked · ${
                      fieldPolicies.filter((policy) => policy.mode === 'exposed').length
                    } unlocked`}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ) : null}
              <DescriptionListGroup>
                <DescriptionListTerm>Visibility</DescriptionListTerm>
                <DescriptionListDescription>
                  {isVipEnterprise
                    ? formatVipEnterpriseVisibilityLabel(organizations, enterpriseTenantIds)
                    : 'Global public'}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
            <Alert
              variant="info"
              isInline
              title="Starts as unpublished"
              className="provider-setup-template__publish-review-alert"
            >
              <Content component="p">
                {isVipUnassigned
                  ? 'VIP enterprise is selected without a target organization. The catalog item will be saved as unpublished until you register or assign a tenant, then publish it from the catalog.'
                  : 'New catalog items are saved as unpublished. Publish from the catalog when you are ready for tenants to use this offering.'}
              </Content>
            </Alert>
              </>
            )}
          </div>
        )
      }
      default:
        return null
    }
  }

  function getStepFooter(stepId: (typeof PUBLISH_CATALOG_STEPS)[number]['id']) {
    const withLeaveConfirm = (footer: Record<string, unknown> = {}) => ({
      ...footer,
      onClose: isSubmitting ? undefined : requestClose,
      isCancelDisabled: isSubmitting,
    })

    if (stepId === 'service') {
      return withLeaveConfirm({ isNextDisabled: !selectedServiceId })
    }

    if (stepId === 'template') {
      return withLeaveConfirm({ isNextDisabled: !selectedTemplateRefId })
    }

    if (stepId === 'hardware-os') {
      return withLeaveConfirm({
        isNextDisabled: isClusterService
          ? !selectedDiskImageId
          : !selectedInstanceType || !selectedDiskImageId,
      })
    }

    if (stepId === 'node-topology') {
      return withLeaveConfirm({
        isNextDisabled: !selectedNodeSetId || !selectedHostTypeId,
      })
    }

    if (stepId === 'field-policies') {
      return withLeaveConfirm({ isNextDisabled: fieldPolicies.length === 0 })
    }

    if (stepId === 'display-name') {
      return withLeaveConfirm({ isNextDisabled: !isValidKubernetesResourceName(displayName) })
    }

    if (stepId === 'publish-scope') {
      return withLeaveConfirm({
        isNextDisabled: false,
      })
    }

    if (stepId === 'review') {
      return withLeaveConfirm({
        nextButtonText: isSubmitting ? (
          <span className="provider-admin-catalog__submit-label">
            <Spinner
              size="sm"
              aria-label={isEditMode ? 'Saving catalog item' : 'Creating catalog item'}
            />
            <span>{isEditMode ? 'Saving…' : 'Creating…'}</span>
          </span>
        ) : isEditMode ? (
          <span className="provider-admin-catalog__submit-label">
            <span>Save changes</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ) : (
          <span className="provider-admin-catalog__submit-label">
            <CatalogIcon aria-hidden />
            <span>Create catalog item</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
        onNext: isEditMode ? handleSaveCatalogItem : handleCreateCatalogItem,
        isNextDisabled: isSubmitting || (isEditMode ? !canSaveCatalogEdit : !canCreateCatalogItem),
        isBackDisabled: isSubmitting,
      })
    }

    return undefined
  }

  const wizardTitle = isEditMode ? 'Edit catalog item' : 'Create catalog item'
  const isPage = presentation === 'page'

  const wizard = isOpen ? (
    <Wizard
      key={isEditMode ? 'edit-catalog-wizard' : 'publish-catalog-wizard'}
      className={[
        'provider-setup-template__designer-wizard',
        isPage ? 'catalog-wizard-page__wizard' : undefined,
      ]
        .filter(Boolean)
        .join(' ')}
      height={isPage ? '100%' : '40rem'}
      isPlain={isPage}
      onClose={isPage || isSubmitting ? undefined : requestClose}
      header={
        isPage ? undefined : (
          <WizardHeader
            title={wizardTitle}
            titleId="publish-catalog-wizard-title"
            className="provider-setup-template__designer-header"
            onClose={isSubmitting ? undefined : requestClose}
            closeButtonAriaLabel={
              isEditMode ? 'Close edit catalog item wizard' : 'Close create catalog item wizard'
            }
          />
        )
      }
    >
      {publishSteps.map((step) => (
        <WizardStep
          key={step.id}
          name={
            isEditMode && modifiedStepIds.has(step.id) ? `${step.label} (modified)` : step.label
          }
          id={`publish-catalog-step-${step.id}`}
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
        <CatalogWizardPageShell title={wizardTitle} onBackToCatalog={requestClose}>
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
        onEscapePress={isSubmitting ? undefined : requestClose}
        aria-labelledby="publish-catalog-wizard-title"
        className="provider-setup-template__designer-modal provider-setup-template__publish-modal"
      >
        {wizard}
      </Modal>
      {leaveConfirmModal}
    </>
  )
}
