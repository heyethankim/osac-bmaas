import { useState } from 'react'
import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Title,
} from '@patternfly/react-core'
import { EyeIcon } from '@patternfly/react-icons/dist/esm/icons/eye-icon'
import { EyeSlashIcon } from '@patternfly/react-icons/dist/esm/icons/eye-slash-icon'
import { LockIcon } from '@patternfly/react-icons/dist/esm/icons/lock-icon'
import { EntityDetailsPageShell } from '../../shared/EntityDetailsPageShell'
import { EntityDetailsActionsDropdown } from '../../shared/EntityDetailsActionsDropdown'
import {
  formatSecretDetailValue,
  getTenantSecretTypeLabel,
  isMaskedSecretField,
  MASKED_SECRET_VALUE,
  tenantSecretHasRevealableValues,
  type TenantSecret,
} from '../../../tenant/secrets'

type TenantSecretDetailsPageProps = {
  secret: TenantSecret
  onBack: () => void
  onEdit?: () => void
  onDelete?: () => void
}

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function SecretValueDisplay({
  fieldId,
  value,
  reveal,
  multiline = false,
}: {
  fieldId: string
  value: string
  reveal: boolean
  multiline?: boolean
}) {
  const formatted = formatSecretDetailValue(fieldId, value, reveal)
  const sensitive = isMaskedSecretField(fieldId)

  if (formatted === '—') {
    return formatted
  }

  if (sensitive && !reveal) {
    return (
      <span className="tenant-secret-details__masked-value">
        <LockIcon className="tenant-secret-details__masked-value-icon" aria-hidden />
        <span className="tenant-secret-details__masked-value-text">{MASKED_SECRET_VALUE}</span>
      </span>
    )
  }

  if (multiline) {
    return (
      <pre className="tenant-secret-details__pre tenant-secret-details__pre--revealed">{formatted}</pre>
    )
  }

  return <code className="tenant-secret-details__code tenant-secret-details__code--revealed">{formatted}</code>
}

export function TenantSecretDetailsPage({
  secret,
  onBack,
  onEdit,
  onDelete,
}: TenantSecretDetailsPageProps) {
  const [valuesRevealed, setValuesRevealed] = useState(false)
  const hasRevealableValues = tenantSecretHasRevealableValues(secret)

  return (
    <EntityDetailsPageShell
      className="tenant-secret-details"
      parentLabel="Secrets"
      onBack={onBack}
      title={secret.name}
      titleId="tenant-secret-details-title"
      description={secret.description.trim() || secret.summary}
      actions={
        onEdit || onDelete ? (
          <EntityDetailsActionsDropdown
            onEdit={onEdit}
            onRemove={onDelete}
            removeLabel="Delete"
          />
        ) : undefined
      }
    >
      <div className="entity-details-page__columns">
        <div className="entity-details-page__column">
          <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
            Overview
          </Title>
          <DescriptionList
            isCompact
            className="entity-details-page__dl"
            aria-label="Secret overview"
          >
            <DescriptionListGroup>
              <DescriptionListTerm>Name</DescriptionListTerm>
              <DescriptionListDescription>{secret.name}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Type</DescriptionListTerm>
              <DescriptionListDescription>
                {getTenantSecretTypeLabel(secret.type)}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Description</DescriptionListTerm>
              <DescriptionListDescription>
                {secret.description.trim() || '—'}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Labels</DescriptionListTerm>
              <DescriptionListDescription>
                {secret.labels.length > 0 ? (
                  <div className="tenant-secrets__required-keys">
                    {secret.labels.map((label) => (
                      <Label key={label} color="grey" isCompact>
                        {label}
                      </Label>
                    ))}
                  </div>
                ) : (
                  '—'
                )}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Created at</DescriptionListTerm>
              <DescriptionListDescription>
                {formatCreatedAt(secret.createdAt)}
              </DescriptionListDescription>
            </DescriptionListGroup>
            {secret.data.uploadedFileName ? (
              <DescriptionListGroup>
                <DescriptionListTerm>Uploaded file</DescriptionListTerm>
                <DescriptionListDescription>
                  {secret.data.uploadedFileName}
                </DescriptionListDescription>
              </DescriptionListGroup>
            ) : null}
          </DescriptionList>
        </div>

        <div className="entity-details-page__column">
          {hasRevealableValues ? (
            <div className="entity-details-page__section-header tenant-secret-details__values-header">
              <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
                Secret data
              </Title>
              <Button
                variant="link"
                isInline
                icon={valuesRevealed ? <EyeSlashIcon aria-hidden /> : <EyeIcon aria-hidden />}
                onClick={() => setValuesRevealed((current) => !current)}
              >
                {valuesRevealed ? 'Hide values' : 'Reveal values'}
              </Button>
            </div>
          ) : (
            <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
              Secret data
            </Title>
          )}

          <DescriptionList
            isCompact
            className="entity-details-page__dl tenant-secret-details__values"
            aria-label="Secret data"
          >
            {secret.data.pairs.map((pair, index) => (
              <DescriptionListGroup
                className="tenant-secret-details__pair-group"
                key={`${pair.key}-${index}`}
              >
                <DescriptionListTerm>Key</DescriptionListTerm>
                <DescriptionListDescription>
                  <code className="tenant-secret-details__code">{pair.key}</code>
                </DescriptionListDescription>
                <DescriptionListTerm>Value</DescriptionListTerm>
                <DescriptionListDescription>
                  <SecretValueDisplay
                    fieldId={`pair-${pair.key}`}
                    value={pair.value}
                    reveal={valuesRevealed}
                    multiline={pair.value.includes('\n')}
                  />
                </DescriptionListDescription>
              </DescriptionListGroup>
            ))}
          </DescriptionList>
        </div>
      </div>
    </EntityDetailsPageShell>
  )
}
