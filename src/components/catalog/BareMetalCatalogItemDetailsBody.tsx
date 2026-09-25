import type { ReactNode } from 'react'
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Title,
} from '@patternfly/react-core'
import type { CatalogSpecRow } from '../../catalog/catalogSpecs'
import { getCatalogSpecsSectionLabel } from '../../catalog/catalogSpecs'
import type { PublishCatalogScope } from '../../providerSetup/templateDemo'
import { CatalogDiskImageValue } from './CatalogDiskImageValue'
import { CatalogPublishScopeIcon } from '../provider-admin/CatalogPublishScopeIcon'

export type BareMetalCatalogDetailsVariant = 'entity' | 'provider'

export type BareMetalCatalogDetailsContent = {
  service: string
  statusLabel: string
  statusColor: 'green' | 'grey' | 'blue'
  rateSummary: string
  scope: PublishCatalogScope
  visibilityLabel: string
  createdAtLabel: string
  hardwareSpecRows: CatalogSpecRow[]
}

type BareMetalCatalogItemDetailsBodyProps = {
  content: BareMetalCatalogDetailsContent
  variant: BareMetalCatalogDetailsVariant
  publishingExtras?: ReactNode
}

const INSTANCE_TYPE_CHILD_LABELS = new Set(['CPU', 'RAM', 'GPU'])

function getClassPrefix(variant: BareMetalCatalogDetailsVariant): string {
  return variant === 'entity' ? 'entity-details-page' : 'provider-admin-catalog-item-details'
}

function isOsImageSpecLabel(label: string): boolean {
  return label === 'OS image' || label === 'Disk image'
}

function isInstanceTypeParentLabel(label: string): boolean {
  return label === 'Instance type' || label === 'Size'
}

function renderHardwareSpecRowValue(row: CatalogSpecRow) {
  const value = isOsImageSpecLabel(row.label) ? (
    <CatalogDiskImageValue badge={row.badge}>{row.value}</CatalogDiskImageValue>
  ) : (
    row.value
  )

  if (!row.badge || isOsImageSpecLabel(row.label)) {
    return value
  }

  return (
    <span className="catalog-spec-row-value-with-badge">
      {value}
      <Label color={row.badge.color} isCompact>
        {row.badge.text}
      </Label>
    </span>
  )
}

function partitionBareMetalHardwareRows(rows: CatalogSpecRow[]) {
  const instanceType = rows.find((row) => isInstanceTypeParentLabel(row.label)) ?? null
  const instanceTypeChildren = rows.filter((row) => INSTANCE_TYPE_CHILD_LABELS.has(row.label))
  const osImage = rows.find((row) => isOsImageSpecLabel(row.label)) ?? null
  const otherRows = rows.filter(
    (row) =>
      !isInstanceTypeParentLabel(row.label) &&
      !INSTANCE_TYPE_CHILD_LABELS.has(row.label) &&
      !isOsImageSpecLabel(row.label),
  )

  return { instanceType, instanceTypeChildren, osImage, otherRows }
}

export function BareMetalCatalogItemDetailsBody({
  content,
  variant,
  publishingExtras,
}: BareMetalCatalogItemDetailsBodyProps) {
  const prefix = getClassPrefix(variant)
  const specsSectionLabel = getCatalogSpecsSectionLabel('baremetal')
  const scopeWrapClass =
    variant === 'entity' ? 'tenant-admin-catalog-manager__scope' : 'provider-admin-catalog-items__scope'
  const scopeIconClass =
    variant === 'entity'
      ? 'tenant-admin-catalog-manager__scope-icon'
      : 'provider-admin-catalog__scope-icon'
  const { instanceType, instanceTypeChildren, osImage, otherRows } = partitionBareMetalHardwareRows(
    content.hardwareSpecRows,
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
        {content.hardwareSpecRows.length > 0 ? (
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
              {instanceType ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>Instance type</DescriptionListTerm>
                  <DescriptionListDescription>
                    {renderHardwareSpecRowValue(instanceType)}
                    {instanceTypeChildren.length > 0 ? (
                      <DescriptionList
                        isCompact
                        className={`${prefix}__dl ${prefix}__dl--nested`}
                        aria-label="Instance type specifications"
                      >
                        {instanceTypeChildren.map((row) => (
                          <DescriptionListGroup key={row.label}>
                            <DescriptionListTerm>{row.label}</DescriptionListTerm>
                            <DescriptionListDescription>
                              {renderHardwareSpecRowValue(row)}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                        ))}
                      </DescriptionList>
                    ) : null}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ) : (
                instanceTypeChildren.map((row) => (
                  <DescriptionListGroup key={row.label}>
                    <DescriptionListTerm>{row.label}</DescriptionListTerm>
                    <DescriptionListDescription>
                      {renderHardwareSpecRowValue(row)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                ))
              )}
              {osImage ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>OS image</DescriptionListTerm>
                  <DescriptionListDescription>
                    {renderHardwareSpecRowValue(osImage)}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ) : null}
              {otherRows.map((row) => (
                <DescriptionListGroup key={row.label}>
                  <DescriptionListTerm>{row.label}</DescriptionListTerm>
                  <DescriptionListDescription>
                    {renderHardwareSpecRowValue(row)}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ))}
            </DescriptionList>
          </>
        ) : null}
      </div>
    </div>
  )
}
