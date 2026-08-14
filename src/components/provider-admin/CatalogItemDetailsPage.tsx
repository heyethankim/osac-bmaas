import { useEffect, useRef, useState } from 'react'
import { RocketIcon } from '@patternfly/react-icons/dist/esm/icons/rocket-icon'
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
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
  Icon,
  Label,
  MenuToggle,
  Spinner,
  Title,
} from '@patternfly/react-core'
import { CatalogClusterVersionValue } from '../catalog/CatalogClusterVersionValue'
import { CatalogVmDefaultsSections } from '../catalog/CatalogVmDefaultsSections'
import { BareMetalCatalogItemDetailsBody } from '../catalog/BareMetalCatalogItemDetailsBody'
import { ClusterCatalogItemDetailsBody } from '../catalog/ClusterCatalogItemDetailsBody'
import { CatalogPublishScopeIcon } from './CatalogPublishScopeIcon'
import {
  formatVipEnterpriseVisibilityLabel,
  getCatalogEnterpriseTenantIds,
} from './VipEnterpriseOrganizationField'
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import {
  getCatalogItemStatus,
  getProviderRegisteredOrganizations,
} from '../../providerSetup/storage'
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'
import {
  CATALOG_SERVICE_FILTER_LABELS,
  formatRateCardSummary,
  type CatalogServiceId,
} from '../../providerSetup/templateDemo'
import { formatCatalogItemCreatedAt } from '../../catalog/catalogDetails'
import { getCatalogItemUserDescription } from '../../catalog/catalogItemDescriptions'
import {
  getCatalogSpecsSectionLabel,
  getDraftServiceId,
  parseCatalogInstanceTypeParts,
  resolveCatalogSpecRows,
  resolveVmCatalogHighlightRows,
} from '../../catalog/catalogSpecs'
import { formatCatalogFieldPolicyMode } from '../../catalog/catalogPublishConfig'
import { LAUNCH_INSTANCE_WIZARD_DEMO } from '../../tenantUser/launchInstanceWizard'

/** Demo delay for Publish → Publishing ... → Launch instance. */
const DETAIL_PUBLISH_REVEAL_MS = 1500

type DetailPublishCtaPhase = 'publish' | 'publishing' | 'launch'

type CatalogItemDetailsPageProps = {
  catalog: ProviderCatalogDraft
  templateDescription: string
  onBackToCatalog: () => void
  /** Persist the item as live (parent should write storage immediately). */
  onPublish: () => void
  onUnpublish: () => void
  isPublishing?: boolean
  onLaunch: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}

function getInitialPublishCtaPhase(catalog: ProviderCatalogDraft): DetailPublishCtaPhase {
  return getCatalogItemStatus(catalog) === 'live' ? 'launch' : 'publish'
}

function getCatalogPublishingExtras(
  catalog: ProviderCatalogDraft,
  organizations: ReturnType<typeof getProviderRegisteredOrganizations>,
) {
  if (catalog.scope !== 'vip-enterprise') {
    return null
  }

  const enterpriseTenantIds = getCatalogEnterpriseTenantIds(catalog)

  if (enterpriseTenantIds.length > 0) {
    return (
      <DescriptionListGroup>
        <DescriptionListTerm>
          {enterpriseTenantIds.length > 1 ? 'Enterprise organizations' : 'Enterprise organization'}
        </DescriptionListTerm>
        <DescriptionListDescription>
          {formatVipEnterpriseVisibilityLabel(organizations, enterpriseTenantIds).replace(
            /^VIP enterprise · /,
            '',
          )}
        </DescriptionListDescription>
      </DescriptionListGroup>
    )
  }

  return (
    <DescriptionListGroup>
      <DescriptionListTerm>Enterprise organizations</DescriptionListTerm>
      <DescriptionListDescription>Restricted — unassigned</DescriptionListDescription>
    </DescriptionListGroup>
  )
}

export function CatalogItemDetailsPage({
  catalog,
  templateDescription,
  onBackToCatalog,
  onPublish,
  onUnpublish,
  onLaunch,
  onEdit,
  onDuplicate,
  onDelete,
}: CatalogItemDetailsPageProps) {
  const organizations = getProviderRegisteredOrganizations()
  const serviceId: CatalogServiceId = getDraftServiceId(catalog)
  const isBareMetal = serviceId === 'baremetal'
  const scopeLabel = catalog.scope === 'vip-enterprise' ? 'VIP enterprise' : 'Global public'
  const isLive = getCatalogItemStatus(catalog) === 'live'
  const isVirtualMachine = serviceId === 'virtual-machine'
  const isCluster = serviceId === 'cluster'
  const parsedInstanceType = catalog.instanceTypeLabel
    ? parseCatalogInstanceTypeParts(catalog.instanceTypeLabel)
    : null
  const specRows = resolveCatalogSpecRows(catalog, { includeDetails: true })
  const vmHighlightRows = isVirtualMachine ? resolveVmCatalogHighlightRows(catalog) : []
  const displaySpecRows =
    catalog.instanceTypeLabel || catalog.diskImageLabel
      ? specRows.filter((row) => {
          if (isCluster) {
            return (
              row.label !== 'Instance type' &&
              row.label !== 'Disk image' &&
              row.label !== 'Platform' &&
              row.label !== 'Size' &&
              row.label !== 'OS image'
            )
          }
          return (
            row.label !== 'Instance type' &&
            row.label !== 'Cluster size' &&
            row.label !== 'Disk image' &&
            row.label !== 'Platform' &&
            row.label !== 'Cluster version' &&
            row.label !== 'Size' &&
            row.label !== 'OS image'
          )
        })
      : isVirtualMachine
        ? specRows.filter(
            (row) =>
              row.label !== 'Instance type' &&
              row.label !== 'Size' &&
              row.label !== 'OS image',
          )
        : specRows
  const specsSectionLabel = getCatalogSpecsSectionLabel(serviceId)
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  // Detail page owns the CTA so Publish → Publishing ... → Launch cannot be stolen by
  // lagging list props. Parent still persists status for cards / navigation.
  const [publishCtaPhase, setPublishCtaPhase] = useState<DetailPublishCtaPhase>(() =>
    getInitialPublishCtaPhase(catalog),
  )
  const publishCtaTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (publishCtaTimerRef.current !== null) {
      window.clearTimeout(publishCtaTimerRef.current)
      publishCtaTimerRef.current = null
    }
    setPublishCtaPhase(getInitialPublishCtaPhase(catalog))
  }, [catalog.catalogItemId])

  useEffect(() => {
    // Ignore storage while the local Publishing animation is running.
    if (publishCtaPhase === 'publishing') {
      return
    }
    setPublishCtaPhase(isLive ? 'launch' : 'publish')
  }, [isLive, publishCtaPhase, catalog.catalogItemId])

  useEffect(() => {
    return () => {
      if (publishCtaTimerRef.current !== null) {
        window.clearTimeout(publishCtaTimerRef.current)
      }
    }
  }, [])

  const handlePublishClick = () => {
    if (publishCtaPhase !== 'publish') {
      return
    }

    setPublishCtaPhase('publishing')
    onPublish()

    if (publishCtaTimerRef.current !== null) {
      window.clearTimeout(publishCtaTimerRef.current)
    }
    publishCtaTimerRef.current = window.setTimeout(() => {
      setPublishCtaPhase('launch')
      publishCtaTimerRef.current = null
    }, DETAIL_PUBLISH_REVEAL_MS)
  }

  // Local phase is the source of truth for the primary CTA during Publish → Launch.
  const showPublishing = publishCtaPhase === 'publishing'
  const showLaunch = publishCtaPhase === 'launch'

  return (
    <div className="provider-admin-catalog-item-details">
      <Breadcrumb aria-label="Catalog item breadcrumb">
        <BreadcrumbItem to="#" onClick={(event) => {
          event.preventDefault()
          onBackToCatalog()
        }}>
          Catalog
        </BreadcrumbItem>
        <BreadcrumbItem isActive>{catalog.displayName}</BreadcrumbItem>
      </Breadcrumb>

      <Flex
        className="provider-admin-catalog-item-details__header"
        alignItems={{ default: 'alignItemsFlexStart' }}
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        gap={{ default: 'gapMd' }}
      >
        <FlexItem>
          <div className="provider-admin-catalog-item-details__title-row">
            <span className="provider-admin-catalog-item-details__icon-wrap" aria-hidden>
              <Icon size="lg" isInline>
                {getCatalogServiceIcon(serviceId)}
              </Icon>
            </span>
            <div>
              <Title
                headingLevel="h1"
                size="3xl"
                id="catalog-item-details-title"
                className="provider-admin-catalog-item-details__title"
              >
                {catalog.displayName}
              </Title>
              <Content component="p" className="provider-admin-catalog-item-details__lede">
                {getCatalogItemUserDescription(catalog, { templateDescription })}
              </Content>
            </div>
          </div>
        </FlexItem>
        <FlexItem alignSelf={{ default: 'alignSelfFlexStart' }}>
          <div className="provider-admin-catalog-item-details__actions">
            {showLaunch ? (
              <Button variant="primary" icon={<RocketIcon />} onClick={onLaunch}>
                {LAUNCH_INSTANCE_WIZARD_DEMO.launchInstanceLabel}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handlePublishClick}
                isDisabled={showPublishing}
              >
                {showPublishing ? (
                  <span className="provider-admin-catalog__submit-label">
                    <Spinner size="sm" aria-label={`Publishing ${catalog.displayName}`} />
                    <span>Publishing ...</span>
                  </span>
                ) : (
                  'Publish'
                )}
              </Button>
            )}
            <Dropdown
              isOpen={isActionsOpen}
              onOpenChange={setIsActionsOpen}
              onSelect={() => setIsActionsOpen(false)}
              popperProps={{ position: 'right' }}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  variant="secondary"
                  isExpanded={isActionsOpen}
                  onClick={() => setIsActionsOpen((open) => !open)}
                  aria-label="Actions"
                >
                  Actions
                </MenuToggle>
              )}
            >
              <DropdownList>
                <DropdownItem
                  value="edit"
                  onClick={onEdit}
                  isDisabled={showPublishing}
                >
                  Edit
                </DropdownItem>
                <DropdownItem value="duplicate" onClick={onDuplicate}>
                  Duplicate
                </DropdownItem>
                <Divider component="li" key="separator" />
                {showLaunch ? (
                  <DropdownItem value="unpublish" onClick={onUnpublish}>
                    Unpublish
                  </DropdownItem>
                ) : null}
                <DropdownItem value="delete" isDanger onClick={onDelete} isDisabled={showPublishing}>
                  Delete
                </DropdownItem>
              </DropdownList>
            </Dropdown>
          </div>
        </FlexItem>
      </Flex>

      <div className="provider-admin-catalog-item-details__body">
        <Divider className="provider-admin-catalog-item-details__band-divider" />
        <section
          className="provider-admin-catalog-item-details__details-band"
          aria-label="Catalog item details"
        >
          {isBareMetal ? (
            <BareMetalCatalogItemDetailsBody
              variant="provider"
              content={{
                service: CATALOG_SERVICE_FILTER_LABELS[serviceId],
                statusLabel: showLaunch ? 'Live' : showPublishing ? 'Publishing' : 'Unpublished',
                statusColor: showLaunch ? 'green' : showPublishing ? 'blue' : 'grey',
                catalogItemId: catalog.catalogItemId,
                rateSummary: formatRateCardSummary(catalog.rateCard),
                scope: catalog.scope,
                visibilityLabel: scopeLabel,
                createdAtLabel: formatCatalogItemCreatedAt(catalog.createdAt),
                hardwareSpecRows: resolveCatalogSpecRows(catalog),
              }}
              publishingExtras={getCatalogPublishingExtras(catalog, organizations)}
            />
          ) : isCluster ? (
            <ClusterCatalogItemDetailsBody
              variant="provider"
              content={{
                service: CATALOG_SERVICE_FILTER_LABELS[serviceId],
                statusLabel: showLaunch ? 'Live' : showPublishing ? 'Publishing' : 'Unpublished',
                statusColor: showLaunch ? 'green' : showPublishing ? 'blue' : 'grey',
                catalogItemId: catalog.catalogItemId,
                rateSummary: formatRateCardSummary(catalog.rateCard),
                scope: catalog.scope,
                visibilityLabel: scopeLabel,
                createdAtLabel: formatCatalogItemCreatedAt(catalog.createdAt),
                clusterVersionMode: catalog.clusterVersionMode,
                configurationRows: resolveCatalogSpecRows(catalog, { includeDetails: true }),
              }}
              publishingExtras={getCatalogPublishingExtras(catalog, organizations)}
            />
          ) : (
          <div className="provider-admin-catalog-item-details__columns">
            <div className="provider-admin-catalog-item-details__column">
              <Title
                headingLevel="h2"
                size="lg"
                className="provider-admin-catalog-item-details__section-title"
              >
                Overview
              </Title>
              <DescriptionList
                isCompact
                className="provider-admin-catalog-item-details__dl"
                aria-label="Catalog item overview"
              >
                <DescriptionListGroup>
                  <DescriptionListTerm>Service</DescriptionListTerm>
                  <DescriptionListDescription>
                    {CATALOG_SERVICE_FILTER_LABELS[serviceId]}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Status</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label
                      color={showLaunch ? 'green' : showPublishing ? 'blue' : 'grey'}
                      isCompact
                    >
                      {showLaunch ? 'Live' : showPublishing ? 'Publishing' : 'Unpublished'}
                    </Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Catalog item ID</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code>{catalog.catalogItemId}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Rate</DescriptionListTerm>
                  <DescriptionListDescription>
                    {formatRateCardSummary(catalog.rateCard)}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </div>

            <div className="provider-admin-catalog-item-details__column">
              <Title
                headingLevel="h2"
                size="lg"
                className="provider-admin-catalog-item-details__section-title"
              >
                Publishing
              </Title>
              <DescriptionList
                isCompact
                className="provider-admin-catalog-item-details__dl"
                aria-label="Catalog item publishing details"
              >
                <DescriptionListGroup>
                  <DescriptionListTerm>Visibility</DescriptionListTerm>
                  <DescriptionListDescription>
                    <span className="provider-admin-catalog-items__scope">
                      <CatalogPublishScopeIcon
                        scope={catalog.scope}
                        className="provider-admin-catalog__scope-icon"
                      />
                      <span>{scopeLabel}</span>
                    </span>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                {catalog.scope === 'vip-enterprise' &&
                getCatalogEnterpriseTenantIds(catalog).length > 0 ? (
                  <DescriptionListGroup>
                    <DescriptionListTerm>
                      {getCatalogEnterpriseTenantIds(catalog).length > 1
                        ? 'Enterprise organizations'
                        : 'Enterprise organization'}
                    </DescriptionListTerm>
                    <DescriptionListDescription>
                      {formatVipEnterpriseVisibilityLabel(
                        organizations,
                        getCatalogEnterpriseTenantIds(catalog),
                      ).replace(/^VIP enterprise · /, '')}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                ) : catalog.scope === 'vip-enterprise' ? (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Enterprise organizations</DescriptionListTerm>
                    <DescriptionListDescription>Restricted — unassigned</DescriptionListDescription>
                  </DescriptionListGroup>
                ) : null}
                <DescriptionListGroup>
                  <DescriptionListTerm>Created</DescriptionListTerm>
                  <DescriptionListDescription>
                    {formatCatalogItemCreatedAt(catalog.createdAt)}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>

              {catalog.fieldPolicies && catalog.fieldPolicies.length > 0 ? (
                <>
                  <Title
                    headingLevel="h2"
                    size="lg"
                    className="provider-admin-catalog-item-details__section-title"
                  >
                    Field policies
                  </Title>
                  <DescriptionList
                    isCompact
                    className="provider-admin-catalog-item-details__dl"
                    aria-label="Launch field policies"
                  >
                    <DescriptionListGroup>
                      <DescriptionListTerm>Policies</DescriptionListTerm>
                      <DescriptionListDescription>
                        <ul className="provider-admin-catalog-items__field-policy-list">
                          {catalog.fieldPolicies.map((policy) => (
                            <li key={policy.id}>
                              <span>{policy.label}</span>
                              <Label
                                color={policy.mode === 'exposed' ? 'blue' : 'grey'}
                                isCompact
                              >
                                {formatCatalogFieldPolicyMode(policy.mode)}
                              </Label>
                            </li>
                          ))}
                        </ul>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  </DescriptionList>
                </>
              ) : null}
            </div>

            <div className="provider-admin-catalog-item-details__column provider-admin-catalog-item-details__column--config">
              {isVirtualMachine && vmHighlightRows.length > 0 ? (
                <>
                  <Title
                    headingLevel="h2"
                    size="md"
                    className="provider-admin-catalog-item-details__section-title provider-admin-catalog-item-details__section-title--config"
                  >
                    Instance configuration
                  </Title>
                  <DescriptionList
                    isCompact
                    className="provider-admin-catalog-item-details__dl"
                    aria-label="Instance configuration"
                  >
                    {vmHighlightRows.map((row) => (
                      <DescriptionListGroup key={row.label}>
                        <DescriptionListTerm>{row.label}</DescriptionListTerm>
                        <DescriptionListDescription>{row.value}</DescriptionListDescription>
                      </DescriptionListGroup>
                    ))}
                  </DescriptionList>
                </>
              ) : null}

              {isVirtualMachine ? (
                <CatalogVmDefaultsSections idPrefix="provider-admin-catalog-vm" />
              ) : displaySpecRows.length > 0 ? (
                <>
                  <Title
                    headingLevel="h2"
                    size="md"
                    className="provider-admin-catalog-item-details__section-title provider-admin-catalog-item-details__section-title--config"
                  >
                    {specsSectionLabel}
                  </Title>
                  <DescriptionList
                    isCompact
                    className="provider-admin-catalog-item-details__dl"
                    aria-label={specsSectionLabel}
                  >
                    {displaySpecRows.map((row) => (
                      <DescriptionListGroup key={row.label}>
                        <DescriptionListTerm>{row.label}</DescriptionListTerm>
                        <DescriptionListDescription>
                          {row.label === 'Cluster version' ? (
                            <CatalogClusterVersionValue
                              badge={row.badge}
                              mode={catalog.clusterVersionMode}
                            >
                              {row.value}
                            </CatalogClusterVersionValue>
                          ) : row.badge ? (
                            <span className="catalog-spec-row-value-with-badge">
                              <span>{row.value}</span>
                              <Label color={row.badge.color} isCompact>
                                {row.badge.text}
                              </Label>
                            </span>
                          ) : (
                            row.value
                          )}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    ))}
                  </DescriptionList>
                </>
              ) : null}

              {!isVirtualMachine &&
              !isCluster &&
              (catalog.instanceTypeLabel || catalog.diskImageLabel) ? (
                <>
                  {displaySpecRows.length === 0 ? (
                    <Title
                      headingLevel="h2"
                      size="md"
                      className="provider-admin-catalog-item-details__section-title provider-admin-catalog-item-details__section-title--config"
                    >
                      Hardware specifications
                    </Title>
                  ) : null}
                  <DescriptionList
                    isCompact
                    className="provider-admin-catalog-item-details__dl"
                    aria-label="Published hardware"
                  >
                    {catalog.instanceTypeLabel && parsedInstanceType ? (
                      <DescriptionListGroup>
                        <DescriptionListTerm>Instance type</DescriptionListTerm>
                        <DescriptionListDescription>
                          {catalog.instanceTypeLabel}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    ) : null}
                    {catalog.diskImageLabel ? (
                      <DescriptionListGroup>
                        <DescriptionListTerm>Disk image</DescriptionListTerm>
                        <DescriptionListDescription>
                          {catalog.diskImageLabel}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    ) : null}
                  </DescriptionList>
                </>
              ) : null}
            </div>
          </div>
          )}
        </section>
      </div>
    </div>
  )
}
