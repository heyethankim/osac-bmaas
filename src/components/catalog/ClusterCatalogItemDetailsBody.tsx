import type { ReactNode } from 'react'
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Title,
} from '@patternfly/react-core'
import {
  CLUSTER_NODE_SETS_PARENT_LABEL,
  type CatalogSpecRow,
  getCatalogSpecsSectionLabel,
} from '../../catalog/catalogSpecs'
import type { CatalogClusterVersionMode } from '../../catalog/catalogPublishConfig'
import type { PublishCatalogScope } from '../../providerSetup/templateDemo'
import { CatalogClusterVersionValue } from './CatalogClusterVersionValue'
import { CatalogPublishScopeIcon } from '../provider-admin/CatalogPublishScopeIcon'

export type ClusterCatalogDetailsVariant = 'entity' | 'provider'

export type ClusterCatalogDetailsContent = {
  service: string
  statusLabel: string
  statusColor: 'green' | 'grey' | 'blue'
  rateSummary: string
  scope: PublishCatalogScope
  visibilityLabel: string
  createdAtLabel: string
  clusterVersionMode?: CatalogClusterVersionMode
  configurationRows: CatalogSpecRow[]
}

type ClusterCatalogItemDetailsBodyProps = {
  content: ClusterCatalogDetailsContent
  variant: ClusterCatalogDetailsVariant
  publishingExtras?: ReactNode
}

function getClassPrefix(variant: ClusterCatalogDetailsVariant): string {
  return variant === 'entity' ? 'entity-details-page' : 'provider-admin-catalog-item-details'
}

function isNodeSetsParentLabel(label: string): boolean {
  return label === CLUSTER_NODE_SETS_PARENT_LABEL
}

function partitionClusterConfigurationRows(rows: CatalogSpecRow[]) {
  const clusterVersion = rows.find((row) => row.label === 'Cluster version') ?? null
  const nodeSets = rows.find((row) => isNodeSetsParentLabel(row.label)) ?? null
  const nodeSetChildren = rows.filter(
    (row) => row.label !== 'Cluster version' && !isNodeSetsParentLabel(row.label),
  )

  return { clusterVersion, nodeSets, nodeSetChildren }
}

function renderConfigurationRowValue(
  row: CatalogSpecRow,
  clusterVersionMode?: CatalogClusterVersionMode,
) {
  if (row.label === 'Cluster version') {
    return (
      <CatalogClusterVersionValue badge={row.badge} mode={clusterVersionMode}>
        {row.value}
      </CatalogClusterVersionValue>
    )
  }

  if (isNodeSetsParentLabel(row.label) && row.badge) {
    return (
      <Label color={row.badge.color} isCompact>
        {row.badge.text}
      </Label>
    )
  }

  if (row.badge) {
    return (
      <span className="catalog-spec-row-value-with-badge">
        <span>{row.value}</span>
        <Label color={row.badge.color} isCompact>
          {row.badge.text}
        </Label>
      </span>
    )
  }

  return row.value
}

export function ClusterCatalogItemDetailsBody({
  content,
  variant,
  publishingExtras,
}: ClusterCatalogItemDetailsBodyProps) {
  const prefix = getClassPrefix(variant)
  const specsSectionLabel = getCatalogSpecsSectionLabel('cluster')
  const scopeWrapClass =
    variant === 'entity' ? 'tenant-admin-catalog-manager__scope' : 'provider-admin-catalog-items__scope'
  const scopeIconClass =
    variant === 'entity'
      ? 'tenant-admin-catalog-manager__scope-icon'
      : 'provider-admin-catalog__scope-icon'
  const { clusterVersion, nodeSets, nodeSetChildren } = partitionClusterConfigurationRows(
    content.configurationRows,
  )

  return (
    <div className={`${prefix}__columns`}>
      <div className={`${prefix}__column`}>
        <Title headingLevel="h2" size="lg" className={`${prefix}__section-title`}>
          Overview
        </Title>
        <DescriptionList
          isCompact
          className={`${prefix}__dl`}
          aria-label="Catalog item overview"
        >
          <DescriptionListGroup>
            <DescriptionListTerm>Service</DescriptionListTerm>
            <DescriptionListDescription>{content.service}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Status</DescriptionListTerm>
            <DescriptionListDescription>
              <Label color={content.statusColor} isCompact>
                {content.statusLabel}
              </Label>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Rate</DescriptionListTerm>
            <DescriptionListDescription>{content.rateSummary}</DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </div>

      <div className={`${prefix}__column`}>
        <Title headingLevel="h2" size="lg" className={`${prefix}__section-title`}>
          Publishing
        </Title>
        <DescriptionList
          isCompact
          className={`${prefix}__dl`}
          aria-label="Catalog item publishing details"
        >
          <DescriptionListGroup>
            <DescriptionListTerm>Visibility</DescriptionListTerm>
            <DescriptionListDescription>
              {variant === 'entity' ? (
                content.visibilityLabel
              ) : (
                <span className={scopeWrapClass}>
                  <CatalogPublishScopeIcon scope={content.scope} className={scopeIconClass} />
                  <span>{content.visibilityLabel}</span>
                </span>
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
          {publishingExtras}
          <DescriptionListGroup>
            <DescriptionListTerm>Created</DescriptionListTerm>
            <DescriptionListDescription>{content.createdAtLabel}</DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </div>

      <div
        className={[
          `${prefix}__column`,
          `${prefix}__column--config`,
          `${prefix}__column--span-rows`,
        ].join(' ')}
      >
        {content.configurationRows.length > 0 ? (
          <>
            <Title
              headingLevel="h2"
              size="md"
              className={`${prefix}__section-title ${prefix}__section-title--config`}
            >
              {specsSectionLabel}
            </Title>
            <DescriptionList
              isCompact
              className={`${prefix}__dl`}
              aria-label={specsSectionLabel}
            >
              {clusterVersion ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>{clusterVersion.label}</DescriptionListTerm>
                  <DescriptionListDescription>
                    {renderConfigurationRowValue(clusterVersion, content.clusterVersionMode)}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ) : null}
              {nodeSets ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>{nodeSets.label}</DescriptionListTerm>
                  <DescriptionListDescription>
                    {renderConfigurationRowValue(nodeSets, content.clusterVersionMode)}
                    {nodeSetChildren.length > 0 ? (
                      <DescriptionList
                        isCompact
                        className={`${prefix}__dl ${prefix}__dl--nested`}
                        aria-label="Node sets"
                      >
                        {nodeSetChildren.map((row) => (
                          <DescriptionListGroup key={row.label}>
                            <DescriptionListTerm>{row.label}</DescriptionListTerm>
                            <DescriptionListDescription>
                              {renderConfigurationRowValue(row, content.clusterVersionMode)}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                        ))}
                      </DescriptionList>
                    ) : null}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ) : (
                nodeSetChildren.map((row) => (
                  <DescriptionListGroup key={row.label}>
                    <DescriptionListTerm>{row.label}</DescriptionListTerm>
                    <DescriptionListDescription>
                      {renderConfigurationRowValue(row, content.clusterVersionMode)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                ))
              )}
            </DescriptionList>
          </>
        ) : null}
      </div>
    </div>
  )
}
