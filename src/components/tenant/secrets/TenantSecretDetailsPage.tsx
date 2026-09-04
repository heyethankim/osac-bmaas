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
import {
  formatSecretDetailValue,
  getTenantSecretTypeLabel,
  getTenantSecretUsageLabel,
  isMaskedSecretField,
  MASKED_SECRET_VALUE,
  tenantSecretHasRevealableValues,
  type TenantSecret,
} from '../../../tenant/secrets'

type TenantSecretDetailsPageProps = {
  secret: TenantSecret
  onBack: () => void
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
    return <pre className="tenant-secret-details__pre tenant-secret-details__pre--revealed">{formatted}</pre>
  }

  return <code className="tenant-secret-details__code tenant-secret-details__code--revealed">{formatted}</code>
}

function renderSecretDataDetails(secret: TenantSecret, valuesRevealed: boolean) {
  switch (secret.data.kind) {
    case 'key-value':
      return (
        <>
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
                  fieldId={`key-value-${pair.key}`}
                  value={pair.value}
                  reveal={valuesRevealed}
                  multiline={pair.value.includes('\n')}
                />
              </DescriptionListDescription>
            </DescriptionListGroup>
          ))}
        </>
      )
    case 'image-pull':
      return (
        <>
          <DescriptionListGroup>
            <DescriptionListTerm>Authentication type</DescriptionListTerm>
            <DescriptionListDescription>
              {secret.data.authMode === 'upload-configuration'
                ? 'Upload configuration file'
                : 'Image registry credentials'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          {secret.data.authMode === 'upload-configuration' ? (
            <>
              <DescriptionListGroup>
                <DescriptionListTerm>Configuration file</DescriptionListTerm>
                <DescriptionListDescription>
                  {secret.data.configurationFileName.trim() || '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>File contents</DescriptionListTerm>
                <DescriptionListDescription>
                  <SecretValueDisplay
                    fieldId="configuration-file-contents"
                    value={secret.data.configurationFileContents}
                    reveal={valuesRevealed}
                    multiline
                  />
                </DescriptionListDescription>
              </DescriptionListGroup>
            </>
          ) : (
            secret.data.credentials.map((credential, index) => (
              <DescriptionListGroup key={`${credential.registryServer}-${index}`}>
                <DescriptionListTerm>
                  {secret.data.kind === 'image-pull' && secret.data.credentials.length > 1
                    ? `Registry ${index + 1}`
                    : 'Registry server address'}
                </DescriptionListTerm>
                <DescriptionListDescription>
                  {credential.registryServer.trim() || '—'}
                </DescriptionListDescription>
                <DescriptionListTerm>User name</DescriptionListTerm>
                <DescriptionListDescription>
                  {credential.username.trim() || '—'}
                </DescriptionListDescription>
                <DescriptionListTerm>Password</DescriptionListTerm>
                <DescriptionListDescription>
                  <SecretValueDisplay
                    fieldId="registry-password"
                    value={credential.password}
                    reveal={valuesRevealed}
                  />
                </DescriptionListDescription>
                <DescriptionListTerm>Email</DescriptionListTerm>
                <DescriptionListDescription>
                  {credential.email.trim() || '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
            ))
          )}
        </>
      )
    case 'source':
      return (
        <>
          <DescriptionListGroup>
            <DescriptionListTerm>Authentication type</DescriptionListTerm>
            <DescriptionListDescription>
              {secret.data.authMode === 'ssh-key' ? 'SSH key' : 'Basic authentication'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          {secret.data.authMode === 'basic' ? (
            <>
              <DescriptionListGroup>
                <DescriptionListTerm>Username</DescriptionListTerm>
                <DescriptionListDescription>{secret.data.username || '—'}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Password or token</DescriptionListTerm>
                <DescriptionListDescription>
                  <SecretValueDisplay
                    fieldId="source-password-or-token"
                    value={secret.data.passwordOrToken}
                    reveal={valuesRevealed}
                  />
                </DescriptionListDescription>
              </DescriptionListGroup>
            </>
          ) : (
            <>
              <DescriptionListGroup>
                <DescriptionListTerm>SSH private key file</DescriptionListTerm>
                <DescriptionListDescription>
                  {secret.data.sshPrivateKeyFileName.trim() || '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>SSH private key</DescriptionListTerm>
                <DescriptionListDescription>
                  <SecretValueDisplay
                    fieldId="ssh-private-key-contents"
                    value={secret.data.sshPrivateKeyContents}
                    reveal={valuesRevealed}
                    multiline
                  />
                </DescriptionListDescription>
              </DescriptionListGroup>
            </>
          )}
        </>
      )
    case 'webhook':
      return (
        <DescriptionListGroup>
          <DescriptionListTerm>Webhook secret key</DescriptionListTerm>
          <DescriptionListDescription>
            <SecretValueDisplay
              fieldId="webhook-secret-key"
              value={secret.data.webhookSecretKey}
              reveal={valuesRevealed}
            />
          </DescriptionListDescription>
        </DescriptionListGroup>
      )
    default:
      return null
  }
}

export function TenantSecretDetailsPage({ secret, onBack }: TenantSecretDetailsPageProps) {
  const [valuesRevealed, setValuesRevealed] = useState(false)
  const hasRevealableValues = tenantSecretHasRevealableValues(secret)

  return (
    <EntityDetailsPageShell
      className="tenant-secret-details"
      parentLabel="Secrets"
      onBack={onBack}
      title={secret.name}
      titleId="tenant-secret-details-title"
      description={secret.summary}
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
                <Label color="blue">{getTenantSecretTypeLabel(secret.type)}</Label>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Use</DescriptionListTerm>
              <DescriptionListDescription>
                {getTenantSecretUsageLabel(secret.usage)}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Created at</DescriptionListTerm>
              <DescriptionListDescription>{formatCreatedAt(secret.createdAt)}</DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </div>

        <div className="entity-details-page__column">
          {hasRevealableValues ? (
            <div className="entity-details-page__section-header tenant-secret-details__values-header">
              <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
                Secret values
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
              Secret values
            </Title>
          )}

          <DescriptionList
            isCompact
            className="entity-details-page__dl tenant-secret-details__values"
            aria-label="Secret values"
          >
            {renderSecretDataDetails(secret, valuesRevealed)}
          </DescriptionList>
        </div>
      </div>
    </EntityDetailsPageShell>
  )
}
