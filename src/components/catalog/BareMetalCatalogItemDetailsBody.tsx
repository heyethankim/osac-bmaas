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

function getClassPrefix(variant: BareMetalCatalogDetailsVariant): string {
  return variant === 'entity' ? 'entity-details-page' : 'provider-admin-catalog-item-details'
}

function renderHardwareSpecRowValue(row: CatalogSpecRow) {
  const value =
    row.label === 'Disk image' ? (
      <CatalogDiskImageValue badge={row.badge}>{row.value}</CatalogDiskImageValue>
    ) : (
      row.value
    )

  if (!row.badge || row.label === 'Disk image') {
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
              <span className={scopeWrapClass}>
                <CatalogPublishScopeIcon scope={content.scope} className={scopeIconClass} />
                <span>{content.visibilityLabel}</span>
              </span>
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
              {content.hardwareSpecRows.map((row) => (
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
