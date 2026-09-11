import { useLayoutEffect, useMemo, useRef, useState } from 'react'
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
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  SearchInput,
  Title,
} from '@patternfly/react-core'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { CatalogFilterEmptyState } from '../../components/catalog/CatalogFilterEmptyState'
import { CatalogFilterResultsSummary } from '../../components/catalog/CatalogFilterResultsSummary'
import { ResourceCreatingGridCardBody } from '../../components/catalog/ResourceCreatingGridCardBody'
import { ResourceCreatingTableRow } from '../../components/catalog/ResourceCreatingTableRow'
import {
  orderItemsForDisplay,
  sortItemsByCreatedAtDesc,
  useResourceCreateReveal,
} from '../../catalog/resourceCreateReveal'
import { CatalogSpecRowsList } from '../../components/catalog/CatalogSpecRowsList'
import { renderInventoryCardIcon, SECRET_CARD_ICON } from '../../components/catalog/inventoryCardIcons'
import { ViewModeToggle } from '../../components/catalog/CatalogViewToggle'
import { getSecretsViewMode, setSecretsViewMode, type ViewMode } from '../../catalog/viewMode'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import { CreateTenantSecretFlow } from '../../components/tenant/secrets/CreateTenantSecretFlow'
import { TenantSecretDetailsPage } from '../../components/tenant/secrets/TenantSecretDetailsPage'
import { TenantSecretRowActions } from '../../components/tenant/secrets/TenantSecretRowActions'
import {
  buildTenantSecretFilterParts,
  deleteSecret,
  ensureProviderDemoSecrets,
  ensureTenantDemoSecrets,
  formatTenantSecretKeyNames,
  getSecretById,
  PROVIDER_SECRETS_COPY,
  TENANT_SECRETS_COPY,
  type SecretVaultScope,
  type TenantSecret,
} from '../../tenant/secrets'

type TenantSecretsPageProps = {
  tenantSlug: string
  scope?: SecretVaultScope
  readOnly?: boolean
}

function resolveSecretsCopy(scope: SecretVaultScope) {
  return scope === 'provider' ? PROVIDER_SECRETS_COPY : TENANT_SECRETS_COPY
}

function ensureSecrets(scope: SecretVaultScope, tenantSlug: string) {
  return scope === 'provider' ? ensureProviderDemoSecrets() : ensureTenantDemoSecrets(tenantSlug)
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
  scope = 'tenant',
  readOnly = false,
}: TenantSecretsPageProps) {
  const copy = resolveSecretsCopy(scope)
  const [secrets, setSecrets] = useState<TenantSecret[]>(() => ensureSecrets(scope, tenantSlug))
  const [isCreating, setIsCreating] = useState(false)
  const [editingSecret, setEditingSecret] = useState<TenantSecret | null>(null)
  const [secretPendingDelete, setSecretPendingDelete] = useState<TenantSecret | null>(null)
  const [selectedSecretId, setSelectedSecretId] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>(() => getSecretsViewMode())
  const secretDisplayOrderRef = useRef<string[] | null>(null)
  const {
    creatingItemId: creatingSecretId,
    creatingCardHeightPx,
    cardGridRef,
    beginCreateReveal: beginSecretCreateReveal,
    measureCreatingCardHeight,
  } = useResourceCreateReveal()

  const orderedSecrets = useMemo(
    () => orderItemsForDisplay(secrets, secretDisplayOrderRef, sortItemsByCreatedAtDesc),
    [secrets],
  )

  const filteredSecrets = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) {
      return orderedSecrets
    }

    return orderedSecrets.filter((secret) => getSecretSearchHaystack(secret).includes(query))
  }, [orderedSecrets, searchValue])

  useLayoutEffect(() => {
    measureCreatingCardHeight(viewMode === 'grid', 'tenant-secrets__card--creating')
  }, [filteredSecrets, measureCreatingCardHeight, viewMode])

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
    () => (selectedSecretId ? getSecretById(scope, tenantSlug, selectedSecretId) : null),
    [scope, selectedSecretId, secrets, tenantSlug],
  )

  const refreshSecrets = () => {
    setSecrets(ensureSecrets(scope, tenantSlug))
  }

  const handleEditSecret = (secret: TenantSecret) => {
    setSelectedSecretId(null)
    setEditingSecret(secret)
  }

  const handleDeleteSecret = (secret: TenantSecret) => {
    setSecretPendingDelete(secret)
  }

  const closeDeleteSecret = () => {
    setSecretPendingDelete(null)
  }

  const handleConfirmDeleteSecret = () => {
    if (!secretPendingDelete) {
      return
    }

    deleteSecret(scope, tenantSlug, secretPendingDelete.id)
    if (selectedSecretId === secretPendingDelete.id) {
      setSelectedSecretId(null)
    }
    refreshSecrets()
    closeDeleteSecret()
  }

  const deleteConfirmModal = (
    <Modal
      variant={ModalVariant.small}
      isOpen={secretPendingDelete !== null}
      onClose={closeDeleteSecret}
      aria-labelledby="delete-secret-title"
      aria-describedby="delete-secret-description"
    >
      <ModalHeader
        title="Delete secret?"
        titleIconVariant="warning"
        labelId="delete-secret-title"
      />
      <ModalBody>
        <Content component="p" id="delete-secret-description">
          {secretPendingDelete ? (
            <>
              <strong>{secretPendingDelete.name}</strong> will be permanently removed. This cannot
              be undone.
            </>
          ) : (
            'This secret will be permanently removed. This cannot be undone.'
          )}
        </Content>
      </ModalBody>
      <ModalFooter>
        <Button variant="danger" onClick={handleConfirmDeleteSecret}>
          Delete
        </Button>
        <Button variant="link" onClick={closeDeleteSecret}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )

  if ((isCreating || editingSecret) && !readOnly) {
    return (
      <>
        <CreateTenantSecretFlow
          tenantSlug={tenantSlug}
          scope={scope}
          initialType={isCreating ? 'key-value' : undefined}
          editingSecret={editingSecret}
          onClose={() => {
            setIsCreating(false)
            setEditingSecret(null)
          }}
          onCreated={(secret) => {
            refreshSecrets()
            setIsCreating(false)
            setSearchValue('')
            beginSecretCreateReveal(secret.id)
          }}
          onUpdated={() => {
            refreshSecrets()
            setEditingSecret(null)
          }}
        />
        {deleteConfirmModal}
      </>
    )
  }

  if (selectedSecret) {
    return (
      <>
        <TenantSecretDetailsPage
          secret={selectedSecret}
          onBack={() => setSelectedSecretId(null)}
          onEdit={readOnly ? undefined : () => handleEditSecret(selectedSecret)}
          onDelete={readOnly ? undefined : () => handleDeleteSecret(selectedSecret)}
        />
        {deleteConfirmModal}
      </>
    )
  }

  return (
    <>
    <div className="provider-admin-workspace-page tenant-secrets">
      <ProviderAdminWorkspacePageHeader
        title={copy.title}
        lede={copy.lede}
        action={
          secrets.length > 0 && !readOnly ? (
            <Button
              variant="primary"
              icon={<PlusIcon aria-hidden />}
              className="provider-admin-workspace-page__action"
              onClick={() => setIsCreating(true)}
            >
              {copy.createSecretTypeLabel}
            </Button>
          ) : undefined
        }
      />

      {secrets.length === 0 ? (
        <EmptyState className="catalog-filter-empty tenant-secrets__empty">
          <Title headingLevel="h2" size="lg">
            {copy.emptyTitle}
          </Title>
          <EmptyStateBody className="catalog-filter-empty__body">
            {copy.emptyBody}
          </EmptyStateBody>
          {readOnly ? null : (
            <EmptyStateFooter>
              <EmptyStateActions>
                <Button
                  variant="primary"
                  icon={<PlusIcon aria-hidden />}
                  onClick={() => setIsCreating(true)}
                >
                  {copy.createSecretTypeLabel}
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
              <div
                ref={cardGridRef}
                className="catalog-card-grid catalog-card-grid--stable tenant-secrets__grid"
              >
                {filteredSecrets.map((secret) => {
                  const isCreating = creatingSecretId === secret.id

                  return (
                  <Card
                    key={secret.id}
                    isCompact={false}
                    className={[
                      'tenant-secrets__card',
                      isCreating ? 'tenant-secrets__card--creating provider-admin-catalog-items__card--creating' : '',
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
                      <ResourceCreatingGridCardBody label="Creating secret…" />
                    ) : (
                    <CardBody>
                      <div className="tenant-secrets__card-header">
                        <span className="tenant-secrets__card-icon" aria-hidden>
                          {renderInventoryCardIcon(SECRET_CARD_ICON)}
                        </span>
                        {!readOnly ? (
                          <div className="tenant-secrets__card-header-actions">
                            <TenantSecretRowActions
                              onEdit={() => handleEditSecret(secret)}
                              onDelete={() => handleDeleteSecret(secret)}
                            />
                          </div>
                        ) : null}
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
                    )}
                  </Card>
                  )
                })}
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
                className={[
                  'catalog-data-table',
                  'tenant-secrets__table',
                  readOnly
                    ? 'tenant-secrets__table--readonly'
                    : 'tenant-secrets__table--with-actions',
                ].join(' ')}
              >
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Keys</Th>
                    <Th>Added</Th>
                    {!readOnly ? <Th screenReaderText="Actions" /> : null}
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredSecrets.map((secret) => {
                    if (creatingSecretId === secret.id) {
                      return (
                        <ResourceCreatingTableRow
                          key={secret.id}
                          itemId={secret.id}
                          label="Creating secret…"
                          colSpan={readOnly ? 3 : 4}
                        />
                      )
                    }

                    return (
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
                      {!readOnly ? (
                        <Td isActionCell>
                          <TenantSecretRowActions
                            onEdit={() => handleEditSecret(secret)}
                            onDelete={() => handleDeleteSecret(secret)}
                          />
                        </Td>
                      ) : null}
                    </Tr>
                    )
                  })}
                </Tbody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
    {deleteConfirmModal}
    </>
  )
}
