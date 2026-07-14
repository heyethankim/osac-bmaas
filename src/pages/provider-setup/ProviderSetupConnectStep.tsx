import { useState } from 'react'
import { EyeIcon } from '@patternfly/react-icons/dist/esm/icons/eye-icon'
import { EyeSlashIcon } from '@patternfly/react-icons/dist/esm/icons/eye-slash-icon'
import { LinkIcon } from '@patternfly/react-icons/dist/esm/icons/link-icon'
import { ShieldAltIcon } from '@patternfly/react-icons/dist/esm/icons/shield-alt-icon'
import {
  ActionGroup,
  Alert,
  Button,
  Card,
  CardBody,
  Content,
  Divider,
  Form,
  FormGroup,
  FormHelperText,
  FormSection,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  InputGroup,
  InputGroupItem,
  Spinner,
  Stack,
  StackItem,
  TextInput,
  Title,
} from '@patternfly/react-core'
import {
  DEFAULT_CONNECT_FORM,
  type ConnectVerificationState,
} from '../../providerSetup/constants'

type ProviderSetupConnectStepProps = {
  embedded?: boolean
  workspaceLayout?: boolean
  verificationState: ConnectVerificationState
  onTestConnection: () => void
  onSaveContinue?: () => void
  isSaveContinueDisabled?: boolean
}

type UrlEndpointInputProps = {
  id: string
  value: string
  onChange: (_event: React.FormEvent<HTMLInputElement>, value: string) => void
  isDisabled: boolean
}

function UrlEndpointInput({ id, value, onChange, isDisabled }: UrlEndpointInputProps) {
  return (
    <TextInput
      id={id}
      className="provider-setup-url-input"
      value={value}
      onChange={onChange}
      isDisabled={isDisabled}
      customIcon={<LinkIcon aria-hidden />}
    />
  )
}

type SecretInputProps = {
  id: string
  value: string
  onChange: (_event: React.FormEvent<HTMLInputElement>, value: string) => void
  isDisabled: boolean
  showAriaLabel: string
  hideAriaLabel: string
  prefixIcon?: React.ReactNode
}

function SecretInput({
  id,
  value,
  onChange,
  isDisabled,
  showAriaLabel,
  hideAriaLabel,
  prefixIcon,
}: SecretInputProps) {
  const [isHidden, setIsHidden] = useState(true)

  const controlClassName = [
    'pf-v6-c-form-control',
    prefixIcon ? 'pf-m-icon provider-setup-url-input' : '',
    isDisabled ? 'pf-m-disabled' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <InputGroup>
      <InputGroupItem isFill>
        <span className={controlClassName}>
          {prefixIcon ? (
            <span className="pf-v6-c-form-control__utilities">
              <span className="pf-v6-c-form-control__icon">{prefixIcon}</span>
            </span>
          ) : null}
          <input
            id={id}
            type={isHidden ? 'password' : 'text'}
            value={value}
            onChange={(event) => onChange(event, event.currentTarget.value)}
            disabled={isDisabled}
            autoComplete="off"
            spellCheck={false}
          />
        </span>
      </InputGroupItem>
      <InputGroupItem>
        <Button
          variant="control"
          type="button"
          aria-label={isHidden ? showAriaLabel : hideAriaLabel}
          aria-pressed={!isHidden}
          icon={isHidden ? <EyeIcon /> : <EyeSlashIcon />}
          onClick={() => setIsHidden((hidden) => !hidden)}
          isDisabled={isDisabled}
        />
      </InputGroupItem>
    </InputGroup>
  )
}

export function ProviderSetupConnectStep({
  embedded = false,
  workspaceLayout = false,
  verificationState,
  onTestConnection,
  onSaveContinue,
  isSaveContinueDisabled = true,
}: ProviderSetupConnectStepProps) {
  const [form, setForm] = useState(DEFAULT_CONNECT_FORM)

  const isVerifying = verificationState === 'verifying'
  const isVerified = verificationState === 'verified'

  const connectForm = (
    <Form
      autoComplete="off"
      isWidthLimited={!embedded && !workspaceLayout}
      maxWidth={embedded || workspaceLayout ? '64rem' : '52rem'}
      className="provider-setup-connect-form"
    >
      <FormSection title="Network endpoints">
        <FormGroup label="Balance Operator API endpoint" fieldId="balance-operator-endpoint">
          <UrlEndpointInput
            id="balance-operator-endpoint"
            value={form.balanceOperatorEndpoint}
            onChange={(_e, value) =>
              setForm((current) => ({ ...current, balanceOperatorEndpoint: value }))
            }
            isDisabled={isVerifying}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                Network address where the OSAC Balance Operator API is listening
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>

        <FormGroup label="Metal3 controller API endpoint" fieldId="metal3-endpoint">
          <UrlEndpointInput
            id="metal3-endpoint"
            value={form.metal3Endpoint}
            onChange={(_e, value) =>
              setForm((current) => ({ ...current, metal3Endpoint: value }))
            }
            isDisabled={isVerifying}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                Network address where the Metal3 Baremetal Operator API is listening
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </FormSection>
      <Divider />

      <FormSection title="Access credentials">
        <FormGroup label="Service account token" fieldId="service-account-token">
          <SecretInput
            id="service-account-token"
            value={form.serviceAccountToken}
            onChange={(_e, value) =>
              setForm((current) => ({ ...current, serviceAccountToken: value }))
            }
            isDisabled={isVerifying}
            prefixIcon={<ShieldAltIcon aria-hidden />}
            showAriaLabel="Show token"
            hideAriaLabel="Hide token"
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                Encrypted token granting portal access to both operators
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>

        <Grid hasGutter>
          <GridItem span={12} md={6}>
            <FormGroup label="Admin username" fieldId="admin-username">
              <TextInput
                id="admin-username"
                value={form.adminUsername}
                onChange={(_e, value) =>
                  setForm((current) => ({ ...current, adminUsername: value }))
                }
                isDisabled={isVerifying}
              />
            </FormGroup>
          </GridItem>
          <GridItem span={12} md={6}>
            <FormGroup label="Password" fieldId="admin-password">
              <SecretInput
                id="admin-password"
                value={form.password}
                onChange={(_e, value) =>
                  setForm((current) => ({ ...current, password: value }))
                }
                isDisabled={isVerifying}
                showAriaLabel="Show password"
                hideAriaLabel="Hide password"
              />
            </FormGroup>
          </GridItem>
        </Grid>
      </FormSection>
      <Divider />

      <FormSection title="Scope and namespace">
        <FormGroup label="Kubernetes namespace" fieldId="kubernetes-namespace">
          <TextInput
            id="kubernetes-namespace"
            value={form.kubernetesNamespace}
            onChange={(_e, value) =>
              setForm((current) => ({ ...current, kubernetesNamespace: value }))
            }
            isDisabled={isVerifying}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                Namespace where BareMetalHost and BareMetalInstance custom resources will be
                managed
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </FormSection>

      {workspaceLayout ? (
        <div className="provider-setup-connect-form__footer">
          {isVerified ? (
            <Alert
              variant="success"
              isInline
              title="Connection verified"
              className="provider-setup-page__verify-alert"
            >
              Handshake successful in 42 ms.
            </Alert>
          ) : null}
          <ActionGroup className="provider-setup-connect-form__actions">
            <Button
              variant="secondary"
              onClick={onTestConnection}
              isDisabled={isVerifying || isVerified}
              icon={isVerifying ? <Spinner size="sm" aria-label="Verifying" /> : undefined}
            >
              {isVerifying ? 'Verifying…' : 'Test connection'}
            </Button>
            <Content component="p" className="provider-setup-connect-form__vault-note">
              All credentials stored encrypted in the platform vault
            </Content>
          </ActionGroup>
        </div>
      ) : embedded && onSaveContinue ? (
        <div className="provider-setup-connect-form__footer">
          {isVerified ? (
            <Alert
              variant="success"
              isInline
              title="Connection verified"
              className="provider-setup-page__verify-alert"
            >
              Handshake successful in 42 ms. Continue to hardware discovery.
            </Alert>
          ) : null}
          <ActionGroup className="provider-setup-connect-form__actions">
            <Button
              variant="secondary"
              onClick={onTestConnection}
              isDisabled={isVerifying || isVerified}
              icon={isVerifying ? <Spinner size="sm" aria-label="Verifying" /> : undefined}
            >
              {isVerifying ? 'Verifying…' : 'Test connection'}
            </Button>
            <Content component="p" className="provider-setup-connect-form__vault-note">
              All credentials stored encrypted in the platform vault
            </Content>
            <Button
              variant="primary"
              className="provider-setup-connect-form__save-continue"
              onClick={onSaveContinue}
              isDisabled={isSaveContinueDisabled}
            >
              Save & continue
            </Button>
          </ActionGroup>
        </div>
      ) : (
        <>
          {isVerified ? (
            <Alert
              variant="success"
              isInline
              title="Connection verified"
              className="provider-setup-page__verify-alert"
            >
              Handshake successful in 42 ms. Continue to hardware discovery.
            </Alert>
          ) : null}
          <Button
            variant="secondary"
            onClick={onTestConnection}
            isDisabled={isVerifying || isVerified}
            icon={isVerifying ? <Spinner size="sm" aria-label="Verifying" /> : undefined}
          >
            {isVerifying ? 'Verifying…' : 'Test connection'}
          </Button>
        </>
      )}
    </Form>
  )

  if (workspaceLayout) {
    return connectForm
  }

  return (
    <Stack hasGutter>
      {!embedded ? (
        <StackItem>
          <Title headingLevel="h1" size="2xl">
            Connect your data center
          </Title>
          <Content component="p" className="provider-setup-page__lede">
            Enter network addresses and credentials for your physical infrastructure; all secrets are encrypted at rest inside the platform vault.
          </Content>
        </StackItem>
      ) : (
        <StackItem>
          <Content component="p" className="provider-setup-page__lede">
            Enter network addresses and credentials for your physical infrastructure; all secrets are encrypted at rest inside the platform vault.
          </Content>
        </StackItem>
      )}

      <StackItem>
        {embedded ? (
          connectForm
        ) : (
          <Grid hasGutter>
            <GridItem span={12} md={8}>
              <Card isCompact={false}>
                <CardBody>{connectForm}</CardBody>
              </Card>
            </GridItem>

            <GridItem span={12} md={4}>
              <Card isCompact={false} isFullHeight>
                <CardBody>
                  <Stack hasGutter>
                    <StackItem>
                      <Title headingLevel="h3" size="md">
                        Before you continue
                      </Title>
                      <Content component="p">
                        Test connection validates reachability to both operators without saving
                        configuration changes.
                      </Content>
                    </StackItem>
                    <StackItem>
                      <Content component="ul" className="provider-setup-page__tips">
                        <li>Ensure firewall rules allow HTTPS from the portal cluster.</li>
                        <li>Service account tokens expire — rotate them on a regular schedule.</li>
                        <li>Namespace must already exist in the target cluster.</li>
                      </Content>
                    </StackItem>
                  </Stack>
                </CardBody>
              </Card>
            </GridItem>
          </Grid>
        )}
      </StackItem>
    </Stack>
  )
}
