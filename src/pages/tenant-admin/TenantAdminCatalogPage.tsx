import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
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
  FormSelect,
  FormSelectOption,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  SearchInput,
  Spinner,
  Title,
  Tooltip,
} from '@patternfly/react-core'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr, type IAction } from '@patternfly/react-table'
import {
  CatalogServiceFilterToggle,
  countCatalogServices,
  toggleCatalogServiceFilter,
} from '../../components/catalog/CatalogServiceFilterToggle'
import { CatalogFilterEmptyState } from '../../components/catalog/CatalogFilterEmptyState'
import { CatalogFilterResultsSummary } from '../../components/catalog/CatalogFilterResultsSummary'
import { CatalogViewToggle } from '../../components/catalog/CatalogViewToggle'
import { TenantCatalogItemDetailsPage } from '../../components/tenant-admin/TenantCatalogItemDetailsPage'
import { ProviderSetupPublishCatalogWizard } from '../provider-setup/ProviderSetupPublishCatalogWizard'
import { TenantUserLaunchInstanceWizard } from '../../components/tenant-user/TenantUserLaunchInstanceWizard'
import { CatalogSpecRowsList } from '../../components/catalog/CatalogSpecRowsList'
import { KubernetesResourceNameField } from '../../components/shared/KubernetesResourceNameHelper'
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'
import {
  createCatalogServiceFilterSet,
  describeCatalogServiceFilter,
} from '../../catalog/catalogFilterSummary'
import { getCatalogViewMode, setCatalogViewMode, type CatalogViewMode } from '../../catalog/viewMode'
import {
  findCatalogItemByWorkspaceParam,
  getWorkspaceCatalogItemParam,
  syncWorkspaceCatalogItemParam,
} from '../../shared/workspaceNavUrl'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import { getProviderCatalogItems, getProviderSavedTemplate } from '../../providerSetup/storage'
import { sortByDemoCatalogOrder } from '../../providerSetup/prototypeEntry'
import {
  CATALOG_SERVICE_FILTER_LABELS,
  DEMO_EXISTING_MASTER_TEMPLATES,
  type CatalogServiceId,
} from '../../providerSetup/templateDemo'
import {
  getTenantCatalogGovernanceItems,
  TENANT_CATALOG_MANAGER_DEMO,
  type TenantCatalogGovernanceItemWithNetworking,
} from '../../tenantAdmin/catalogManager'
import { ensureTenantDemoProjects } from '../../tenantAdmin/storage'
import {
  addTenantCatalogItem,
  getTenantCatalogItems,
  removeTenantCatalogItem,
  updateTenantCatalogItem,
} from '../../tenantAdmin/storage'
import type { TenantProject } from '../../tenantAdmin/projects'
import { getTenantUserCatalogCardFromDraft, TENANT_USER_CATALOG_FALLBACK } from '../../tenantUser/catalog'
import { LAUNCH_INSTANCE_WIZARD_DEMO } from '../../tenantUser/launchInstanceWizard'
import type { TenantInstance } from '../../tenantUser/instances'
import {
  createTenantCatalogItem,
  createTenantCatalogItemFromPayload,
  isTenantScopedCatalogItemId,
} from '../../tenantAdmin/catalogItems'
import type { PublishedTemplatePayload } from '../../providerSetup/templateDemo'
import {
  getTenantAdminCatalogAddedDate,
  getTenantAdminCatalogOriginDisplay,
  getTenantAdminCatalogSourceLabel,
  getTenantAdminCatalogSourceTooltip,
  TenantAdminCatalogSourceIcon,
} from '../../tenantAdmin/catalogSource'
import { isValidKubernetesResourceName } from '../../shared/kubernetesResourceName'

function isTenantScopedCatalogItem(item: TenantCatalogGovernanceItemWithNetworking): boolean {
  return isTenantScopedCatalogItemId(item.id)
}

function toCatalogDisplayOrderInput(item: TenantCatalogGovernanceItemWithNetworking) {
  return {
    id: item.id,
    catalogItemId: item.catalogItemId ?? item.id,
    createdAt: item.createdAt,
  }
}

const CATALOG_ITEM_CREATE_REVEAL_MS = 1600

type TenantAdminCatalogPageProps = {
  organization: RegisteredOrganization
  catalogDraft: ProviderCatalogDraft | null
  projects: readonly TenantProject[]
  initialProjectId?: string | null
  onProjectScopeChange?: (projectId: string) => void
  onNavigateToProjectsTeams: () => void
  existingInstanceNames?: readonly string[]
  /** When set, open this catalog item's detail page (id or display name). */
  openCatalogItemKey?: string | null
  onOpenCatalogItemConsumed?: () => void
  onProvisioningStarted?: (instance: TenantInstance) => void
  onDismissDuringProvisioning?: (instanceId: string, serviceId: CatalogServiceId) => void
  onWizardFinished?: (instanceId: string, serviceId: CatalogServiceId) => void
}

function toLaunchCatalogCard(
  item: TenantCatalogGovernanceItemWithNetworking,
): ReturnType<typeof getTenantUserCatalogCardFromDraft> {
  const draft = getProviderCatalogItems().find(
    (catalogItem) => catalogItem.catalogItemId === item.catalogItemId,
  )
  if (draft) {
    return getTenantUserCatalogCardFromDraft(draft)
  }

  return {
    ...TENANT_USER_CATALOG_FALLBACK,
    serviceId: item.serviceId,
    service: item.service,
    status: item.status,
    displayName: item.displayName,
    description: item.description,
    categoryLabel: item.categoryLabel,
    specRows: item.specRows,
    cpu: item.cpu,
    ram: item.ram,
    gpu: item.gpu,
    osImage: item.osImage,
    catalogItemId: item.catalogItemId ?? item.id,
    templateRefId: item.templateRefId,
    templateName: item.templateName,
  }
}

/** Grid: blue label chip. List: subtle subtext under the item name. */
function TenantAdminCatalogServiceType({
  service,
  variant,
}: {
  service: string
  variant: 'grid' | 'list'
}) {
  if (variant === 'grid') {
    return (
      <Label color="blue" className="tenant-admin-catalog-manager__card-label">
        {service}
      </Label>
    )
  }

  return (
    <Content component="p" className="tenant-admin-catalog-manager__service-type">
      {service}
    </Content>
  )
}

function TenantAdminCatalogOriginLine({
  item,
  className,
  iconClassName,
  includeDate = true,
}: {
  item: TenantCatalogGovernanceItemWithNetworking
  className?: string
  iconClassName?: string
  includeDate?: boolean
}) {
  const text = includeDate
    ? getTenantAdminCatalogOriginDisplay(item)
    : getTenantAdminCatalogSourceLabel(item)

  return (
    <Tooltip content={getTenantAdminCatalogSourceTooltip(item)} position="top" enableFlip={false}>
      <span className={className}>
        <TenantAdminCatalogSourceIcon item={item} className={iconClassName} />
        <span>{text}</span>
      </span>
    </Tooltip>
  )
}

function getCatalogItemActions(
  item: TenantCatalogGovernanceItemWithNetworking,
  onViewDetails: () => void,
  onLaunch: () => void,
  onEdit: () => void,
  onDuplicate: () => void,
  onTogglePublish: () => void,
  onDelete: () => void,
): IAction[] {
  const isUnpublished = item.status === 'Unpublished'

  const actions: IAction[] = [
    {
      title: 'View details',
      onClick: onViewDetails,
    },
  ]

  if (!isUnpublished) {
    actions.push({
      title: LAUNCH_INSTANCE_WIZARD_DEMO.launchInstanceLabel,
      onClick: onLaunch,
    })
  }

  actions.push(
    {
      title: 'Edit',
      onClick: onEdit,
    },
    {
      title: 'Duplicate',
      onClick: onDuplicate,
    },
    {
      isSeparator: true,
    },
    {
      title: isUnpublished ? 'Publish' : 'Unpublish',
      onClick: onTogglePublish,
    },
    {
      title: 'Delete',
      isDanger: true,
      onClick: onDelete,
    },
  )

  return actions
}

export function TenantAdminCatalogPage({
  organization,
  catalogDraft,
  projects,
  initialProjectId = null,
  onProjectScopeChange,
  onNavigateToProjectsTeams,
  existingInstanceNames = [],
  openCatalogItemKey = null,
  onOpenCatalogItemConsumed,
  onProvisioningStarted,
  onDismissDuringProvisioning,
  onWizardFinished,
}: TenantAdminCatalogPageProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [catalogItems, setCatalogItems] = useState(() =>
    getTenantCatalogGovernanceItems(organization, catalogDraft),
  )
  const [viewMode, setViewMode] = useState<CatalogViewMode>(() => getCatalogViewMode('grid'))
  const initialServiceFilters = catalogItems.map((item) => item.serviceId)
  const [selectedFilters, setSelectedFilters] = useState<Set<CatalogServiceId>>(
    () => new Set(initialServiceFilters.length > 0 ? initialServiceFilters : ['baremetal']),
  )
  const knownServiceFiltersRef = useRef(new Set(initialServiceFilters))
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'Live' | 'Unpublished'>('all')
  const [searchValue, setSearchValue] = useState('')
  const [selectedCatalogItem, setSelectedCatalogItem] =
    useState<TenantCatalogGovernanceItemWithNetworking | null>(null)
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false)
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [isUnpublishModalOpen, setIsUnpublishModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false)
  const [creatingCatalogItemId, setCreatingCatalogItemId] = useState<string | null>(null)
  const [creatingCardHeightPx, setCreatingCardHeightPx] = useState<number | null>(null)
  const createRevealTimeoutRef = useRef<number | null>(null)
  const catalogCardGridRef = useRef<HTMLDivElement | null>(null)
  const catalogDisplayOrderRef = useRef<string[] | null>(null)
  const itemParam = getWorkspaceCatalogItemParam(searchParams)
  const catalogTemplates = useMemo(
    () => [getProviderSavedTemplate() ?? DEMO_EXISTING_MASTER_TEMPLATES[0]!],
    [isCreateWizardOpen],
  )

  const refreshCatalogItems = () => {
    setCatalogItems(getTenantCatalogGovernanceItems(organization, catalogDraft))
  }

  const prependToCatalogDisplayOrder = (catalogItemId: string) => {
    const current = catalogDisplayOrderRef.current ?? []
    catalogDisplayOrderRef.current = [
      catalogItemId,
      ...current.filter((id) => id !== catalogItemId),
    ]
  }

  const orderedCatalogItems = useMemo(() => {
    const byId = new Map(catalogItems.map((item) => [item.id, item] as const))
    const currentIds = new Set(byId.keys())

    if (!catalogDisplayOrderRef.current) {
      catalogDisplayOrderRef.current = sortByDemoCatalogOrder(
        catalogItems.map(toCatalogDisplayOrderInput),
      ).map((item) => item.id)
    } else {
      const retained = catalogDisplayOrderRef.current.filter((id) => currentIds.has(id))
      const retainedSet = new Set(retained)
      const added = sortByDemoCatalogOrder(
        catalogItems.filter((item) => !retainedSet.has(item.id)).map(toCatalogDisplayOrderInput),
      ).map((item) => item.id)
      // New tenant-created items prepend; the three demo offerings keep their fixed order.
      catalogDisplayOrderRef.current = [...added, ...retained]
    }

    return catalogDisplayOrderRef.current
      .map((id) => byId.get(id))
      .filter((item): item is TenantCatalogGovernanceItemWithNetworking => Boolean(item))
  }, [catalogItems])

  useEffect(() => {
    return () => {
      if (createRevealTimeoutRef.current !== null) {
        window.clearTimeout(createRevealTimeoutRef.current)
      }
    }
  }, [])

  const beginCatalogItemCreateReveal = (catalogItemId: string) => {
    if (createRevealTimeoutRef.current !== null) {
      window.clearTimeout(createRevealTimeoutRef.current)
    }
    setCreatingCardHeightPx(null)
    setCreatingCatalogItemId(catalogItemId)
    createRevealTimeoutRef.current = window.setTimeout(() => {
      setCreatingCatalogItemId((current) => (current === catalogItemId ? null : current))
      setCreatingCardHeightPx(null)
      createRevealTimeoutRef.current = null
    }, CATALOG_ITEM_CREATE_REVEAL_MS)
  }

  useEffect(() => {
    catalogDisplayOrderRef.current = null
    refreshCatalogItems()
  }, [organization.slug])

  const handleCreateCatalogItem = (payload: PublishedTemplatePayload) => {
    const item = createTenantCatalogItemFromPayload(payload)
    addTenantCatalogItem(organization.slug, item)
    prependToCatalogDisplayOrder(item.id)
    refreshCatalogItems()
    setIsCreateWizardOpen(false)
    setViewMode('grid')
    setCatalogViewMode('grid')
    setSelectedStatus('all')
    setSearchValue('')
    beginCatalogItemCreateReveal(item.id)
    return item
  }

  useEffect(() => {
    setSelectedFilters((current) => {
      const next = new Set(current)
      let changed = false

      for (const item of orderedCatalogItems) {
        if (!knownServiceFiltersRef.current.has(item.serviceId)) {
          knownServiceFiltersRef.current.add(item.serviceId)
          next.add(item.serviceId)
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [orderedCatalogItems])

  const serviceCounts = useMemo(
    () => countCatalogServices(orderedCatalogItems.map((item) => item.serviceId)),
    [orderedCatalogItems],
  )
  const filteredItems = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return orderedCatalogItems.filter((item) => {
      if (!selectedFilters.has(item.serviceId)) {
        return false
      }

      if (selectedStatus !== 'all' && item.status !== selectedStatus) {
        return false
      }

      if (!query) {
        return true
      }

      return (
        item.displayName.toLowerCase().includes(query) ||
        item.service.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query) ||
        item.templateName.toLowerCase().includes(query) ||
        item.specRows.some(
          (row) =>
            row.label.toLowerCase().includes(query) || row.value.toLowerCase().includes(query),
        )
      )
    })
  }, [orderedCatalogItems, selectedFilters, selectedStatus, searchValue])

  useLayoutEffect(() => {
    if (!creatingCatalogItemId || viewMode !== 'grid') {
      setCreatingCardHeightPx(null)
      return
    }

    const grid = catalogCardGridRef.current
    if (!grid) {
      return
    }

    const referenceCard = Array.from(
      grid.querySelectorAll<HTMLElement>('.tenant-admin-catalog-manager__card'),
    ).find((card) => !card.classList.contains('tenant-admin-catalog-manager__card--creating'))

    if (!referenceCard) {
      setCreatingCardHeightPx(null)
      return
    }

    setCreatingCardHeightPx(Math.round(referenceCard.getBoundingClientRect().height))
  }, [creatingCatalogItemId, filteredItems, viewMode])

  const catalogServiceIds = useMemo(
    () => orderedCatalogItems.map((item) => item.serviceId),
    [orderedCatalogItems],
  )

  const filterDescriptionParts = useMemo(() => {
    const parts: string[] = []
    const serviceDescription = describeCatalogServiceFilter(selectedFilters, catalogServiceIds)
    if (serviceDescription) {
      parts.push(`service: ${serviceDescription}`)
    }
    if (selectedStatus !== 'all') {
      parts.push(
        `publish status: ${selectedStatus === 'Live' ? 'Published' : 'Unpublished'}`,
      )
    }
    if (searchValue.trim()) {
      parts.push(`search: "${searchValue.trim()}"`)
    }
    return parts
  }, [catalogServiceIds, searchValue, selectedFilters, selectedStatus])

  const clearAllFilters = () => {
    setSearchValue('')
    setSelectedStatus('all')
    setSelectedFilters(createCatalogServiceFilterSet(catalogServiceIds))
  }

  const emptyStateTitle = (() => {
    if (selectedFilters.size === 0) {
      return 'Select a service to view catalog items'
    }
    if (searchValue.trim()) {
      return 'No catalog items match your search'
    }
    if (selectedStatus !== 'all') {
      return `No ${selectedStatus === 'Live' ? 'published' : 'unpublished'} catalog items`
    }
    if (selectedFilters.size === 1) {
      const [onlyFilter] = selectedFilters
      return `No ${CATALOG_SERVICE_FILTER_LABELS[onlyFilter!]} items yet`
    }
    return 'No catalog items for the selected services'
  })()

  const emptyStateBody = (() => {
    if (selectedFilters.size === 0) {
      return 'Choose one or more services above to filter the catalog.'
    }
    if (searchValue.trim()) {
      return 'Try a different search term or clear the search field.'
    }
    if (selectedStatus !== 'all') {
      return 'Try a different publish status or clear filters.'
    }
    return 'No approved catalog items match the selected services.'
  })()

  const handleViewModeChange = (nextViewMode: CatalogViewMode) => {
    setViewMode(nextViewMode)
    setCatalogViewMode(nextViewMode)
  }

  const handleFilterToggle = (serviceId: CatalogServiceId, isSelected: boolean) => {
    setSelectedFilters((current) => toggleCatalogServiceFilter(current, serviceId, isSelected))
  }

  const openDetails = (item: TenantCatalogGovernanceItemWithNetworking) => {
    setSelectedCatalogItem(item)
    setIsWizardOpen(false)
    setIsDetailsDrawerOpen(true)
    syncWorkspaceCatalogItemParam(setSearchParams, item.displayName)
  }

  useEffect(() => {
    if (!openCatalogItemKey) {
      return
    }

    const match = findCatalogItemByWorkspaceParam(catalogItems, openCatalogItemKey)
    if (match) {
      openDetails(match)
      setIsWizardOpen(false)
    }

    onOpenCatalogItemConsumed?.()
  }, [openCatalogItemKey, catalogItems, onOpenCatalogItemConsumed])

  useEffect(() => {
    const match = findCatalogItemByWorkspaceParam(catalogItems, itemParam)
    if (match) {
      setSelectedCatalogItem(match)
      if (!isWizardOpen) {
        setIsDetailsDrawerOpen(true)
      }
      return
    }

    if (!itemParam) {
      setIsDetailsDrawerOpen(false)
    }
  }, [itemParam, catalogItems, isWizardOpen])

  const openLaunchWizard = (item: TenantCatalogGovernanceItemWithNetworking) => {
    if (item.status === 'Unpublished') {
      return
    }
    setSelectedCatalogItem(item)
    setIsDetailsDrawerOpen(false)
    setIsWizardOpen(true)
    syncWorkspaceCatalogItemParam(setSearchParams, null, { replace: true })
  }

  const launchCatalogCard = selectedCatalogItem ? toLaunchCatalogCard(selectedCatalogItem) : null
  const launchCatalogDraft =
    selectedCatalogItem
      ? (getProviderCatalogItems().find(
          (item) => item.catalogItemId === selectedCatalogItem.catalogItemId,
        ) ??
        catalogDraft)
      : catalogDraft

  const closeDetails = () => {
    setIsDetailsDrawerOpen(false)
    syncWorkspaceCatalogItemParam(setSearchParams, null)
  }

  const closeLaunchWizard = () => {
    setIsWizardOpen(false)
  }

  const updateCatalogItem = (
    itemId: string,
    updater: (
      item: TenantCatalogGovernanceItemWithNetworking,
    ) => TenantCatalogGovernanceItemWithNetworking,
  ) => {
    if (isTenantScopedCatalogItemId(itemId)) {
      updateTenantCatalogItem(organization.slug, itemId, (stored) => {
        const current = getTenantCatalogGovernanceItems(organization, catalogDraft).find(
          (item) => item.id === itemId,
        )
        if (!current) {
          return stored
        }

        const next = updater(current)
        return {
          ...stored,
          displayName: next.displayName,
          status: next.status === 'Unpublished' ? 'Unpublished' : 'Live',
        }
      })
      const nextItems = getTenantCatalogGovernanceItems(organization, catalogDraft)
      setCatalogItems(nextItems)
      const updated = nextItems.find((item) => item.id === itemId)
      if (updated) {
        setSelectedCatalogItem((selected) => (selected?.id === itemId ? updated : selected))
      }
      return
    }

    setCatalogItems((current) => {
      const next = current.map((item) => (item.id === itemId ? updater(item) : item))
      const updated = next.find((item) => item.id === itemId)
      if (updated) {
        setSelectedCatalogItem((selected) => (selected?.id === itemId ? updated : selected))
      }
      return next
    })
  }

  const openEdit = (item: TenantCatalogGovernanceItemWithNetworking) => {
    setSelectedCatalogItem(item)
    setEditDisplayName(item.displayName)
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = () => {
    if (!selectedCatalogItem || !editDisplayName.trim()) {
      return
    }

    updateCatalogItem(selectedCatalogItem.id, (item) => ({
      ...item,
      displayName: editDisplayName.trim(),
    }))
    setIsEditModalOpen(false)
  }

  const handleDuplicate = (item: TenantCatalogGovernanceItemWithNetworking) => {
    if (isTenantScopedCatalogItem(item)) {
      const stored = getTenantCatalogItems(organization.slug).find((entry) => entry.id === item.id)
      if (!stored) {
        return
      }

      const duplicate = createTenantCatalogItem({
        displayName: `${item.displayName}-copy`,
        description: stored.description,
        sourceCatalogItemId: stored.sourceCatalogItemId,
        rateCard: stored.rateCard,
        status: 'Unpublished',
        catalogConfig: stored.catalogConfig,
      })
      addTenantCatalogItem(organization.slug, duplicate)
      prependToCatalogDisplayOrder(duplicate.id)
      refreshCatalogItems()
      setViewMode('grid')
      setCatalogViewMode('grid')
      setSelectedStatus('all')
      setSearchValue('')
      beginCatalogItemCreateReveal(duplicate.id)
      return
    }

    const suffix = Math.random().toString(36).slice(2, 6)
    const duplicate: TenantCatalogGovernanceItemWithNetworking = {
      ...item,
      id: `${item.id}-copy-${suffix}`,
      displayName: `${item.displayName}-copy`,
      status: 'Unpublished',
      approved: false,
    }

    setCatalogItems((current) => [...current, duplicate])
    setSelectedCatalogItem(duplicate)
  }

  const openTogglePublish = (item: TenantCatalogGovernanceItemWithNetworking) => {
    setSelectedCatalogItem(item)
    if (item.status === 'Unpublished') {
      updateCatalogItem(item.id, (current) => ({
        ...current,
        status: 'Live',
      }))
      return
    }

    setIsUnpublishModalOpen(true)
  }

  const handleConfirmUnpublish = () => {
    if (!selectedCatalogItem) {
      return
    }

    updateCatalogItem(selectedCatalogItem.id, (item) => ({
      ...item,
      status: 'Unpublished',
    }))
    setIsUnpublishModalOpen(false)
  }

  const openDelete = (item: TenantCatalogGovernanceItemWithNetworking) => {
    setSelectedCatalogItem(item)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!selectedCatalogItem) {
      return
    }

    const deletedId = selectedCatalogItem.id
    if (isTenantScopedCatalogItem(selectedCatalogItem)) {
      removeTenantCatalogItem(organization.slug, deletedId)
      setCatalogItems(getTenantCatalogGovernanceItems(organization, catalogDraft))
    } else {
      setCatalogItems((current) => current.filter((item) => item.id !== deletedId))
    }
    setIsDetailsDrawerOpen(false)
    syncWorkspaceCatalogItemParam(setSearchParams, null, { replace: true })
    setIsEditModalOpen(false)
    setSelectedCatalogItem(null)
    setIsDeleteModalOpen(false)
  }

  const buildCatalogItemActions = (item: TenantCatalogGovernanceItemWithNetworking) =>
    getCatalogItemActions(
      item,
      () => openDetails(item),
      () => openLaunchWizard(item),
      () => openEdit(item),
      () => handleDuplicate(item),
      () => openTogglePublish(item),
      () => openDelete(item),
    )

  const detailsItem = selectedCatalogItem
    ? (catalogItems.find((entry) => entry.id === selectedCatalogItem.id) ?? selectedCatalogItem)
    : null
  const projectCount = ensureTenantDemoProjects(organization.slug).length

  return (
    <>
      {isCreateWizardOpen ? (
        <ProviderSetupPublishCatalogWizard
          presentation="page"
          isOpen={isCreateWizardOpen}
          hidePublishScope
          templates={catalogTemplates}
          organizations={[organization]}
          defaultTemplateRefId={catalogTemplates[0]?.templateRefId}
          onClose={() => setIsCreateWizardOpen(false)}
          onCreateCatalogItem={handleCreateCatalogItem}
        />
      ) : isWizardOpen && launchCatalogCard ? (
        <TenantUserLaunchInstanceWizard
          presentation="page"
          isOpen={isWizardOpen}
          catalogItem={launchCatalogCard}
          organization={organization}
          catalogDraft={launchCatalogDraft}
          preferCatalogDraft
          canManageNetworkObjects
          tenantSlug={organization.slug}
          projects={projects}
          initialProjectId={initialProjectId}
          onProjectScopeChange={onProjectScopeChange}
          onNavigateToCreateProject={() => {
            closeLaunchWizard()
            onNavigateToProjectsTeams()
          }}
          existingInstanceNames={existingInstanceNames}
          onClose={closeLaunchWizard}
          onBackToCatalogItem={() => {
            if (selectedCatalogItem) {
              openDetails(selectedCatalogItem)
            }
          }}
          onProvisioningStarted={(instance) => {
            onProvisioningStarted?.(instance)
          }}
          onDismissDuringProvisioning={(instanceId, serviceId) => {
            onDismissDuringProvisioning?.(instanceId, serviceId)
            closeLaunchWizard()
          }}
          onWizardFinished={(instanceId, serviceId) => {
            onWizardFinished?.(instanceId, serviceId)
            closeLaunchWizard()
          }}
        />
      ) : isDetailsDrawerOpen && detailsItem ? (
        <TenantCatalogItemDetailsPage
          item={detailsItem}
          projectCount={projectCount}
          onBack={closeDetails}
          onNavigateToProjectsTeams={onNavigateToProjectsTeams}
          onLaunch={() => openLaunchWizard(detailsItem)}
        />
      ) : (
      <div className="tenant-admin-workspace-page tenant-admin-catalog-manager">
        <Flex
          className="tenant-admin-catalog-manager__page-header"
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsFlexStart' }}
          gap={{ default: 'gapMd' }}
        >
          <FlexItem>
            <Title headingLevel="h1" size="3xl" className="tenant-admin-catalog-manager__title">
              {TENANT_CATALOG_MANAGER_DEMO.title}
            </Title>
            <Content component="p" className="tenant-admin-catalog-manager__lede">
              {TENANT_CATALOG_MANAGER_DEMO.lede}
            </Content>
          </FlexItem>
          <FlexItem alignSelf={{ default: 'alignSelfFlexStart' }}>
            <Button
              variant="primary"
              icon={<PlusIcon />}
              className="tenant-admin-catalog-manager__create"
              onClick={() => setIsCreateWizardOpen(true)}
            >
              Create catalog item
            </Button>
          </FlexItem>
        </Flex>

        <div className="catalog-view-toolbar tenant-admin-catalog-manager__toolbar">
          <div className="catalog-view-toolbar__start">
            <CatalogServiceFilterToggle
              selectedFilters={selectedFilters}
              serviceCounts={serviceCounts}
              onToggle={handleFilterToggle}
            />
            <FormSelect
              className="catalog-status-filter"
              id="tenant-admin-catalog-status-filter"
              value={selectedStatus}
              onChange={(_event, value) =>
                setSelectedStatus(value as 'all' | 'Live' | 'Unpublished')
              }
              aria-label="Filter catalog items by publish status"
            >
              <FormSelectOption value="all" label="All publish states" />
              <FormSelectOption value="Live" label="Published" />
              <FormSelectOption value="Unpublished" label="Unpublished" />
            </FormSelect>
            <SearchInput
              className="catalog-search"
              placeholder="Search catalog items"
              value={searchValue}
              onChange={(_event, value) => setSearchValue(value)}
              onClear={() => setSearchValue('')}
              aria-label="Search catalog items"
            />
          </div>
          <CatalogViewToggle viewMode={viewMode} onChange={handleViewModeChange} />
        </div>

        {filteredItems.length === 0 ? (
          filterDescriptionParts.length > 0 ? (
            <CatalogFilterEmptyState
              title="No catalog items match your filters"
              description="Try a different service, publish status, or search term."
              onClearFilters={clearAllFilters}
            />
          ) : (
          <EmptyState className="tenant-admin-catalog-manager__empty">
            <Title headingLevel="h2" size="lg">
              {emptyStateTitle}
            </Title>
            <EmptyStateBody>{emptyStateBody}</EmptyStateBody>
          </EmptyState>
          )
        ) : viewMode === 'grid' ? (
          <>
            <CatalogFilterResultsSummary
              filteredCount={filteredItems.length}
              totalCount={orderedCatalogItems.length}
              singular="catalog item"
              filterParts={filterDescriptionParts}
              onClearFilters={clearAllFilters}
            />
          <div
            ref={catalogCardGridRef}
            className="catalog-card-grid catalog-card-grid--stable tenant-admin-catalog-manager__catalog-list"
          >
            {filteredItems.map((item) => {
              const catalogItemActions = buildCatalogItemActions(item)
              const isCreating = creatingCatalogItemId === item.id

              return (
                <Card
                  key={item.id}
                  isCompact={false}
                  className={[
                    'tenant-admin-catalog-manager__card',
                    item.status === 'Unpublished'
                      ? 'tenant-admin-catalog-manager__card--unpublished'
                      : '',
                    isCreating ? 'tenant-admin-catalog-manager__card--creating' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={
                    isCreating && creatingCardHeightPx
                      ? { height: creatingCardHeightPx, minBlockSize: creatingCardHeightPx }
                      : undefined
                  }
                >
                  {isCreating ? (
                    <CardBody className="tenant-admin-catalog-manager__card-body--creating">
                      <Spinner size="lg" aria-label={`Creating ${item.displayName}`} />
                      <Content
                        component="p"
                        className="tenant-admin-catalog-manager__creating-kicker"
                      >
                        Creating catalog item…
                      </Content>
                    </CardBody>
                  ) : (
                  <CardBody>
                    <div className="tenant-admin-catalog-manager__card-header">
                      <span className="tenant-admin-catalog-manager__icon" aria-hidden>
                        {getCatalogServiceIcon(item.serviceId)}
                      </span>
                      <div className="tenant-admin-catalog-manager__card-header-actions">
                        <TenantAdminCatalogServiceType service={item.service} variant="grid" />
                        <Label
                          color={item.status === 'Unpublished' ? 'grey' : 'green'}
                          className="tenant-admin-catalog-manager__card-label"
                        >
                          {item.status}
                        </Label>
                        <ActionsColumn items={catalogItemActions} />
                      </div>
                    </div>

                    <Content component="p" className="tenant-admin-catalog-manager__primary-cell">
                      <Button
                        variant="link"
                        isInline
                        className="tenant-admin-catalog-manager__name-link catalog-item-name-link"
                        onClick={() => openDetails(item)}
                      >
                        {item.displayName}
                      </Button>
                    </Content>

                    <CatalogSpecRowsList
                      rows={item.specRows}
                      className="tenant-admin-catalog-manager__specs-list"
                      rowClassName="tenant-admin-catalog-manager__spec-row"
                      labelClassName="tenant-admin-catalog-manager__spec-label"
                      valueClassName="tenant-admin-catalog-manager__spec-value"
                    />

                    <div className="tenant-admin-catalog-manager__card-footer">
                      <div
                        className="tenant-admin-catalog-manager__card-footer-visibility"
                        aria-label="Catalog source"
                      >
                        <TenantAdminCatalogOriginLine
                          item={item}
                          className="tenant-admin-catalog-manager__scope"
                          iconClassName="tenant-admin-catalog-manager__scope-icon"
                        />
                      </div>
                    </div>
                  </CardBody>
                  )}
                </Card>
              )
            })}
          </div>
          </>
        ) : (
          <div className="catalog-table-panel">
            <CatalogFilterResultsSummary
              filteredCount={filteredItems.length}
              totalCount={orderedCatalogItems.length}
              singular="catalog item"
              filterParts={filterDescriptionParts}
              onClearFilters={clearAllFilters}
            />
            <Table
              aria-label="Catalog items"
              className="catalog-data-table tenant-admin-catalog-manager__table"
            >
              <Thead>
                <Tr>
                  <Th className="tenant-admin-catalog-manager__col-name">Name</Th>
                  <Th className="tenant-admin-catalog-manager__col-status">Status</Th>
                  <Th className="tenant-admin-catalog-manager__col-configuration">Configuration</Th>
                  <Th className="tenant-admin-catalog-manager__col-source">Source</Th>
                  <Th className="tenant-admin-catalog-manager__col-added">Added</Th>
                  <Th screenReaderText="Actions" className="tenant-admin-catalog-manager__col-action" />
                </Tr>
              </Thead>
              <Tbody>
                {filteredItems.map((item) => {
                  const catalogItemActions = buildCatalogItemActions(item)

                  return (
                    <Tr key={item.id}>
                      <Td dataLabel="Name" className="tenant-admin-catalog-manager__col-name">
                        <Content component="p" className="tenant-admin-catalog-manager__primary-cell">
                          <Button
                            variant="link"
                            isInline
                            className="tenant-admin-catalog-manager__name-link catalog-item-name-link"
                            onClick={() => openDetails(item)}
                          >
                            {item.displayName}
                          </Button>
                        </Content>
                        <TenantAdminCatalogServiceType service={item.service} variant="list" />
                      </Td>
                      <Td dataLabel="Status" className="tenant-admin-catalog-manager__col-status">
                        <Label color={item.status === 'Unpublished' ? 'grey' : 'green'} isCompact>
                          {item.status}
                        </Label>
                      </Td>
                      <Td dataLabel="Configuration" className="tenant-admin-catalog-manager__col-configuration">
                        <CatalogSpecRowsList
                          rows={item.specRows}
                          className="catalog-table-specs-list"
                          rowClassName="catalog-table-spec-row"
                          labelClassName="catalog-table-spec-label"
                          valueClassName="catalog-table-spec-value"
                        />
                      </Td>
                      <Td dataLabel="Source" className="tenant-admin-catalog-manager__col-source">
                        <TenantAdminCatalogOriginLine
                          item={item}
                          includeDate={false}
                          className="tenant-admin-catalog-manager__list-origin"
                          iconClassName="tenant-admin-catalog-manager__list-origin-icon"
                        />
                      </Td>
                      <Td dataLabel="Added" className="tenant-admin-catalog-manager__col-added">
                        {getTenantAdminCatalogAddedDate(item) ?? '—'}
                      </Td>
                      <Td isActionCell className="tenant-admin-catalog-manager__col-action">
                        <ActionsColumn items={catalogItemActions} />
                      </Td>
                    </Tr>
                  )
                })}
              </Tbody>
            </Table>
          </div>
        )}
      </div>
      )}

      <Modal
        variant={ModalVariant.small}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        aria-labelledby="tenant-edit-catalog-item-title"
      >
        <ModalHeader title="Edit catalog item" labelId="tenant-edit-catalog-item-title" />
        <ModalBody>
          <Form>
            <FormGroup label="Name" fieldId="tenant-edit-catalog-display-name" isRequired>
              <KubernetesResourceNameField
                id="tenant-edit-catalog-display-name"
                value={editDisplayName}
                onChange={setEditDisplayName}
                aria-label="Name"
                isRequired
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={handleSaveEdit}
            isDisabled={!isValidKubernetesResourceName(editDisplayName)}
          >
            Save
          </Button>
          <Button variant="link" onClick={() => setIsEditModalOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        variant={ModalVariant.small}
        isOpen={isUnpublishModalOpen}
        onClose={() => setIsUnpublishModalOpen(false)}
        aria-labelledby="tenant-unpublish-catalog-item-title"
      >
        <ModalHeader
          title="Unpublish catalog item?"
          labelId="tenant-unpublish-catalog-item-title"
        />
        <ModalBody>
          <Content component="p">
            {selectedCatalogItem ? (
              <>
                <strong>{selectedCatalogItem.displayName}</strong> will leave the tenant storefront.
                You can publish it again later.
              </>
            ) : (
              'This catalog item will leave the tenant storefront. You can publish it again later.'
            )}
          </Content>
        </ModalBody>
        <ModalFooter>
          <Button variant="primary" onClick={handleConfirmUnpublish}>
            Unpublish
          </Button>
          <Button variant="link" onClick={() => setIsUnpublishModalOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        variant={ModalVariant.small}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        aria-labelledby="tenant-delete-catalog-item-title"
        aria-describedby="tenant-delete-catalog-item-description"
      >
        <ModalHeader
          title="Delete catalog item?"
          titleIconVariant="warning"
          labelId="tenant-delete-catalog-item-title"
        />
        <ModalBody>
          <Content component="p" id="tenant-delete-catalog-item-description">
            {selectedCatalogItem ? (
              <>
                <strong>{selectedCatalogItem.displayName}</strong> will be permanently removed from
                the catalog. This cannot be undone.
              </>
            ) : (
              'This catalog item will be permanently removed from the catalog. This cannot be undone.'
            )}
          </Content>
        </ModalBody>
        <ModalFooter>
          <Button variant="danger" onClick={handleConfirmDelete}>
            Delete
          </Button>
          <Button variant="link" onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
