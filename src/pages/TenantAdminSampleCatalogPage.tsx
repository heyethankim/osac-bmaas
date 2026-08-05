import { useMemo } from 'react'
import {
  Card,
  CardBody,
  Content,
  Label,
  Title,
} from '@patternfly/react-core'
import { CatalogSpecRowsList } from '../components/catalog/CatalogSpecRowsList'
import { ConceptualDesignSticker } from '../components/ConceptualDesignSticker'
import { RouterButton } from '../components/RouterButton'
import { getCatalogServiceIcon } from '../catalog/serviceIcons'
import { resolveCatalogSpecRows } from '../catalog/catalogSpecs'
import {
  BARE_METAL_AI_INFERENCE_CATALOG_ITEM_ID,
  ensureProviderCatalogDemoItems,
} from '../providerSetup/prototypeEntry'
import { CATALOG_SERVICE_LABELS, SECOND_CATALOG_ITEM_DISPLAY_NAME } from '../providerSetup/templateDemo'
import type { ProviderCatalogDraft } from '../providerSetup/storage'

function getSampleCatalogItem(): ProviderCatalogDraft {
  const items = ensureProviderCatalogDemoItems()
  return (
    items.find((item) => item.catalogItemId === BARE_METAL_AI_INFERENCE_CATALOG_ITEM_ID) ??
    items.find((item) => item.displayName === SECOND_CATALOG_ITEM_DISPLAY_NAME) ??
    items.find((item) => item.serviceId === 'baremetal') ??
    items[0]!
  )
}

/**
 * Standalone Tenant Admin sample: one bare metal catalog item, no workspace chrome.
 * Linked from the landing page under Tenant Admin → Catalog.
 */
export function TenantAdminSampleCatalogPage() {
  const item = useMemo(() => getSampleCatalogItem(), [])
  const serviceId = item.serviceId ?? 'baremetal'
  const specRows = resolveCatalogSpecRows(item)

  return (
    <div className="tenant-admin-sample-catalog">
      <div className="tenant-admin-sample-catalog__frame">
        <header className="tenant-admin-sample-catalog__header">
          <Content component="p" className="tenant-admin-sample-catalog__kicker">
            Tenant Admin · Catalog sample
          </Content>
          <Title headingLevel="h1" size="3xl" className="tenant-admin-sample-catalog__title">
            Catalog with a sample
          </Title>
          <Content component="p" className="tenant-admin-sample-catalog__lede">
            One bare metal catalog item — the simplest view of what tenants approve and offer.
          </Content>
        </header>

        <div className="tenant-admin-sample-catalog__stage">
          <Card className="tenant-admin-sample-catalog__card" isCompact={false}>
            <CardBody>
              <div className="tenant-admin-sample-catalog__card-header">
                <span className="tenant-admin-sample-catalog__icon" aria-hidden>
                  {getCatalogServiceIcon(serviceId)}
                </span>
                <div className="tenant-admin-sample-catalog__labels">
                  <Label color="blue">{CATALOG_SERVICE_LABELS[serviceId]}</Label>
                  <Label color="green">Live</Label>
                </div>
              </div>

              <Title headingLevel="h2" size="xl" className="tenant-admin-sample-catalog__item-name">
                {item.displayName}
              </Title>

              {item.description ? (
                <Content component="p" className="tenant-admin-sample-catalog__item-description">
                  {item.description}
                </Content>
              ) : null}

              <CatalogSpecRowsList
                rows={specRows}
                className="tenant-admin-sample-catalog__specs"
                rowClassName="tenant-admin-sample-catalog__spec-row"
                labelClassName="tenant-admin-sample-catalog__spec-label"
                valueClassName="tenant-admin-sample-catalog__spec-value"
              />
            </CardBody>
          </Card>
        </div>

        <div className="tenant-admin-sample-catalog__actions">
          <RouterButton to="/" variant="secondary">
            Return to home
          </RouterButton>
        </div>
      </div>
      <ConceptualDesignSticker />
    </div>
  )
}
