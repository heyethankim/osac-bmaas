import { useMemo, useState } from 'react'
import {
  Button,
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
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import { CreateSecretDropdown } from '../../components/tenant/secrets/CreateSecretDropdown'
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
  type TenantSecretType,
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
  const [createType, setCreateType] = useState<TenantSecretType | null>(null)
  const [selectedSecretId, setSelectedSecretId] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [selectedType, setSelectedType] = useState<TenantSecretTypeFilter>('all')
  const [selectedUsage, setSelectedUsage] = useState<TenantSecretUsageFilter>('all')

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

  const selectedSecret = useMemo(
    () => (selectedSecretId ? getTenantSecretById(tenantSlug, selectedSecretId) : null),
    [selectedSecretId, secrets, tenantSlug],
  )

  if (createType && !readOnly) {
    return (
      <CreateTenantSecretFlow
        tenantSlug={tenantSlug}
        initialType={createType}
        onClose={() => setCreateType(null)}
        onCreated={() => {
          setSecrets(ensureTenantDemoSecrets(tenantSlug))
          setCreateType(null)
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
            <CreateSecretDropdown
              buttonLabel={TENANT_SECRETS_COPY.createSecretTypeLabel}
              className="provider-admin-workspace-page__action"
              onSelectType={setCreateType}
            />
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
                <CreateSecretDropdown
                  buttonLabel={TENANT_SECRETS_COPY.createSecretTypeLabel}
                  onSelectType={setCreateType}
                />
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
          </div>

          {filteredSecrets.length === 0 ? (
            <CatalogFilterEmptyState
              title="No secrets match your filters"
              description="Try a different type, use, or search term."
              onClearFilters={clearAllFilters}
            />
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
