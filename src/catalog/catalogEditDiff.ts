import {
  buildDefaultCatalogFieldPolicies,
  DEFAULT_CLUSTER_HOST_TYPE_ID,
  DEFAULT_CLUSTER_NODE_SET_ID,
  formatClusterHostTypeLabel,
  formatClusterNodeSetLabel,
  getCatalogClusterHostTypeOptions,
  getCatalogClusterNodeSetOptions,
  getCatalogClusterVersionModeLabel,
  getCatalogClusterVersionOptions,
  getCatalogDiskImageOptions,
  getCatalogInstanceTypeOptions,
  getCatalogClusterNodeTopologyModeLabel,
  getProvisioningTemplatePresentation,
  getCatalogHardwareOsModeLabel,
  type CatalogClusterNodeTopologyMode,
  type CatalogClusterVersionMode,
  type CatalogFieldPolicy,
  type CatalogHardwareOsMode,
} from './catalogPublishConfig'
import {
  formatVipEnterpriseVisibilityLabel,
  getCatalogEnterpriseTenantIds,
} from '../components/provider-admin/VipEnterpriseOrganizationField'
import type { RegisteredOrganization } from '../providerAdmin/organizations'
import type { ProviderCatalogDraft } from '../providerSetup/storage'
import {
  getCatalogServiceOffering,
  type CatalogServiceId,
  type PublishCatalogScope,
  type PublishCatalogStepId,
  type SavedMasterTemplate,
} from '../providerSetup/templateDemo'

type SnapshotValue = {
  compare: string
  display: string
}

export type CatalogEditSnapshot = {
  service: SnapshotValue
  template: SnapshotValue
  displayName: SnapshotValue
  description: SnapshotValue
  instanceType: SnapshotValue
  diskImage: SnapshotValue
  clusterVersionMode: SnapshotValue
  hardwareOsMode: SnapshotValue
  nodeSet: SnapshotValue
  hostType: SnapshotValue
  clusterNodeTopologyMode: SnapshotValue
  fieldPolicies: SnapshotValue
  visibility: SnapshotValue
  isClusterService: boolean
  isBaremetalService: boolean
}

export type CatalogEditChangeRow = {
  id: keyof CatalogEditSnapshot
  stepId: PublishCatalogStepId
  label: string
  before: string
  after: string
}

const EMPTY_SNAPSHOT_VALUE: SnapshotValue = { compare: '', display: '—' }

function snapshotValue(compare: string, display: string): SnapshotValue {
  const normalized = compare.trim()
  return {
    compare: normalized,
    display: display.trim() || '—',
  }
}

function formatFieldPoliciesSummary(policies: CatalogFieldPolicy[]): string {
  if (policies.length === 0) {
    return '—'
  }

  const locked = policies.filter((policy) => policy.mode === 'locked').length
  const exposed = policies.filter((policy) => policy.mode === 'exposed').length
  return `${locked} locked · ${exposed} unlocked`
}

function serializeFieldPolicies(policies: CatalogFieldPolicy[]): string {
  return JSON.stringify(
    [...policies]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((policy) => ({
        id: policy.id,
        mode: policy.mode,
        defaultValue: policy.defaultValue ?? '',
      })),
  )
}

function formatVisibilityLabel(
  scope: PublishCatalogScope,
  enterpriseTenantIds: string[],
  organizations: RegisteredOrganization[],
): string {
  if (scope === 'global-public') {
    return 'Global public'
  }

  if (enterpriseTenantIds.length === 0) {
    return 'VIP enterprise (unassigned)'
  }

  return formatVipEnterpriseVisibilityLabel(organizations, enterpriseTenantIds)
}

function resolveTemplateTitle(
  templateRefId: string,
  serviceId: CatalogServiceId | null,
  templates: SavedMasterTemplate[],
  fallbackName?: string,
): string {
  const template = templates.find((item) => item.templateRefId === templateRefId)
  if (!template) {
    return fallbackName?.trim() || templateRefId || '—'
  }

  return getProvisioningTemplatePresentation(template, serviceId).title
}

function resolveInstanceTypeLabel(
  serviceId: CatalogServiceId,
  instanceTypeId: string,
  instanceTypeLabel?: string,
): string {
  if (instanceTypeLabel?.trim()) {
    return instanceTypeLabel.trim()
  }

  if (!instanceTypeId) {
    return '—'
  }

  const option = getCatalogInstanceTypeOptions(serviceId).find((item) => item.id === instanceTypeId)
  if (!option) {
    return instanceTypeId
  }

  return option.accelerator
    ? `${option.label} (${option.detail} · ${option.accelerator})`
    : `${option.label} (${option.detail})`
}

function resolveDiskImageLabel(
  serviceId: CatalogServiceId,
  diskImageId: string,
  diskImageLabel?: string,
): string {
  if (diskImageLabel?.trim()) {
    return diskImageLabel.trim()
  }

  if (!diskImageId) {
    return '—'
  }

  const options =
    serviceId === 'cluster' ? getCatalogClusterVersionOptions() : getCatalogDiskImageOptions()
  return options.find((option) => option.id === diskImageId)?.label ?? diskImageId
}

function resolveNodeSetLabel(nodeSetId: string, nodeSetLabel?: string): string {
  if (nodeSetLabel?.trim()) {
    return nodeSetLabel.trim()
  }

  if (!nodeSetId) {
    return '—'
  }

  return (
    getCatalogClusterNodeSetOptions().find((option) => option.id === nodeSetId)?.label ??
    formatClusterNodeSetLabel(nodeSetId)
  )
}

function resolveHostTypeLabel(hostTypeId: string, hostTypeLabel?: string): string {
  if (hostTypeLabel?.trim()) {
    return hostTypeLabel.trim()
  }

  if (!hostTypeId) {
    return '—'
  }

  return (
    getCatalogClusterHostTypeOptions().find((option) => option.id === hostTypeId)?.label ??
    formatClusterHostTypeLabel(hostTypeId)
  )
}

/** Match edit-wizard hydration when catalog omits hardware selections. */
function resolveHydratedInstanceTypeId(
  serviceId: CatalogServiceId,
  instanceTypeId?: string,
): string {
  if (instanceTypeId?.trim()) {
    return instanceTypeId.trim()
  }

  return getCatalogInstanceTypeOptions(serviceId)[0]?.id ?? ''
}

/** Match edit-wizard hydration when catalog omits disk image / cluster version. */
function resolveHydratedDiskImageId(serviceId: CatalogServiceId, diskImageId?: string): string {
  if (diskImageId?.trim()) {
    return diskImageId.trim()
  }

  const options =
    serviceId === 'cluster' ? getCatalogClusterVersionOptions() : getCatalogDiskImageOptions()
  return options[0]?.id ?? ''
}

/** Match edit-wizard field-policy merge when catalog has no stored policies. */
function resolveHydratedFieldPolicies(
  catalog: ProviderCatalogDraft,
  serviceId: CatalogServiceId,
  templates: SavedMasterTemplate[],
): CatalogFieldPolicy[] {
  const template = templates.find((item) => item.templateRefId === catalog.templateRefId)
  const provisionerParameters = template
    ? getProvisioningTemplatePresentation(template, serviceId).parameters
    : []
  const defaults = buildDefaultCatalogFieldPolicies({ provisionerParameters })
  const stored = catalog.fieldPolicies ?? []

  if (stored.length === 0) {
    return defaults
  }

  return defaults.map((policy) => {
    const existing = stored.find((entry) => entry.id === policy.id)
    if (!existing) {
      return policy
    }

    return { ...policy, mode: existing.mode, defaultValue: existing.defaultValue }
  })
}

export function buildCatalogEditSnapshotFromCatalog(
  catalog: ProviderCatalogDraft,
  templates: SavedMasterTemplate[],
  organizations: RegisteredOrganization[],
): CatalogEditSnapshot {
  const serviceId = catalog.serviceId ?? 'baremetal'
  const isClusterService = serviceId === 'cluster'
  const isBaremetalService = serviceId === 'baremetal'
  const enterpriseTenantIds = getCatalogEnterpriseTenantIds(catalog)
  const fieldPolicies = resolveHydratedFieldPolicies(catalog, serviceId, templates)
  const instanceTypeId = resolveHydratedInstanceTypeId(serviceId, catalog.instanceTypeId)
  const diskImageId = resolveHydratedDiskImageId(serviceId, catalog.diskImageId)
  const nodeSetId = catalog.nodeSetId ?? DEFAULT_CLUSTER_NODE_SET_ID
  const hostTypeId = catalog.hostTypeId ?? DEFAULT_CLUSTER_HOST_TYPE_ID
  const clusterVersionMode = catalog.clusterVersionMode ?? 'locked'
  const clusterNodeTopologyMode = catalog.clusterNodeTopologyMode ?? 'locked'
  const hardwareOsMode = catalog.hardwareOsMode ?? 'locked'

  return {
    isClusterService,
    isBaremetalService,
    service: snapshotValue(
      serviceId,
      getCatalogServiceOffering(serviceId).title,
    ),
    template: snapshotValue(
      catalog.templateRefId,
      resolveTemplateTitle(catalog.templateRefId, serviceId, templates, catalog.templateName),
    ),
    displayName: snapshotValue(catalog.displayName, catalog.displayName),
    description: snapshotValue(catalog.description ?? '', catalog.description ?? ''),
    instanceType: snapshotValue(
      instanceTypeId,
      isClusterService
        ? '—'
        : resolveInstanceTypeLabel(serviceId, instanceTypeId, catalog.instanceTypeLabel),
    ),
    diskImage: snapshotValue(
      diskImageId,
      resolveDiskImageLabel(serviceId, diskImageId, catalog.diskImageLabel),
    ),
    clusterVersionMode: snapshotValue(
      clusterVersionMode,
      isClusterService ? getCatalogClusterVersionModeLabel(clusterVersionMode) : '—',
    ),
    hardwareOsMode: snapshotValue(
      hardwareOsMode,
      isBaremetalService ? getCatalogHardwareOsModeLabel(hardwareOsMode) : '—',
    ),
    nodeSet: snapshotValue(
      nodeSetId,
      isClusterService ? resolveNodeSetLabel(nodeSetId, catalog.nodeSetLabel) : '—',
    ),
    hostType: snapshotValue(
      hostTypeId,
      isClusterService ? resolveHostTypeLabel(hostTypeId, catalog.hostTypeLabel) : '—',
    ),
    clusterNodeTopologyMode: snapshotValue(
      clusterNodeTopologyMode,
      isClusterService
        ? getCatalogClusterNodeTopologyModeLabel(clusterNodeTopologyMode)
        : '—',
    ),
    fieldPolicies: snapshotValue(
      serializeFieldPolicies(fieldPolicies),
      formatFieldPoliciesSummary(fieldPolicies),
    ),
    visibility: snapshotValue(
      `${catalog.scope}|${[...enterpriseTenantIds].sort().join('|')}`,
      formatVisibilityLabel(catalog.scope, enterpriseTenantIds, organizations),
    ),
  }
}

export type CatalogEditWizardState = {
  serviceId: CatalogServiceId | null
  templateRefId: string
  displayName: string
  description: string
  instanceTypeId: string
  instanceTypeLabel: string
  diskImageId: string
  diskImageLabel: string
  clusterVersionMode: CatalogClusterVersionMode
  hardwareOsMode: CatalogHardwareOsMode
  nodeSetId: string
  hostTypeId: string
  clusterNodeTopologyMode: CatalogClusterNodeTopologyMode
  fieldPolicies: CatalogFieldPolicy[]
  publishScope: PublishCatalogScope
  enterpriseTenantIds: string[]
}

export function buildCatalogEditSnapshotFromWizardState(
  state: CatalogEditWizardState,
  templates: SavedMasterTemplate[],
  organizations: RegisteredOrganization[],
): CatalogEditSnapshot {
  const serviceId = state.serviceId ?? 'baremetal'
  const isClusterService = serviceId === 'cluster'
  const isBaremetalService = serviceId === 'baremetal'

  return {
    isClusterService,
    isBaremetalService,
    service: snapshotValue(
      serviceId,
      getCatalogServiceOffering(serviceId).title,
    ),
    template: snapshotValue(
      state.templateRefId,
      resolveTemplateTitle(state.templateRefId, state.serviceId, templates),
    ),
    displayName: snapshotValue(state.displayName, state.displayName),
    description: snapshotValue(state.description, state.description),
    instanceType: snapshotValue(
      state.instanceTypeId,
      isClusterService ? '—' : state.instanceTypeLabel || '—',
    ),
    diskImage: snapshotValue(
      state.diskImageId,
      state.diskImageLabel || '—',
    ),
    clusterVersionMode: snapshotValue(
      state.clusterVersionMode,
      isClusterService ? getCatalogClusterVersionModeLabel(state.clusterVersionMode) : '—',
    ),
    hardwareOsMode: snapshotValue(
      state.hardwareOsMode,
      isBaremetalService ? getCatalogHardwareOsModeLabel(state.hardwareOsMode) : '—',
    ),
    nodeSet: snapshotValue(
      state.nodeSetId,
      isClusterService ? formatClusterNodeSetLabel(state.nodeSetId) : '—',
    ),
    hostType: snapshotValue(
      state.hostTypeId,
      isClusterService ? formatClusterHostTypeLabel(state.hostTypeId) : '—',
    ),
    clusterNodeTopologyMode: snapshotValue(
      state.clusterNodeTopologyMode,
      isClusterService
        ? getCatalogClusterNodeTopologyModeLabel(state.clusterNodeTopologyMode)
        : '—',
    ),
    fieldPolicies: snapshotValue(
      serializeFieldPolicies(state.fieldPolicies),
      formatFieldPoliciesSummary(state.fieldPolicies),
    ),
    visibility: snapshotValue(
      `${state.publishScope}|${[...state.enterpriseTenantIds].sort().join('|')}`,
      formatVisibilityLabel(state.publishScope, state.enterpriseTenantIds, organizations),
    ),
  }
}

const CHANGE_FIELD_CONFIG: ReadonlyArray<{
  id: keyof CatalogEditSnapshot
  stepId: PublishCatalogStepId
  label: string
  isApplicable?: (snapshot: CatalogEditSnapshot) => boolean
}> = [
  { id: 'service', stepId: 'service', label: 'Service' },
  { id: 'template', stepId: 'template', label: 'Template' },
  { id: 'displayName', stepId: 'display-name', label: 'Name' },
  { id: 'description', stepId: 'display-name', label: 'Description' },
  {
    id: 'instanceType',
    stepId: 'hardware-os',
    label: 'Instance type',
    isApplicable: (snapshot) => !snapshot.isClusterService,
  },
  { id: 'diskImage', stepId: 'hardware-os', label: 'Disk image / cluster version' },
  {
    id: 'clusterVersionMode',
    stepId: 'hardware-os',
    label: 'Cluster version access',
    isApplicable: (snapshot) => snapshot.isClusterService,
  },
  {
    id: 'hardwareOsMode',
    stepId: 'hardware-os',
    label: 'Hardware & OS access',
    isApplicable: (snapshot) => snapshot.isBaremetalService,
  },
  {
    id: 'nodeSet',
    stepId: 'node-topology',
    label: 'Node set',
    isApplicable: (snapshot) => snapshot.isClusterService,
  },
  {
    id: 'hostType',
    stepId: 'node-topology',
    label: 'Host type',
    isApplicable: (snapshot) => snapshot.isClusterService,
  },
  {
    id: 'clusterNodeTopologyMode',
    stepId: 'node-topology',
    label: 'Node topology access',
    isApplicable: (snapshot) => snapshot.isClusterService,
  },
  { id: 'fieldPolicies', stepId: 'field-policies', label: 'Lock fields' },
  { id: 'visibility', stepId: 'publish-scope', label: 'Visibility' },
]

export function getCatalogEditChanges(
  baseline: CatalogEditSnapshot,
  current: CatalogEditSnapshot,
): CatalogEditChangeRow[] {
  return CHANGE_FIELD_CONFIG.flatMap((field) => {
    if (field.isApplicable && !field.isApplicable(current) && !field.isApplicable(baseline)) {
      return []
    }

    const beforeValue = baseline[field.id]
    const afterValue = current[field.id]

    if (
      typeof beforeValue !== 'object' ||
      typeof afterValue !== 'object' ||
      !('compare' in beforeValue) ||
      !('compare' in afterValue) ||
      beforeValue.compare === afterValue.compare
    ) {
      return []
    }

    return [
      {
        id: field.id,
        stepId: field.stepId,
        label: field.label,
        before: beforeValue.display,
        after: afterValue.display,
      },
    ]
  })
}

export function getCatalogEditModifiedStepIds(
  changes: CatalogEditChangeRow[],
): Set<PublishCatalogStepId> {
  return new Set(changes.map((change) => change.stepId))
}

export function getCatalogEditPreviousValue(
  baseline: CatalogEditSnapshot | null,
  fieldId: keyof CatalogEditSnapshot,
  current: CatalogEditSnapshot | null,
): string | null {
  if (!baseline || !current) {
    return null
  }

  const baselineValue = baseline[fieldId]
  const currentValue = current[fieldId]

  if (
    typeof baselineValue !== 'object' ||
    typeof currentValue !== 'object' ||
    !('compare' in baselineValue) ||
    !('compare' in currentValue) ||
    baselineValue.compare === currentValue.compare
  ) {
    return null
  }

  return baselineValue.display
}

export function getEmptyCatalogEditSnapshot(): CatalogEditSnapshot {
  return {
    isClusterService: false,
    isBaremetalService: false,
    service: EMPTY_SNAPSHOT_VALUE,
    template: EMPTY_SNAPSHOT_VALUE,
    displayName: EMPTY_SNAPSHOT_VALUE,
    description: EMPTY_SNAPSHOT_VALUE,
    instanceType: EMPTY_SNAPSHOT_VALUE,
    diskImage: EMPTY_SNAPSHOT_VALUE,
    clusterVersionMode: EMPTY_SNAPSHOT_VALUE,
    hardwareOsMode: EMPTY_SNAPSHOT_VALUE,
    nodeSet: EMPTY_SNAPSHOT_VALUE,
    hostType: EMPTY_SNAPSHOT_VALUE,
    clusterNodeTopologyMode: EMPTY_SNAPSHOT_VALUE,
    fieldPolicies: EMPTY_SNAPSHOT_VALUE,
    visibility: EMPTY_SNAPSHOT_VALUE,
  }
}
