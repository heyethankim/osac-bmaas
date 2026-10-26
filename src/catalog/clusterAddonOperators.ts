/** Platform operators provider admins can attach to Cluster catalog items. */

export type ClusterAddonOperatorCategory =
  | 'AI / Machine Learning'
  | 'System Infrastructure'
  | 'Storage'
  | 'Networking'
  | 'Management & Governance'
  | 'Security'
  | 'All Categories'

export type ClusterAddonOperatorSelectionMode = 'mandatory' | 'optional-default'

/**
 * How the operator version is resolved for the selected OpenShift cluster version.
 * - `openshift-aligned`: operator stream tracks OCP minor (`v4.{minor}.0`).
 * - `resolved`: independent stream; pick the channel release that fits the OCP minor.
 */
export type ClusterAddonOperatorVersionPolicy =
  | { type: 'openshift-aligned' }
  | {
      type: 'resolved'
      /** Prototype channel map: OpenShift minor → operator version label. */
      byMinor: Readonly<Partial<Record<number, string>>>
      fallback: string
    }

export type ClusterAddonOperatorDefinition = {
  id: string
  name: string
  versionPolicy: ClusterAddonOperatorVersionPolicy
  description: string
  category: Exclude<ClusterAddonOperatorCategory, 'All Categories'>
  /** OperatorHub icon under public/operator-logos. */
  logoSrc: string
  /** Operator ids auto-selected when this operator is attached. */
  dependencyIds?: ReadonlyArray<string>
  /** Shown on the card under Dependencies. */
  dependencyNote: string
  /** Operator ids that cannot be selected together with this one. */
  mutuallyExclusiveWithIds?: ReadonlyArray<string>
  /** Shown on the card under Requirements (footprint, version, exclusivity). */
  requirementNote: string
  /** Highest OpenShift minor allowed (inclusive). Null = no max. */
  maxOpenShiftMinor?: number | null
  /** Lowest OpenShift minor allowed (inclusive). Null = no min. */
  minOpenShiftMinor?: number | null
  vendor: string
}

const operatorLogo = (fileName: string): string =>
  `${import.meta.env.BASE_URL}operator-logos/${fileName}`

export type ClusterAddonOperatorSelection = {
  operatorId: string
  mode: ClusterAddonOperatorSelectionMode
}

export const CLUSTER_ADDON_OPERATOR_CATEGORY_OPTIONS: ReadonlyArray<{
  value: ClusterAddonOperatorCategory
  label: string
}> = [
  { value: 'All Categories', label: 'All Categories' },
  { value: 'AI / Machine Learning', label: 'AI / Machine Learning' },
  { value: 'System Infrastructure', label: 'System Infrastructure' },
  { value: 'Storage', label: 'Storage' },
  { value: 'Networking', label: 'Networking' },
  { value: 'Management & Governance', label: 'Management & Governance' },
  { value: 'Security', label: 'Security' },
]

export const CLUSTER_ADDON_OPERATORS: ReadonlyArray<ClusterAddonOperatorDefinition> = [
  {
    id: 'nvidia-gpu-operator',
    name: 'NVIDIA GPU Operator',
    versionPolicy: {
      type: 'resolved',
      byMinor: {
        16: 'v23.9.2',
        17: 'v24.3.0',
        18: 'v24.6.0',
        19: 'v24.9.0',
        20: 'v25.3.0',
        21: 'v25.3.0',
      },
      fallback: 'v24.6.0',
    },
    description:
      'Automates the management of NVIDIA software components and drivers required for GPUs.',
    category: 'AI / Machine Learning',
    logoSrc: operatorLogo('nvidia-gpu-operator.png'),
    dependencyIds: ['node-feature-discovery'],
    dependencyNote: 'Node Feature Discovery (Auto-bundled)',
    requirementNote: 'NVIDIA GPU-capable worker nodes',
    vendor: 'NVIDIA',
  },
  {
    id: 'node-feature-discovery',
    name: 'Node Feature Discovery (NFD) Operator',
    versionPolicy: { type: 'openshift-aligned' },
    description: 'Detects hardware features, PCI devices, and node topology.',
    category: 'System Infrastructure',
    logoSrc: operatorLogo('node-feature-discovery.png'),
    dependencyNote: 'None',
    requirementNote: 'Cluster-admin to label nodes',
    vendor: 'Red Hat',
  },
  {
    id: 'openshift-data-foundation',
    name: 'OpenShift Data Foundation (ODF)',
    versionPolicy: { type: 'openshift-aligned' },
    description:
      'Software-defined storage providing persistent block, file, and object storage for containerized workloads.',
    category: 'Storage',
    logoSrc: operatorLogo('openshift-data-foundation.svg'),
    dependencyNote: 'Local Storage Operator (recommended)',
    requirementNote: 'Min. 3 worker nodes',
    vendor: 'Red Hat',
  },
  {
    id: 'openshift-service-mesh',
    name: 'Red Hat OpenShift Service Mesh (Istio)',
    versionPolicy: {
      type: 'resolved',
      byMinor: {
        16: 'v2.5.2',
        17: 'v2.5.2',
        18: 'v2.6.0',
        19: 'v2.6.1',
        20: 'v2.6.2',
        21: 'v2.6.2',
      },
      fallback: 'v2.6.0',
    },
    description: 'Connect, secure, and monitor microservices across cluster namespaces.',
    category: 'Networking',
    logoSrc: operatorLogo('openshift-service-mesh.png'),
    dependencyNote: 'None',
    requirementNote: 'Control plane capacity for sidecar injection',
    vendor: 'Red Hat',
  },
  {
    id: 'openshift-ai',
    name: 'Red Hat OpenShift AI (RHOAI)',
    versionPolicy: {
      type: 'resolved',
      byMinor: {
        16: 'v2.11.0',
        17: 'v2.12.0',
        18: 'v2.13.0',
      },
      fallback: 'v2.13.0',
    },
    description:
      'Full-lifecycle AI/ML platform for training, deploying, and monitoring predictive and generative AI models.',
    category: 'AI / Machine Learning',
    logoSrc: operatorLogo('openshift-data-foundation.svg'),
    dependencyNote: 'None',
    /** Version gate is owned by maxOpenShiftMinor (shown only when incompatible). */
    requirementNote: '',
    vendor: 'Red Hat',
    /** Prototype: incompatible with OpenShift 4.19+ (requires 4.18 or earlier). */
    maxOpenShiftMinor: 18,
  },
  {
    id: 'advanced-cluster-management',
    name: 'Advanced Cluster Management (ACM)',
    versionPolicy: {
      type: 'resolved',
      byMinor: {
        16: 'v2.10.0',
        17: 'v2.11.0',
        18: 'v2.12.0',
        19: 'v2.13.0',
        20: 'v2.13.0',
        21: 'v2.14.0',
      },
      fallback: 'v2.11.0',
    },
    description:
      'End-to-end management, governance, and policy compliance for hybrid and multi-cluster Kubernetes.',
    category: 'Management & Governance',
    logoSrc: operatorLogo('advanced-cluster-management.svg'),
    dependencyNote: 'None',
    requirementNote: 'Hub cluster with multi-cluster capacity',
    vendor: 'Red Hat',
  },
  {
    id: 'advanced-cluster-security',
    name: 'Advanced Cluster Security',
    versionPolicy: {
      type: 'resolved',
      byMinor: {
        16: 'v4.4.0',
        17: 'v4.5.0',
        18: 'v4.5.1',
        19: 'v4.6.0',
        20: 'v4.6.0',
        21: 'v4.7.0',
      },
      fallback: 'v4.4.0',
    },
    description:
      'Kubernetes-native security, vulnerability management, and runtime threat detection.',
    category: 'Security',
    logoSrc: operatorLogo('advanced-cluster-security.png'),
    dependencyNote: 'None',
    requirementNote: 'Dedicated scanner capacity recommended',
    vendor: 'Red Hat',
  },
]

export const CLUSTER_ADDON_OPERATOR_SELECTION_MODE_OPTIONS: ReadonlyArray<{
  value: ClusterAddonOperatorSelectionMode
  label: string
}> = [
  { value: 'mandatory', label: 'Mandatory / Locked' },
  { value: 'optional-default', label: 'Optional Default' },
]

export function getClusterAddonOperatorSelectionModeLabel(
  mode: ClusterAddonOperatorSelectionMode,
): string {
  return (
    CLUSTER_ADDON_OPERATOR_SELECTION_MODE_OPTIONS.find((option) => option.value === mode)
      ?.label ?? mode
  )
}

export function getClusterAddonOperatorById(
  operatorId: string,
): ClusterAddonOperatorDefinition | undefined {
  return CLUSTER_ADDON_OPERATORS.find((operator) => operator.id === operatorId)
}

/** Parse `ocp-4.19` → 19. */
export function parseOpenShiftMinorFromClusterVersionId(
  clusterVersionId: string | undefined | null,
): number | null {
  if (!clusterVersionId) {
    return null
  }
  const match = /^ocp-4\.(\d+)$/.exec(clusterVersionId.trim())
  if (!match) {
    return null
  }
  const minor = Number(match[1])
  return Number.isFinite(minor) ? minor : null
}

/** Operator version label for the selected cluster version (derived, not user-picked). */
export function getClusterAddonOperatorResolvedVersion(
  operator: ClusterAddonOperatorDefinition,
  clusterVersionId: string | undefined | null,
): string {
  const minor = parseOpenShiftMinorFromClusterVersionId(clusterVersionId)
  if (operator.versionPolicy.type === 'openshift-aligned') {
    if (minor === null) {
      return 'Matches selected OpenShift'
    }
    return `v4.${minor}.0`
  }

  if (minor !== null) {
    const mapped = operator.versionPolicy.byMinor[minor]
    if (mapped) {
      return mapped
    }
  }
  return operator.versionPolicy.fallback
}

export function isClusterAddonOperatorCompatibleWithVersion(
  operator: ClusterAddonOperatorDefinition,
  clusterVersionId: string | undefined | null,
): boolean {
  const minor = parseOpenShiftMinorFromClusterVersionId(clusterVersionId)
  if (minor === null) {
    return true
  }
  if (
    typeof operator.maxOpenShiftMinor === 'number' &&
    minor > operator.maxOpenShiftMinor
  ) {
    return false
  }
  if (
    typeof operator.minOpenShiftMinor === 'number' &&
    minor < operator.minOpenShiftMinor
  ) {
    return false
  }
  return true
}

export function getClusterAddonOperatorIncompatibilityMessage(
  operator: ClusterAddonOperatorDefinition,
  clusterVersionId: string | undefined | null,
): string | null {
  if (isClusterAddonOperatorCompatibleWithVersion(operator, clusterVersionId)) {
    return null
  }
  const minor = parseOpenShiftMinorFromClusterVersionId(clusterVersionId)
  const currentLabel =
    minor !== null ? `4.${minor}` : clusterVersionId?.replace(/^ocp-/, '') ?? 'selected'
  if (typeof operator.maxOpenShiftMinor === 'number') {
    return `Needs OpenShift 4.${operator.maxOpenShiftMinor} or earlier`
  }
  if (typeof operator.minOpenShiftMinor === 'number') {
    return `Needs OpenShift 4.${operator.minOpenShiftMinor} or later`
  }
  return `Incompatible with OpenShift ${currentLabel}`
}

export function getMutuallyExclusiveSelectedPeer(
  operator: ClusterAddonOperatorDefinition,
  selectedOperatorIds: ReadonlyArray<string>,
): ClusterAddonOperatorDefinition | undefined {
  const selected = new Set(selectedOperatorIds)
  for (const peerId of operator.mutuallyExclusiveWithIds ?? []) {
    if (selected.has(peerId)) {
      return getClusterAddonOperatorById(peerId) ?? getLaunchAddonOperatorById(peerId)
    }
  }
  return undefined
}

export function getMutualExclusionMessage(
  operator: ClusterAddonOperatorDefinition,
  selectedOperatorIds: ReadonlyArray<string>,
): string | null {
  const peer = getMutuallyExclusiveSelectedPeer(operator, selectedOperatorIds)
  if (!peer) {
    return null
  }
  return `Mutually exclusive with selected ${getAddonOperatorShortName(peer.id)}`
}

export function filterClusterAddonOperators(
  operators: ReadonlyArray<ClusterAddonOperatorDefinition>,
  options: {
    query: string
    category: ClusterAddonOperatorCategory
  },
): ClusterAddonOperatorDefinition[] {
  const query = options.query.trim().toLowerCase()
  return operators.filter((operator) => {
    if (
      options.category !== 'All Categories' &&
      operator.category !== options.category
    ) {
      return false
    }
    if (!query) {
      return true
    }
    return (
      operator.name.toLowerCase().includes(query) ||
      operator.vendor.toLowerCase().includes(query) ||
      operator.category.toLowerCase().includes(query) ||
      operator.description.toLowerCase().includes(query)
    )
  })
}

export function formatClusterAddonOperatorsSummary(
  selections: ReadonlyArray<ClusterAddonOperatorSelection>,
): string {
  if (selections.length === 0) {
    return 'None'
  }
  return selections
    .map((selection) => {
      const operator = getClusterAddonOperatorById(selection.operatorId)
      const name = operator?.name ?? selection.operatorId
      return `${name} (${getClusterAddonOperatorSelectionModeLabel(selection.mode)})`
    })
    .join(', ')
}

export function createDefaultClusterAddonOperatorSelections(): ClusterAddonOperatorSelection[] {
  return []
}

function stripMutuallyExclusivePeers(
  nextById: Map<string, ClusterAddonOperatorSelection>,
  operatorId: string,
): void {
  const operator = getClusterAddonOperatorById(operatorId)
  for (const peerId of operator?.mutuallyExclusiveWithIds ?? []) {
    nextById.delete(peerId)
  }
}

/** When attaching an operator, apply default mode and auto-bundle dependencies. */
export function selectClusterAddonOperator(
  current: ReadonlyArray<ClusterAddonOperatorSelection>,
  operatorId: string,
  mode: ClusterAddonOperatorSelectionMode = 'optional-default',
): ClusterAddonOperatorSelection[] {
  const operator = getClusterAddonOperatorById(operatorId)
  if (!operator) {
    return [...current]
  }

  const nextById = new Map(current.map((entry) => [entry.operatorId, entry]))
  stripMutuallyExclusivePeers(nextById, operatorId)
  nextById.set(operatorId, { operatorId, mode })

  for (const dependencyId of operator.dependencyIds ?? []) {
    if (!nextById.has(dependencyId)) {
      nextById.set(dependencyId, { operatorId: dependencyId, mode: 'mandatory' })
    }
  }

  return CLUSTER_ADDON_OPERATORS.filter((item) => nextById.has(item.id)).map(
    (item) => nextById.get(item.id)!,
  )
}

export function deselectClusterAddonOperator(
  current: ReadonlyArray<ClusterAddonOperatorSelection>,
  operatorId: string,
): ClusterAddonOperatorSelection[] {
  const withoutTarget = current.filter((entry) => entry.operatorId !== operatorId)

  // Drop deps that are no longer required by any remaining parent selection.
  return withoutTarget.filter((entry) => {
    const requiredByParent = withoutTarget.some((selected) => {
      const parent = getClusterAddonOperatorById(selected.operatorId)
      return parent?.dependencyIds?.includes(entry.operatorId)
    })
    if (requiredByParent) {
      return true
    }

    const wasOnlyBundledDependency = current.some((selected) => {
      if (selected.operatorId === operatorId) {
        const parent = getClusterAddonOperatorById(selected.operatorId)
        return parent?.dependencyIds?.includes(entry.operatorId)
      }
      return false
    })

    return !wasOnlyBundledDependency
  })
}

export function isClusterAddonOperatorAutoBundled(
  selections: ReadonlyArray<ClusterAddonOperatorSelection>,
  operatorId: string,
): boolean {
  return selections.some((selection) => {
    const parent = getClusterAddonOperatorById(selection.operatorId)
    return parent?.dependencyIds?.includes(operatorId)
  })
}

export function setClusterAddonOperatorSelectionMode(
  current: ReadonlyArray<ClusterAddonOperatorSelection>,
  operatorId: string,
  mode: ClusterAddonOperatorSelectionMode,
): ClusterAddonOperatorSelection[] {
  return current.map((entry) =>
    entry.operatorId === operatorId ? { ...entry, mode } : entry,
  )
}

/** Demo seed for the cluster-node-sets catalog offering (GPU acceleration bundle). */
export const DEMO_CLUSTER_TEMPLATE_ADDON_OPERATORS: ReadonlyArray<ClusterAddonOperatorSelection> =
  [
    { operatorId: 'nvidia-gpu-operator', mode: 'mandatory' },
    { operatorId: 'node-feature-discovery', mode: 'mandatory' },
  ]

/**
 * Legacy alias — launch additional operators now come from the shared catalog list.
 * Kept so existing imports continue to type-check.
 */
export const LAUNCH_ADDITIONAL_ADDON_OPERATORS: ReadonlyArray<ClusterAddonOperatorDefinition> =
  []

const LAUNCH_OPERATOR_BY_ID = new Map(
  CLUSTER_ADDON_OPERATORS.map((operator) => [operator.id, operator]),
)

export function getLaunchAddonOperatorById(
  operatorId: string,
): ClusterAddonOperatorDefinition | undefined {
  return LAUNCH_OPERATOR_BY_ID.get(operatorId) ?? getClusterAddonOperatorById(operatorId)
}

export function getLaunchAdditionalAddonOperators(
  templateSelections: ReadonlyArray<ClusterAddonOperatorSelection>,
): ClusterAddonOperatorDefinition[] {
  const templateIds = new Set(templateSelections.map((entry) => entry.operatorId))
  return CLUSTER_ADDON_OPERATORS.filter((operator) => !templateIds.has(operator.id))
}

export function formatAddonOperatorsHeaderCard(options: {
  count: number
  shortNames: ReadonlyArray<string>
}): { value: string; detail: string } {
  const countLabel =
    options.count === 1 ? '1 Pre-configured' : `${options.count} Pre-configured`
  const detail =
    options.shortNames.length > 0 ? `(${options.shortNames.join(', ')})` : ''
  return { value: countLabel, detail }
}

export function getAddonOperatorShortName(operatorId: string): string {
  switch (operatorId) {
    case 'nvidia-gpu-operator':
      return 'NVIDIA GPU'
    case 'node-feature-discovery':
      return 'NFD'
    case 'openshift-data-foundation':
      return 'ODF'
    case 'openshift-service-mesh':
      return 'Service Mesh'
    case 'openshift-ai':
      return 'OpenShift AI'
    case 'advanced-cluster-management':
      return 'ACM'
    case 'advanced-cluster-security':
      return 'ACS'
    default:
      return getLaunchAddonOperatorById(operatorId)?.name ?? operatorId
  }
}

export function resolveTemplateAddonOperatorSelections(
  selections: ReadonlyArray<ClusterAddonOperatorSelection> | undefined | null,
  options?: { fallbackToDemo?: boolean },
): ClusterAddonOperatorSelection[] {
  if (!selections?.length) {
    return options?.fallbackToDemo
      ? DEMO_CLUSTER_TEMPLATE_ADDON_OPERATORS.map((entry) => ({ ...entry }))
      : []
  }
  return selections
    .filter((entry) => Boolean(getLaunchAddonOperatorById(entry.operatorId)))
    .map((entry) => ({
      operatorId: entry.operatorId,
      mode: entry.mode === 'mandatory' ? 'mandatory' : 'optional-default',
    }))
}

export function toggleLaunchUserAddonOperator(
  currentUserIds: ReadonlyArray<string>,
  operatorId: string,
  checked: boolean,
): string[] {
  const operator = getLaunchAddonOperatorById(operatorId)
  if (!operator) {
    return [...currentUserIds]
  }

  const next = new Set(currentUserIds)
  if (checked) {
    for (const peerId of operator.mutuallyExclusiveWithIds ?? []) {
      next.delete(peerId)
    }
    next.add(operatorId)
    for (const dependencyId of operator.dependencyIds ?? []) {
      next.add(dependencyId)
    }
  } else {
    next.delete(operatorId)
    // Drop deps that are only required by this operator among remaining user selections.
    for (const dependencyId of operator.dependencyIds ?? []) {
      const stillRequired = [...next].some((selectedId) => {
        if (selectedId === operatorId) {
          return false
        }
        const parent = getLaunchAddonOperatorById(selectedId)
        return parent?.dependencyIds?.includes(dependencyId)
      })
      if (!stillRequired) {
        next.delete(dependencyId)
      }
    }
  }

  return CLUSTER_ADDON_OPERATORS.map((item) => item.id).filter((id) => next.has(id))
}

export function isLaunchUserAddonAutoBundled(
  userOperatorIds: ReadonlyArray<string>,
  operatorId: string,
): boolean {
  return userOperatorIds.some((selectedId) => {
    const parent = getLaunchAddonOperatorById(selectedId)
    return parent?.dependencyIds?.includes(operatorId)
  })
}

export function getLaunchAddonCompatibilityBadge(
  operator: ClusterAddonOperatorDefinition,
  clusterVersionId: string | undefined | null,
): string | null {
  return getClusterAddonOperatorIncompatibilityMessage(operator, clusterVersionId)
}
