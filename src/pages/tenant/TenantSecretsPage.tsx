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
  FormSelect,
  FormSelectOption,
  Label,
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
  getTenantSecretById,
  getTenantSecretTypeLabel,
  getTenantSecretUsageLabel,
  TENANT_SECRET_TYPE_OPTIONS,
  TENANT_SECRET_USAGE_OPTIONS,
  TENANT_SECRETS_COPY,
  type TenantSecret,
  type TenantSecretTypeFilter,
  type TenantSecretUsageFilter,
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

export function TenantSecretsPage({
  tenantSlug,
  readOnly = false,
}: TenantSecretsPageProps) {
  const [secrets, setSecrets] = useState<TenantSecret[]>(() => ensureTenantDemoSecrets(tenantSlug))
  const [isCreating, setIsCreating] = useState(false)
  const [selectedSecretId, setSelectedSecretId] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [selectedType, setSelectedType] = useState<TenantSecretTypeFilter>('all')
  const [selectedUsage, setSelectedUsage] = useState<TenantSecretUsageFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>(() => getSecretsViewMode())

  const filteredSecrets = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return secrets.filter((secret) => {
      if (selectedType !== 'all' && secret.type !== selectedType) {
        return false
      }

      if (selectedUsage !== 'all' && secret.usage !== selectedUsage) {
        return false
      }

      if (!query) {
        return true
      }

      return (
        secret.name.toLowerCase().includes(query) ||
        getTenantSecretTypeLabel(secret.type).toLowerCase().includes(query) ||
        getTenantSecretUsageLabel(secret.usage).toLowerCase().includes(query) ||
        secret.summary.toLowerCase().includes(query)
      )
    })
  }, [searchValue, secrets, selectedType, selectedUsage])

  const filterDescriptionParts = useMemo(
    () => buildTenantSecretFilterParts(searchValue, selectedType, selectedUsage),
    [searchValue, selectedType, selectedUsage],
  )

  const hasActiveFilters =
    Boolean(searchValue.trim()) || selectedType !== 'all' || selectedUsage !== 'all'

  const clearAllFilters = () => {
    setSearchValue('')
    setSelectedType('all')
    setSelectedUsage('all')
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
              <FormSelect
                className="catalog-status-filter"
                id="tenant-secrets-type-filter"
                value={selectedType}
                onChange={(_event, value) => setSelectedType(value as TenantSecretTypeFilter)}
                aria-label="Filter secrets by type"
              >
                <FormSelectOption value="all" label="All types" />
                {TENANT_SECRET_TYPE_OPTIONS.map((option) => (
                  <FormSelectOption key={option.id} value={option.id} label={option.label} />
                ))}
              </FormSelect>
              <FormSelect
                className="catalog-status-filter"
                id="tenant-secrets-usage-filter"
                value={selectedUsage}
                onChange={(_event, value) => setSelectedUsage(value as TenantSecretUsageFilter)}
                aria-label="Filter secrets by use"
              >
                <FormSelectOption value="all" label="All uses" />
                {TENANT_SECRET_USAGE_OPTIONS.map((option) => (
                  <FormSelectOption key={option.id} value={option.id} label={option.label} />
                ))}
              </FormSelect>
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
              description="Try a different type, use, or search term."
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
                        <div className="tenant-secrets__card-header-actions">
                          <Label color="blue" isCompact className="tenant-secrets__card-label">
                            {getTenantSecretTypeLabel(secret.type)}
                          </Label>
                        </div>
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
                          { label: 'Use', value: getTenantSecretUsageLabel(secret.usage) },
                          { label: 'Details', value: secret.summary },
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
                    <Th>Type</Th>
                    <Th>Use</Th>
                    <Th>Details</Th>
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
                      <Td dataLabel="Type">
                        <Label color="blue">{getTenantSecretTypeLabel(secret.type)}</Label>
                      </Td>
                      <Td dataLabel="Use">{getTenantSecretUsageLabel(secret.usage)}</Td>
                      <Td dataLabel="Details">{secret.summary}</Td>
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
