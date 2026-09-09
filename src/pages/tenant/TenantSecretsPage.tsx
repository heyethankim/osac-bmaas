import { useMemo, useState } from 'react'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import {
  Button,
  Card,
  CardBody,
  Content,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  SearchInput,
  Title,
} from '@patternfly/react-core'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { CatalogFilterEmptyState } from '../../components/catalog/CatalogFilterEmptyState'
import { CatalogFilterResultsSummary } from '../../components/catalog/CatalogFilterResultsSummary'
import { CatalogSpecRowsList } from '../../components/catalog/CatalogSpecRowsList'
import { renderInventoryCardIcon, SECRET_CARD_ICON } from '../../components/catalog/inventoryCardIcons'
import { ViewModeToggle } from '../../components/catalog/CatalogViewToggle'
import { getSecretsViewMode, setSecretsViewMode, type ViewMode } from '../../catalog/viewMode'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import { CreateTenantSecretFlow } from '../../components/tenant/secrets/CreateTenantSecretFlow'
import { TenantSecretDetailsPage } from '../../components/tenant/secrets/TenantSecretDetailsPage'
import {
  buildTenantSecretFilterParts,
  ensureTenantDemoSecrets,
  formatTenantSecretKeyNames,
  getTenantSecretById,
  TENANT_SECRETS_COPY,
  type TenantSecret,
} from '../../tenant/secrets'

type TenantSecretsPageProps = {
  tenantSlug: string
  readOnly?: boolean
}

function formatSecretCreatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getSecretSearchHaystack(secret: TenantSecret): string {
  const keyNames =
    secret.data.kind === 'key-value'
      ? secret.data.pairs.map((pair) => pair.key).join(' ')
      : ''

  return [secret.name, keyNames].join(' ').toLowerCase()
}

export function TenantSecretsPage({
  tenantSlug,
  readOnly = false,
}: TenantSecretsPageProps) {
  const [secrets, setSecrets] = useState<TenantSecret[]>(() => ensureTenantDemoSecrets(tenantSlug))
  const [isCreating, setIsCreating] = useState(false)
  const [selectedSecretId, setSelectedSecretId] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>(() => getSecretsViewMode())

  const filteredSecrets = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) {
      return secrets
    }

    return secrets.filter((secret) => getSecretSearchHaystack(secret).includes(query))
  }, [searchValue, secrets])

  const filterDescriptionParts = useMemo(
    () => buildTenantSecretFilterParts(searchValue),
    [searchValue],
  )

  const hasActiveFilters = Boolean(searchValue.trim())

  const clearAllFilters = () => {
    setSearchValue('')
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    setSecretsViewMode(mode)
  }

  const selectedSecret = useMemo(
    () => (selectedSecretId ? getTenantSecretById(tenantSlug, selectedSecretId) : null),
    [selectedSecretId, secrets, tenantSlug],
  )

  if (isCreating && !readOnly) {
    return (
      <CreateTenantSecretFlow
        tenantSlug={tenantSlug}
        initialType="key-value"
        onClose={() => setIsCreating(false)}
        onCreated={() => {
          setSecrets(ensureTenantDemoSecrets(tenantSlug))
          setIsCreating(false)
        }}
      />
    )
  }

  if (selectedSecret) {
    return (
      <TenantSecretDetailsPage
        secret={selectedSecret}
        onBack={() => setSelectedSecretId(null)}
      />
    )
  }

  return (
    <div className="provider-admin-workspace-page tenant-secrets">
      <ProviderAdminWorkspacePageHeader
        title={TENANT_SECRETS_COPY.title}
        lede={TENANT_SECRETS_COPY.lede}
        action={
          secrets.length > 0 && !readOnly ? (
            <Button
              variant="primary"
              icon={<PlusIcon aria-hidden />}
              className="provider-admin-workspace-page__action"
              onClick={() => setIsCreating(true)}
            >
              {TENANT_SECRETS_COPY.createSecretTypeLabel}
            </Button>
          ) : undefined
        }
      />

      {secrets.length === 0 ? (
        <EmptyState className="catalog-filter-empty tenant-secrets__empty">
          <Title headingLevel="h2" size="lg">
            {TENANT_SECRETS_COPY.emptyTitle}
          </Title>
          <EmptyStateBody className="catalog-filter-empty__body">
            {TENANT_SECRETS_COPY.emptyBody}
          </EmptyStateBody>
          {readOnly ? null : (
            <EmptyStateFooter>
              <EmptyStateActions>
                <Button
                  variant="primary"
                  icon={<PlusIcon aria-hidden />}
                  onClick={() => setIsCreating(true)}
                >
                  {TENANT_SECRETS_COPY.createSecretTypeLabel}
                </Button>
              </EmptyStateActions>
            </EmptyStateFooter>
          )}
        </EmptyState>
      ) : (
        <>
          <div className="catalog-view-toolbar">
            <div className="catalog-view-toolbar__start">
              <SearchInput
                className="catalog-search"
                placeholder="Search secrets"
                value={searchValue}
                onChange={(_event, value) => setSearchValue(value)}
                onClear={() => setSearchValue('')}
                aria-label="Search secrets"
              />
            </div>
            <ViewModeToggle
              viewMode={viewMode}
              onChange={handleViewModeChange}
              idPrefix="secrets-view"
              ariaLabel="Secrets view"
            />
          </div>

          {filteredSecrets.length === 0 ? (
            <CatalogFilterEmptyState
              title="No secrets match your filters"
              description="Try a different search term."
              onClearFilters={clearAllFilters}
            />
          ) : viewMode === 'grid' ? (
            <>
              <CatalogFilterResultsSummary
                filteredCount={filteredSecrets.length}
                totalCount={secrets.length}
                singular="secret"
                filterParts={filterDescriptionParts}
                onClearFilters={hasActiveFilters ? clearAllFilters : undefined}
              />
              <div className="catalog-card-grid catalog-card-grid--stable tenant-secrets__grid">
                {filteredSecrets.map((secret) => (
                  <Card key={secret.id} isCompact={false} className="tenant-secrets__card">
                    <CardBody>
                      <div className="tenant-secrets__card-header">
                        <span className="tenant-secrets__card-icon" aria-hidden>
                          {renderInventoryCardIcon(SECRET_CARD_ICON)}
                        </span>
                      </div>
                      <Content component="p" className="tenant-secrets__primary-cell">
                        <Button
                          variant="link"
                          isInline
                          className="tenant-secrets__name-link catalog-item-name-link"
                          onClick={() => setSelectedSecretId(secret.id)}
                        >
                          {secret.name}
                        </Button>
                      </Content>
                      <CatalogSpecRowsList
                        rows={[
                          { label: 'Keys', value: formatTenantSecretKeyNames(secret) },
                          { label: 'Added', value: formatSecretCreatedAt(secret.createdAt) },
                        ]}
                        className="tenant-secrets__specs-list"
                        rowClassName="tenant-secrets__spec-row"
                        labelClassName="tenant-secrets__spec-label"
                        valueClassName="tenant-secrets__spec-value"
                      />
                    </CardBody>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="catalog-table-panel">
              <CatalogFilterResultsSummary
                filteredCount={filteredSecrets.length}
                totalCount={secrets.length}
                singular="secret"
                filterParts={filterDescriptionParts}
                onClearFilters={hasActiveFilters ? clearAllFilters : undefined}
              />
              <Table
                aria-label="Secrets"
                className="catalog-data-table provider-admin-network-inventory__table"
              >
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Keys</Th>
                    <Th>Added</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredSecrets.map((secret) => (
                    <Tr key={secret.id}>
                      <Td dataLabel="Name">
                        <Content component="p" className="tenant-secrets__primary-cell">
                          <Button
                            variant="link"
                            isInline
                            className="catalog-table-name-link"
                            onClick={() => setSelectedSecretId(secret.id)}
                          >
                            {secret.name}
                          </Button>
                        </Content>
                      </Td>
                      <Td dataLabel="Keys">{formatTenantSecretKeyNames(secret)}</Td>
                      <Td dataLabel="Added">{formatSecretCreatedAt(secret.createdAt)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
