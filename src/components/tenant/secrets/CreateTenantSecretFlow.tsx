import { Fragment, useEffect, useMemo, useState } from 'react'
import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import { KeyIcon } from '@patternfly/react-icons/dist/esm/icons/key-icon'
import { MinusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/minus-circle-icon'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import { SyncAltIcon } from '@patternfly/react-icons/dist/esm/icons/sync-alt-icon'
import {
  Button,
  Card,
  CardBody,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  FileUpload,
  Form,
  FormGroup,
  Label,
  Modal,
  ModalVariant,
  Radio,
  TextArea,
  TextInput,
  Title,
  Wizard,
  WizardHeader,
  WizardStep,
} from '@patternfly/react-core'
import { NetworkInventoryCreateWizardShell } from '../../networking/NetworkInventoryCreateWizardShell'
import { useWizardLeaveConfirm } from '../../shared/useWizardLeaveConfirm'
import { NETWORK_INVENTORY_CREATE_REVIEW_STEP } from '../../../networking/networkInventoryCreateWizard'
import { KubernetesResourceNameField } from '../../shared/KubernetesResourceNameHelper'
import { isValidKubernetesResourceName } from '../../../shared/kubernetesResourceName'
import {
  addSecret,
  generateTenantSecretId,
  TENANT_SECRET_TYPE_OPTIONS,
  updateSecret,
  type SecretVaultScope,
  type TenantSecret,
  type TenantSecretType,
  type TenantSecretUsage,
} from '../../../tenant/secrets'
import { buildTenantSecretData } from '../../../tenant/secretTypes'
import { SecretFieldInput } from './SecretFieldInput'
import {
  createImagePullCredential,
  createKeyValuePair,
  createSecretFormState,
  generateWebhookSecretKey,
  secretFormStateFromTenantSecret,
  type ImagePullCredential,
  type KeyValuePair,
  type TenantSecretFormState,
} from './secretFormTypes'

type CreateTenantSecretFlowProps = {
  tenantSlug: string
  scope?: SecretVaultScope
  initialType?: TenantSecretType
  editingSecret?: TenantSecret | null
  presentation?: 'page' | 'modal'
  isOpen?: boolean
  usage?: TenantSecretUsage
  onClose: () => void
  onCreated: (secret: TenantSecret) => void
  onUpdated?: (secret: TenantSecret) => void
}

const TYPE_SELECTION_STEP_ID = 'type'
const SECRET_DETAILS_STEP_ID = 'secret'

function getSecretWizardSteps(options: {
  includeTypeStep: boolean
  type: TenantSecretType | null
}) {
  const steps: Array<{ id: string; label: string }> = []

  if (options.includeTypeStep) {
    steps.push({ id: TYPE_SELECTION_STEP_ID, label: 'Type' })
  }

  steps.push({
    id: SECRET_DETAILS_STEP_ID,
    label: 'General',
  })
  steps.push(NETWORK_INVENTORY_CREATE_REVIEW_STEP)

  return steps
}

function getSecretWizardLede(type: TenantSecretType): string {
  switch (type) {
    case 'key-value':
      return 'Name this secret, add an optional description, then add key/value pairs.'
    case 'image-pull':
      return 'Name this secret, add an optional description, then add registry credentials or upload a pull secret.'
    case 'source':
      return 'Name this secret, add an optional description, then add Git credentials or an SSH private key.'
    case 'webhook':
      return 'Name this secret, add an optional description, then add a signing key for webhooks.'
    default:
      return 'Name this secret and add an optional description.'
  }
}

function buildInitialSecretFormState(type: TenantSecretType): TenantSecretFormState {
  return createSecretFormState(type, { prefill: true })
}

function getSecretName(type: TenantSecretType, form: TenantSecretFormState): string {
  switch (type) {
    case 'key-value':
      return form.keyValue.name.trim()
    case 'image-pull':
      return form.imagePull.name.trim()
    case 'source':
      return form.source.name.trim()
    case 'webhook':
      return form.webhook.name.trim()
    default:
      return ''
  }
}

function buildSecretSummary(type: TenantSecretType, form: TenantSecretFormState): string {
  switch (type) {
    case 'key-value': {
      const keys = form.keyValue.pairs.map((pair) => pair.key.trim()).filter(Boolean)
      return keys.length > 0 ? `${keys.length} key${keys.length === 1 ? '' : 's'}` : 'Key/value'
    }
    case 'image-pull':
      return form.imagePull.authMode === 'upload-configuration'
        ? 'Configuration file'
        : `${form.imagePull.credentials.length} registr${form.imagePull.credentials.length === 1 ? 'y' : 'ies'}`
    case 'source':
      return form.source.authMode === 'ssh-key' ? 'SSH key' : 'Basic authentication'
    case 'webhook':
      return 'Webhook key'
    default:
      return ''
  }
}

function isKeyValueFormValid(form: TenantSecretFormState['keyValue']): boolean {
  if (!isValidKubernetesResourceName(form.name)) {
    return false
  }

  return form.pairs.some((pair) => {
    if (!pair.key.trim()) {
      return false
    }

    return Boolean(pair.value.trim())
  })
}

function isImagePullFormValid(form: TenantSecretFormState['imagePull']): boolean {
  if (!isValidKubernetesResourceName(form.name)) {
    return false
  }

  if (form.authMode === 'upload-configuration') {
    return Boolean(form.configurationFileContents.trim())
  }

  return form.credentials.some(
    (credential) =>
      credential.registryServer.trim() &&
      credential.username.trim() &&
      credential.password.trim(),
  )
}

function isSourceFormValid(form: TenantSecretFormState['source']): boolean {
  if (!isValidKubernetesResourceName(form.name)) {
    return false
  }

  if (form.authMode === 'ssh-key') {
    return Boolean(form.sshPrivateKeyContents.trim())
  }

  return Boolean(form.username.trim() && form.passwordOrToken.trim())
}

function isWebhookFormValid(form: TenantSecretFormState['webhook']): boolean {
  return isValidKubernetesResourceName(form.name) && Boolean(form.webhookSecretKey.trim())
}

function isFormValid(type: TenantSecretType, form: TenantSecretFormState): boolean {
  switch (type) {
    case 'key-value':
      return isKeyValueFormValid(form.keyValue)
    case 'image-pull':
      return isImagePullFormValid(form.imagePull)
    case 'source':
      return isSourceFormValid(form.source)
    case 'webhook':
      return isWebhookFormValid(form.webhook)
    default:
      return false
  }
}

function KeyValuePairsField({
  pairs,
  onChange,
}: {
  pairs: KeyValuePair[]
  onChange: (pairs: KeyValuePair[]) => void
}) {
  const updatePair = (id: string, patch: Partial<KeyValuePair>) => {
    onChange(pairs.map((pair) => (pair.id === id ? { ...pair, ...patch } : pair)))
  }

  const removePair = (id: string) => {
    if (pairs.length === 1) {
      onChange([createKeyValuePair()])
      return
    }
    onChange(pairs.filter((pair) => pair.id !== id))
  }

  return (
    <div className="tenant-secrets__pair-list">
      {pairs.map((pair, index) => (
        <div key={pair.id} className="tenant-secrets__pair-row">
          <FormGroup label="Key" fieldId={`secret-key-${pair.id}`} isRequired={index === 0}>
            <TextInput
              id={`secret-key-${pair.id}`}
              value={pair.key}
              onChange={(_event, value) => updatePair(pair.id, { key: value })}
            />
          </FormGroup>
          <FormGroup label="Value" fieldId={`secret-value-${pair.id}`} isRequired={index === 0}>
            <div className="tenant-secrets__radio-group">
              <Radio
                id={`secret-value-mode-paste-${pair.id}`}
                name={`secret-value-mode-${pair.id}`}
                label="Enter value"
                isChecked={pair.valueMode === 'paste'}
                onChange={() => updatePair(pair.id, { valueMode: 'paste' })}
              />
              <Radio
                id={`secret-value-mode-upload-${pair.id}`}
                name={`secret-value-mode-${pair.id}`}
                label="Upload file"
                isChecked={pair.valueMode === 'upload-file'}
                onChange={() => updatePair(pair.id, { valueMode: 'upload-file' })}
              />
            </div>
            <div className="tenant-secrets__pair-value-row">
              <div className="tenant-secrets__pair-value-control">
                {pair.valueMode === 'paste' ? (
                  <SecretFieldInput
                    id={`secret-value-${pair.id}`}
                    value={pair.value}
                    onChange={(_event, value) => updatePair(pair.id, { value })}
                    aria-label={`Secret value ${index + 1}`}
                  />
                ) : (
                  <FileUpload
                    id={`secret-value-file-${pair.id}`}
                    type="text"
                    value={pair.value}
                    filename={pair.valueFileName}
                    filenamePlaceholder="Drag and drop a file or upload one"
                    browseButtonText="Upload"
                    clearButtonText="Remove"
                    onFileInputChange={(_event, file) =>
                      updatePair(pair.id, { valueFileName: file.name })
                    }
                    onReadStarted={() => undefined}
                    onReadFinished={(_event, file) => {
                      file.text().then((text) => {
                        updatePair(pair.id, { value: text })
                      })
                    }}
                    onClearClick={() =>
                      updatePair(pair.id, {
                        value: '',
                        valueFileName: '',
                      })
                    }
                  />
                )}
              </div>
              {pairs.length > 1 ? (
                <Button
                  variant="plain"
                  className="tenant-secrets__pair-remove"
                  icon={<MinusCircleIcon />}
                  aria-label={`Remove key/value pair ${index + 1}`}
                  onClick={() => removePair(pair.id)}
                />
              ) : null}
            </div>
          </FormGroup>
        </div>
      ))}
      <Button
        variant="link"
        icon={<PlusCircleIcon />}
        className="tenant-secrets__add-row"
        onClick={() => onChange([...pairs, createKeyValuePair()])}
      >
        Add more
      </Button>
    </div>
  )
}

function ImagePullCredentialsField({
  credentials,
  onChange,
}: {
  credentials: ImagePullCredential[]
  onChange: (credentials: ImagePullCredential[]) => void
}) {
  const updateCredential = (id: string, patch: Partial<ImagePullCredential>) => {
    onChange(
      credentials.map((credential) =>
        credential.id === id ? { ...credential, ...patch } : credential,
      ),
    )
  }

  const removeCredential = (id: string) => {
    if (credentials.length === 1) {
      onChange([createImagePullCredential()])
      return
    }
    onChange(credentials.filter((credential) => credential.id !== id))
  }

  return (
    <>
      {credentials.map((credential, index) => (
        <div key={credential.id} className="tenant-secrets__credential-block">
          <FormGroup
            label="Registry server address"
            fieldId={`registry-server-${credential.id}`}
            isRequired={index === 0}
          >
            <TextInput
              id={`registry-server-${credential.id}`}
              value={credential.registryServer}
              placeholder="quay.io"
              onChange={(_event, value) => updateCredential(credential.id, { registryServer: value })}
            />
          </FormGroup>
          <FormGroup label="User name" fieldId={`registry-username-${credential.id}`} isRequired={index === 0}>
            <TextInput
              id={`registry-username-${credential.id}`}
              value={credential.username}
              onChange={(_event, value) => updateCredential(credential.id, { username: value })}
            />
          </FormGroup>
          <FormGroup label="Password" fieldId={`registry-password-${credential.id}`} isRequired={index === 0}>
            <SecretFieldInput
              id={`registry-password-${credential.id}`}
              value={credential.password}
              onChange={(_event, value) => updateCredential(credential.id, { password: value })}
              aria-label={`Registry password ${index + 1}`}
            />
          </FormGroup>
          <FormGroup label="Email" fieldId={`registry-email-${credential.id}`}>
            <TextInput
              id={`registry-email-${credential.id}`}
              value={credential.email}
              onChange={(_event, value) => updateCredential(credential.id, { email: value })}
            />
          </FormGroup>
          {credentials.length > 1 ? (
            <Button
              variant="plain"
              className="tenant-secrets__pair-remove"
              icon={<MinusCircleIcon />}
              aria-label={`Remove credentials ${index + 1}`}
              onClick={() => removeCredential(credential.id)}
            />
          ) : null}
        </div>
      ))}
      <Button
        variant="link"
        icon={<PlusCircleIcon />}
        className="tenant-secrets__add-row"
        onClick={() => onChange([...credentials, createImagePullCredential()])}
      >
        Add credentials
      </Button>
    </>
  )
}

function buildSecretSummaryForSave(type: TenantSecretType, form: TenantSecretFormState): string {
  const description = form.description.trim()
  return description || buildSecretSummary(type, form)
}

function SecretDescriptionField({
  description,
  fieldId,
  onChange,
}: {
  description: string
  fieldId: string
  onChange: (description: string) => void
}) {
  return (
    <FormGroup label="Description" fieldId={fieldId}>
      <TextArea
        id={fieldId}
        value={description}
        onChange={(_event, value) => onChange(value)}
        placeholder="Describe how this secret will be used"
        resizeOrientation="vertical"
      />
    </FormGroup>
  )
}

function KeyValueSecretForm({
  form,
  description,
  onChange,
  onDescriptionChange,
}: {
  form: TenantSecretFormState['keyValue']
  description: string
  onChange: (form: TenantSecretFormState['keyValue']) => void
  onDescriptionChange: (description: string) => void
}) {
  return (
    <Form autoComplete="off" className="provider-admin-network-inventory__form">
      <FormGroup label="Secret name" fieldId="key-value-secret-name" isRequired>
        <KubernetesResourceNameField
          id="key-value-secret-name"
          value={form.name}
          onChange={(value) => onChange({ ...form, name: value })}
        />
      </FormGroup>
      <SecretDescriptionField
        description={description}
        fieldId="key-value-secret-description"
        onChange={onDescriptionChange}
      />
      <KeyValuePairsField
        pairs={form.pairs}
        onChange={(pairs) => onChange({ ...form, pairs })}
      />
    </Form>
  )
}

function ImagePullSecretForm({
  form,
  description,
  onChange,
  onDescriptionChange,
}: {
  form: TenantSecretFormState['imagePull']
  description: string
  onChange: (form: TenantSecretFormState['imagePull']) => void
  onDescriptionChange: (description: string) => void
}) {
  return (
    <Form autoComplete="off" className="provider-admin-network-inventory__form">
      <FormGroup label="Secret name" fieldId="image-pull-secret-name" isRequired>
        <KubernetesResourceNameField
          id="image-pull-secret-name"
          value={form.name}
          onChange={(value) => onChange({ ...form, name: value })}
        />
      </FormGroup>
      <SecretDescriptionField
        description={description}
        fieldId="image-pull-secret-description"
        onChange={onDescriptionChange}
      />
      <FormGroup label="Authentication type" fieldId="image-pull-auth-type" isRequired>
        <div className="tenant-secrets__radio-group">
          <Radio
            id="image-pull-auth-registry"
            name="image-pull-auth-type"
            label="Image registry credentials"
            isChecked={form.authMode === 'registry-credentials'}
            onChange={() => onChange({ ...form, authMode: 'registry-credentials' })}
          />
          <Radio
            id="image-pull-auth-upload"
            name="image-pull-auth-type"
            label="Upload configuration file"
            isChecked={form.authMode === 'upload-configuration'}
            onChange={() => onChange({ ...form, authMode: 'upload-configuration' })}
          />
        </div>
      </FormGroup>
      {form.authMode === 'registry-credentials' ? (
        <ImagePullCredentialsField
          credentials={form.credentials}
          onChange={(credentials) => onChange({ ...form, credentials })}
        />
      ) : (
        <FormGroup label="Configuration file" fieldId="image-pull-config-file" isRequired>
          <FileUpload
            id="image-pull-config-file"
            type="text"
            value={form.configurationFileContents}
            filename={form.configurationFileName}
            filenamePlaceholder="Drag and drop a file or upload one"
            browseButtonText="Upload"
            clearButtonText="Remove"
            onFileInputChange={(_event, file) =>
              onChange({ ...form, configurationFileName: file.name })
            }
            onReadStarted={() => undefined}
            onReadFinished={(_event, file) => {
              file.text().then((text) => {
                onChange({ ...form, configurationFileContents: text })
              })
            }}
            onClearClick={() =>
              onChange({
                ...form,
                configurationFileName: '',
                configurationFileContents: '',
              })
            }
          />
        </FormGroup>
      )}
    </Form>
  )
}

function SourceSecretForm({
  form,
  description,
  onChange,
  onDescriptionChange,
}: {
  form: TenantSecretFormState['source']
  description: string
  onChange: (form: TenantSecretFormState['source']) => void
  onDescriptionChange: (description: string) => void
}) {
  return (
    <Form autoComplete="off" className="provider-admin-network-inventory__form">
      <FormGroup label="Secret name" fieldId="source-secret-name" isRequired>
        <KubernetesResourceNameField
          id="source-secret-name"
          value={form.name}
          onChange={(value) => onChange({ ...form, name: value })}
        />
      </FormGroup>
      <SecretDescriptionField
        description={description}
        fieldId="source-secret-description"
        onChange={onDescriptionChange}
      />
      <FormGroup label="Authentication type" fieldId="source-auth-type" isRequired>
        <div className="tenant-secrets__radio-group">
          <Radio
            id="source-auth-basic"
            name="source-auth-type"
            label="Basic authentication"
            isChecked={form.authMode === 'basic'}
            onChange={() => onChange({ ...form, authMode: 'basic' })}
          />
          <Radio
            id="source-auth-ssh"
            name="source-auth-type"
            label="SSH key"
            isChecked={form.authMode === 'ssh-key'}
            onChange={() => onChange({ ...form, authMode: 'ssh-key' })}
          />
        </div>
      </FormGroup>
      {form.authMode === 'basic' ? (
        <>
          <FormGroup label="Username" fieldId="source-username" isRequired>
            <TextInput
              id="source-username"
              value={form.username}
              onChange={(_event, value) => onChange({ ...form, username: value })}
            />
          </FormGroup>
          <FormGroup label="Password or token" fieldId="source-password" isRequired>
            <SecretFieldInput
              id="source-password"
              value={form.passwordOrToken}
              onChange={(_event, value) => onChange({ ...form, passwordOrToken: value })}
              aria-label="Password or token"
            />
          </FormGroup>
        </>
      ) : (
        <FormGroup label="SSH private key" fieldId="source-ssh-key" isRequired>
          <FileUpload
            id="source-ssh-key"
            type="text"
            value={form.sshPrivateKeyContents}
            filename={form.sshPrivateKeyFileName}
            filenamePlaceholder="Drag and drop a private key file or upload one"
            browseButtonText="Upload"
            clearButtonText="Remove"
            onFileInputChange={(_event, file) =>
              onChange({ ...form, sshPrivateKeyFileName: file.name })
            }
            onReadStarted={() => undefined}
            onReadFinished={(_event, file) => {
              file.text().then((text) => {
                onChange({ ...form, sshPrivateKeyContents: text })
              })
            }}
            onClearClick={() =>
              onChange({
                ...form,
                sshPrivateKeyFileName: '',
                sshPrivateKeyContents: '',
              })
            }
          />
        </FormGroup>
      )}
    </Form>
  )
}

function WebhookSecretForm({
  form,
  description,
  onChange,
  onDescriptionChange,
}: {
  form: TenantSecretFormState['webhook']
  description: string
  onChange: (form: TenantSecretFormState['webhook']) => void
  onDescriptionChange: (description: string) => void
}) {
  return (
    <Form autoComplete="off" className="provider-admin-network-inventory__form">
      <FormGroup label="Secret name" fieldId="webhook-secret-name" isRequired>
        <KubernetesResourceNameField
          id="webhook-secret-name"
          value={form.name}
          onChange={(value) => onChange({ ...form, name: value })}
        />
      </FormGroup>
      <SecretDescriptionField
        description={description}
        fieldId="webhook-secret-description"
        onChange={onDescriptionChange}
      />
      <FormGroup label="Webhook secret key" fieldId="webhook-secret-key" isRequired>
        <div className="tenant-secrets__webhook-key-row">
          <TextArea
            id="webhook-secret-key"
            value={form.webhookSecretKey}
            onChange={(_event, value) => onChange({ ...form, webhookSecretKey: value })}
            resizeOrientation="vertical"
            rows={3}
          />
          <Button
            variant="secondary"
            icon={<SyncAltIcon />}
            onClick={() => onChange({ ...form, webhookSecretKey: generateWebhookSecretKey() })}
          >
            Generate
          </Button>
        </div>
      </FormGroup>
    </Form>
  )
}

const HIDDEN_SECRET_VALUE_REVIEW_LABEL = 'Value provided (hidden for security)'

function formatKeyValuePairReviewValue(pair: KeyValuePair): string {
  if (pair.valueMode === 'upload-file' && pair.valueFileName.trim()) {
    return `File: ${pair.valueFileName.trim()}`
  }

  return HIDDEN_SECRET_VALUE_REVIEW_LABEL
}

function renderSecretReviewDescription(description: string) {
  return (
    <DescriptionListGroup>
      <DescriptionListTerm>Description</DescriptionListTerm>
      <DescriptionListDescription>{description.trim() || '—'}</DescriptionListDescription>
    </DescriptionListGroup>
  )
}

function renderSecretReview(type: TenantSecretType, form: TenantSecretFormState) {
  const secretName = getSecretName(type, form)

  switch (type) {
    case 'key-value': {
      const pairs = form.keyValue.pairs.filter((pair) => pair.key.trim() && pair.value.trim())
      return (
        <DescriptionList isCompact className="provider-admin-network-inventory__wizard-review">
          <DescriptionListGroup>
            <DescriptionListTerm>Secret name</DescriptionListTerm>
            <DescriptionListDescription>{secretName || '—'}</DescriptionListDescription>
          </DescriptionListGroup>
          {renderSecretReviewDescription(form.description)}
          <DescriptionListGroup>
            <DescriptionListTerm>Key / value pairs</DescriptionListTerm>
            <DescriptionListDescription>
              {pairs.length > 0
                ? pairs.map((pair, index) => (
                    <Fragment key={pair.key.trim() || index}>
                      {index > 0 ? <br /> : null}
                      <code>{pair.key.trim()}</code>
                      {' — '}
                      {formatKeyValuePairReviewValue(pair)}
                    </Fragment>
                  ))
                : '—'}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      )
    }
    case 'image-pull': {
      const imagePull = form.imagePull
      return (
        <DescriptionList isCompact className="provider-admin-network-inventory__wizard-review">
          <DescriptionListGroup>
            <DescriptionListTerm>Secret name</DescriptionListTerm>
            <DescriptionListDescription>{secretName || '—'}</DescriptionListDescription>
          </DescriptionListGroup>
          {renderSecretReviewDescription(form.description)}
          <DescriptionListGroup>
            <DescriptionListTerm>Authentication type</DescriptionListTerm>
            <DescriptionListDescription>
              {imagePull.authMode === 'upload-configuration'
                ? 'Upload configuration file'
                : 'Image registry credentials'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          {imagePull.authMode === 'upload-configuration' ? (
            <DescriptionListGroup>
              <DescriptionListTerm>Configuration file</DescriptionListTerm>
              <DescriptionListDescription>
                {imagePull.configurationFileName.trim() || 'Uploaded file'}
              </DescriptionListDescription>
            </DescriptionListGroup>
          ) : (
            <DescriptionListGroup>
              <DescriptionListTerm>Registries</DescriptionListTerm>
              <DescriptionListDescription>
                {imagePull.credentials
                  .filter((credential) => credential.registryServer.trim())
                  .map((credential) => credential.registryServer.trim())
                  .join(', ') || '—'}
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
        </DescriptionList>
      )
    }
    case 'source': {
      const source = form.source
      return (
        <DescriptionList isCompact className="provider-admin-network-inventory__wizard-review">
          <DescriptionListGroup>
            <DescriptionListTerm>Secret name</DescriptionListTerm>
            <DescriptionListDescription>{secretName || '—'}</DescriptionListDescription>
          </DescriptionListGroup>
          {renderSecretReviewDescription(form.description)}
          <DescriptionListGroup>
            <DescriptionListTerm>Authentication type</DescriptionListTerm>
            <DescriptionListDescription>
              {source.authMode === 'ssh-key' ? 'SSH key' : 'Basic authentication'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          {source.authMode === 'basic' ? (
            <>
              <DescriptionListGroup>
                <DescriptionListTerm>Username</DescriptionListTerm>
                <DescriptionListDescription>{source.username.trim() || '—'}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Password or token</DescriptionListTerm>
                <DescriptionListDescription>
                  {HIDDEN_SECRET_VALUE_REVIEW_LABEL}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </>
          ) : (
            <DescriptionListGroup>
              <DescriptionListTerm>SSH private key</DescriptionListTerm>
              <DescriptionListDescription>
                {source.sshPrivateKeyFileName.trim() || 'Uploaded key'}
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
        </DescriptionList>
      )
    }
    case 'webhook':
      return (
        <DescriptionList isCompact className="provider-admin-network-inventory__wizard-review">
          <DescriptionListGroup>
            <DescriptionListTerm>Secret name</DescriptionListTerm>
            <DescriptionListDescription>{secretName || '—'}</DescriptionListDescription>
          </DescriptionListGroup>
          {renderSecretReviewDescription(form.description)}
          <DescriptionListGroup>
            <DescriptionListTerm>Webhook secret key</DescriptionListTerm>
            <DescriptionListDescription>{HIDDEN_SECRET_VALUE_REVIEW_LABEL}</DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      )
    default:
      return null
  }
}

function renderSecretDetailsForm(
  type: TenantSecretType,
  formState: TenantSecretFormState,
  onChange: (form: TenantSecretFormState) => void,
) {
  switch (type) {
    case 'key-value':
      return (
        <KeyValueSecretForm
          form={formState.keyValue}
          description={formState.description}
          onChange={(keyValue) => onChange({ ...formState, keyValue })}
          onDescriptionChange={(description) => onChange({ ...formState, description })}
        />
      )
    case 'image-pull':
      return (
        <ImagePullSecretForm
          form={formState.imagePull}
          description={formState.description}
          onChange={(imagePull) => onChange({ ...formState, imagePull })}
          onDescriptionChange={(description) => onChange({ ...formState, description })}
        />
      )
    case 'source':
      return (
        <SourceSecretForm
          form={formState.source}
          description={formState.description}
          onChange={(source) => onChange({ ...formState, source })}
          onDescriptionChange={(description) => onChange({ ...formState, description })}
        />
      )
    case 'webhook':
      return (
        <WebhookSecretForm
          form={formState.webhook}
          description={formState.description}
          onChange={(webhook) => onChange({ ...formState, webhook })}
          onDescriptionChange={(description) => onChange({ ...formState, description })}
        />
      )
    default:
      return null
  }
}

function SecretTypeStep({
  selectedType,
  onChange,
}: {
  selectedType: TenantSecretType | null
  onChange: (type: TenantSecretType) => void
}) {
  return (
    <div className="provider-admin-network-inventory__wizard-step">
      <Content component="p" className="provider-admin-network-inventory__wizard-lede">
        Choose a secret type.
      </Content>
      <div
        className="provider-setup-template__service-cards"
        role="radiogroup"
        aria-label="Secret type"
      >
        {TENANT_SECRET_TYPE_OPTIONS.map((option) => {
          const isSelected = selectedType === option.id
          const titleId = `create-secret-type-${option.id}-title`

          return (
            <Card
              key={option.id}
              isSelectable
              isSelected={isSelected}
              className="provider-setup-template__service-card"
              aria-labelledby={titleId}
              onClick={() => onChange(option.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onChange(option.id)
                }
              }}
            >
              <CardBody className="provider-setup-template__service-card-body">
                {isSelected ? (
                  <Label
                    color="grey"
                    isCompact
                    className="provider-setup-template__service-card-badge"
                  >
                    Selected
                  </Label>
                ) : null}
                <Title
                  id={titleId}
                  headingLevel="h3"
                  size="md"
                  className="provider-setup-template__service-card-title tenant-secrets__type-card-title"
                >
                  {option.label}
                </Title>
                <Content
                  component="p"
                  className="provider-setup-template__service-card-description"
                >
                  {option.description}
                </Content>
              </CardBody>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export function CreateTenantSecretFlow({
  tenantSlug,
  scope = 'tenant',
  initialType,
  editingSecret = null,
  presentation = 'page',
  isOpen = true,
  usage = 'general',
  onClose,
  onCreated,
  onUpdated,
}: CreateTenantSecretFlowProps) {
  const isEditMode = editingSecret !== null
  const includeTypeStep = !isEditMode && initialType == null
  const isModal = presentation === 'modal'
  const defaultType = isEditMode
    ? editingSecret.type
    : (initialType ?? (isModal ? 'key-value' : null))
  const [selectedType, setSelectedType] = useState<TenantSecretType | null>(defaultType)
  const activeType = selectedType ?? initialType ?? editingSecret?.type ?? null
  const [formState, setFormState] = useState<TenantSecretFormState>(() =>
    editingSecret
      ? secretFormStateFromTenantSecret(editingSecret)
      : buildInitialSecretFormState(defaultType ?? 'key-value'),
  )

  const wizardTitle = isEditMode ? `Edit ${editingSecret.name}` : 'Create secret'
  const wizardSteps = useMemo(
    () => getSecretWizardSteps({ includeTypeStep, type: activeType }),
    [activeType, includeTypeStep],
  )
  const isDetailsStepValid = activeType ? isFormValid(activeType, formState) : false

  const resetFlow = (
    type: TenantSecretType | null = isEditMode
      ? editingSecret.type
      : (initialType ?? (isModal ? 'key-value' : null)),
  ) => {
    setSelectedType(type)
    setFormState(
      isEditMode && editingSecret
        ? secretFormStateFromTenantSecret(editingSecret)
        : buildInitialSecretFormState(type ?? 'key-value'),
    )
  }

  const handleClose = () => {
    resetFlow()
    onClose()
  }

  const { requestClose, leaveConfirmModal, wrapStepFooter } = useWizardLeaveConfirm({
    onLeave: handleClose,
    primaryActionLabel: isEditMode ? 'Discard changes' : 'Leave',
    titleId: 'create-secret-wizard-title',
  })

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (editingSecret) {
      setSelectedType(editingSecret.type)
      setFormState(secretFormStateFromTenantSecret(editingSecret))
      return
    }

    const type = initialType ?? (isModal ? 'key-value' : null)
    setSelectedType(type)
    setFormState(buildInitialSecretFormState(type ?? 'key-value'))
  }, [editingSecret, initialType, isModal, isOpen])

  const handleTypeChange = (type: TenantSecretType) => {
    setSelectedType(type)
    setFormState(buildInitialSecretFormState(type))
  }

  const handleSave = () => {
    if (!activeType || !isDetailsStepValid) {
      return
    }

    const secret: TenantSecret = isEditMode
      ? {
          ...editingSecret,
          name: getSecretName(activeType, formState),
          type: activeType,
          summary: buildSecretSummaryForSave(activeType, formState),
          data: buildTenantSecretData(activeType, formState),
        }
      : {
          id: generateTenantSecretId(),
          name: getSecretName(activeType, formState),
          type: activeType,
          usage,
          createdAt: new Date().toISOString(),
          summary: buildSecretSummaryForSave(activeType, formState),
          data: buildTenantSecretData(activeType, formState),
        }

    if (isEditMode) {
      updateSecret(scope, tenantSlug, secret)
      onUpdated?.(secret)
    } else {
      addSecret(scope, tenantSlug, secret)
      onCreated(secret)
    }

    handleClose()
  }

  function renderStepContent(stepId: string) {
    if (stepId === TYPE_SELECTION_STEP_ID) {
      return <SecretTypeStep selectedType={selectedType} onChange={handleTypeChange} />
    }

    if (stepId === SECRET_DETAILS_STEP_ID) {
      if (!activeType) {
        return (
          <Content component="p" className="provider-admin-network-inventory__wizard-lede">
            Choose a secret type to continue.
          </Content>
        )
      }

      return (
        <div className="provider-admin-network-inventory__wizard-step">
          <Content component="p" className="provider-admin-network-inventory__wizard-lede">
            {getSecretWizardLede(activeType)}
          </Content>
          {renderSecretDetailsForm(activeType, formState, setFormState)}
        </div>
      )
    }

    return activeType ? renderSecretReview(activeType, formState) : null
  }

  function getStepFooter(stepId: string) {
    if (stepId === TYPE_SELECTION_STEP_ID) {
      return wrapStepFooter({
        isNextDisabled: !selectedType,
      })
    }

    if (stepId === SECRET_DETAILS_STEP_ID) {
      return wrapStepFooter({
        isNextDisabled: !activeType || !isDetailsStepValid,
      })
    }

    if (stepId === 'review') {
      return wrapStepFooter({
        nextButtonText: (
          <span className="provider-admin-network-inventory__wizard-footer-label">
            <KeyIcon aria-hidden />
            <span>{isEditMode ? 'Save changes' : 'Create secret'}</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
        onNext: handleSave,
        isNextDisabled: !activeType || !isDetailsStepValid,
      })
    }

    return undefined
  }

  const isPage = presentation === 'page'
  const wizardKey = `${isEditMode ? 'edit' : 'create'}-secret-${editingSecret?.id ?? activeType ?? 'type'}-${includeTypeStep ? 'picker' : 'fixed'}`

  const wizard = isOpen ? (
    <Wizard
      key={wizardKey}
      className="tenant-secrets__wizard"
      height={isPage ? '100%' : '40rem'}
      isPlain={isPage}
      onClose={isPage ? undefined : requestClose}
      header={
        isPage ? undefined : (
          <WizardHeader
            title={wizardTitle}
            titleId="create-secret-wizard-title"
            onClose={requestClose}
            closeButtonAriaLabel={isEditMode ? 'Close edit secret wizard' : 'Close create secret wizard'}
          />
        )
      }
    >
      {wizardSteps.map((step) => (
        <WizardStep
          key={step.id}
          id={`create-secret-step-${step.id}`}
          name={step.label}
          footer={getStepFooter(step.id)}
        >
          {renderStepContent(step.id)}
        </WizardStep>
      ))}
    </Wizard>
  ) : null

  return (
    <>
      {isPage ? (
        <NetworkInventoryCreateWizardShell
          isOpen={isOpen}
          parentLabel="Secrets"
          title={wizardTitle}
          titleId="create-secret-wizard-title"
          steps={wizardSteps}
          renderStepContent={renderStepContent}
          getStepFooter={getStepFooter}
          onClose={handleClose}
          className="tenant-secrets__wizard"
          leaveConfirmPrimaryActionLabel={isEditMode ? 'Discard changes' : 'Leave'}
        />
      ) : (
        <>
          <Modal
            variant={ModalVariant.medium}
            width="64rem"
            maxWidth="64rem"
            isOpen={isOpen}
            onEscapePress={requestClose}
            aria-labelledby="create-secret-wizard-title"
            className="tenant-secrets__create-modal"
          >
            {wizard}
          </Modal>
          {leaveConfirmModal}
        </>
      )}
    </>
  )
}
