import { type ReactNode, useEffect, useState } from 'react'
import { EyeIcon } from '@patternfly/react-icons/dist/esm/icons/eye-icon'
import { EyeSlashIcon } from '@patternfly/react-icons/dist/esm/icons/eye-slash-icon'
import {
  Button,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Spinner,
  TextInput,
  Title,
} from '@patternfly/react-core'
import redHatHatLogoUrl from '../assets/Logo-RedHat-Hat-Color-RGB.svg?url'

function OsacAuthShell({
  title,
  children,
  isBusy,
  busyLabel,
}: {
  title: string
  children: ReactNode
  isBusy?: boolean
  busyLabel?: string
}) {
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="osac-signin">
      <main className="osac-signin__main">
        <div className="osac-signin__frame">
          <div className="osac-signin__brand" aria-label="Red Hat">
            <img
              src={redHatHatLogoUrl}
              alt=""
              className="osac-signin__brand-hat"
              decoding="async"
            />
            <span className="osac-signin__brand-wordmark">Red Hat</span>
          </div>

          <Title headingLevel="h1" size="2xl" className="osac-signin__headline">
            {title}
          </Title>

          {children}
        </div>
      </main>

      {isBusy ? (
        <div
          className="osac-signin__loading-veil"
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label={busyLabel ?? 'Continuing'}
        >
          <Spinner size="lg" aria-label={busyLabel ?? 'Continuing'} />
          <p className="osac-signin__loading-veil-text">{busyLabel ?? 'Continuing'}</p>
        </div>
      ) : null}
    </div>
  )
}

export type OsacSignInPageProps = {
  onNext: () => void
  defaultEmail?: string
  isContinuing?: boolean
  variant?: 'email' | 'local-account'
  defaultUsername?: string
  defaultPassword?: string
  helperText?: string
  errorMessage?: string
  submitLabel?: string
  onSubmitLocalAccount?: (username: string, password: string) => void
}

export function OsacSignInPage({
  onNext,
  defaultEmail = '',
  isContinuing = false,
  variant = 'email',
  defaultUsername = '',
  defaultPassword = '',
  helperText,
  errorMessage,
  submitLabel,
  onSubmitLocalAccount,
}: OsacSignInPageProps) {
  const [email, setEmail] = useState(defaultEmail)
  const [username, setUsername] = useState(defaultUsername)
  const [password, setPassword] = useState(defaultPassword)

  useEffect(() => {
    setEmail(defaultEmail)
  }, [defaultEmail])

  useEffect(() => {
    setUsername(defaultUsername)
    setPassword(defaultPassword)
  }, [defaultUsername, defaultPassword])

  const isLocalAccount = variant === 'local-account'
  const canSubmit = isLocalAccount
    ? Boolean(username.trim() && password.trim())
    : Boolean(email.trim())

  return (
    <OsacAuthShell
      title="Sign in"
      isBusy={isContinuing}
      busyLabel={isLocalAccount ? 'Signing you in…' : 'Continuing to sign in'}
    >
      <Form
        autoComplete="off"
        className="osac-signin__form"
        onSubmit={(event) => {
          event.preventDefault()
          if (isContinuing || !canSubmit) {
            return
          }
          if (isLocalAccount) {
            onSubmitLocalAccount?.(username.trim(), password)
            return
          }
          onNext()
        }}
      >
        {helperText ? (
          <p className="osac-signin__helper">{helperText}</p>
        ) : null}

        {isLocalAccount ? (
          <>
            <FormGroup label="Username" fieldId="osac-username" className="osac-signin__field">
              <TextInput
                id="osac-username"
                name="username"
                type="text"
                value={username}
                onChange={(_event, value) => setUsername(value)}
                autoComplete="username"
                aria-label="Username"
                isDisabled={isContinuing}
                className="osac-signin__field-input"
              />
            </FormGroup>
            <FormGroup label="Password" fieldId="osac-password" className="osac-signin__field">
              <TextInput
                id="osac-password"
                name="password"
                type="password"
                value={password}
                onChange={(_event, value) => setPassword(value)}
                autoComplete="current-password"
                aria-label="Password"
                isDisabled={isContinuing}
                className="osac-signin__field-input"
              />
            </FormGroup>
          </>
        ) : (
          <FormGroup label="Email address" fieldId="osac-email" className="osac-signin__field">
            <TextInput
              id="osac-email"
              name="email"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(_event, value) => setEmail(value)}
              autoComplete="email"
              validated="default"
              aria-label="Email address"
              isDisabled={isContinuing}
              className="osac-signin__field-input"
            />
          </FormGroup>
        )}

        {errorMessage ? (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant="error">{errorMessage}</HelperTextItem>
            </HelperText>
          </FormHelperText>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          isBlock
          className="osac-signin__submit"
          isDisabled={isContinuing || !canSubmit}
        >
          {submitLabel ?? (isLocalAccount ? 'Sign in' : 'Next')}
        </Button>
      </Form>
    </OsacAuthShell>
  )
}

function OsacPasswordField({
  id,
  value,
  onChange,
  autoComplete,
  isDisabled,
  validated = 'default',
}: {
  id: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  isDisabled?: boolean
  validated?: 'default' | 'error'
}) {
  const [hidden, setHidden] = useState(true)

  return (
    <div className="osac-signin__password-field">
      <TextInput
        id={id}
        type={hidden ? 'password' : 'text'}
        value={value}
        onChange={(_event, nextValue) => onChange(nextValue)}
        autoComplete={autoComplete}
        validated={validated}
        isDisabled={isDisabled}
        className="osac-signin__field-input"
      />
      <Button
        variant="plain"
        type="button"
        className="osac-signin__password-toggle"
        onClick={() => setHidden((isHidden) => !isHidden)}
        aria-label={hidden ? 'Show password' : 'Hide password'}
        icon={hidden ? <EyeIcon /> : <EyeSlashIcon />}
        isDisabled={isDisabled}
      />
    </div>
  )
}

export function OsacChangePasswordPage({
  onSubmit,
  isWorking = false,
  errorMessage,
  defaultCurrentPassword = '',
  defaultNewPassword = '',
  requireDifferentFromCurrent = true,
}: {
  onSubmit: (currentPassword: string, newPassword: string) => void
  isWorking?: boolean
  errorMessage?: string
  defaultCurrentPassword?: string
  defaultNewPassword?: string
  requireDifferentFromCurrent?: boolean
}) {
  const [currentPassword, setCurrentPassword] = useState(defaultCurrentPassword)
  const [newPassword, setNewPassword] = useState(defaultNewPassword)
  const [confirmPassword, setConfirmPassword] = useState(defaultNewPassword)

  useEffect(() => {
    setCurrentPassword(defaultCurrentPassword)
    setNewPassword(defaultNewPassword)
    setConfirmPassword(defaultNewPassword)
  }, [defaultCurrentPassword, defaultNewPassword])

  const mismatch = Boolean(confirmPassword) && newPassword !== confirmPassword
  const sameAsCurrent =
    requireDifferentFromCurrent && Boolean(newPassword) && newPassword === currentPassword
  const canSubmit =
    Boolean(currentPassword.trim() && newPassword.trim() && confirmPassword.trim()) &&
    !mismatch &&
    !sameAsCurrent &&
    newPassword.trim().length >= 8

  return (
    <OsacAuthShell title="Change password" isBusy={isWorking} busyLabel="Saving password…">
      <Form
        autoComplete="off"
        className="osac-signin__form"
        onSubmit={(event) => {
          event.preventDefault()
          if (isWorking || !canSubmit) {
            return
          }
          onSubmit(currentPassword, newPassword.trim())
        }}
      >
        <p className="osac-signin__helper">
          Change this break-glass password before continuing.
        </p>
        <FormGroup
          label="Current password"
          fieldId="osac-current-password"
          className="osac-signin__field"
          isRequired
        >
          <TextInput
            id="osac-current-password"
            type="password"
            value={currentPassword}
            onChange={(_event, value) => setCurrentPassword(value)}
            autoComplete="current-password"
            isDisabled={isWorking}
            className="osac-signin__field-input"
          />
        </FormGroup>
        <FormGroup
          label="New password"
          fieldId="osac-new-password"
          className="osac-signin__field"
          isRequired
        >
          <OsacPasswordField
            id="osac-new-password"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            validated={sameAsCurrent ? 'error' : 'default'}
            isDisabled={isWorking}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant={sameAsCurrent ? 'error' : 'default'}>
                {sameAsCurrent
                  ? 'Choose a different password from the one that was issued.'
                  : 'Use at least 8 characters.'}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
        <FormGroup
          label="Confirm new password"
          fieldId="osac-confirm-password"
          className="osac-signin__field"
          isRequired
        >
          <OsacPasswordField
            id="osac-confirm-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            validated={mismatch ? 'error' : 'default'}
            isDisabled={isWorking}
          />
          {mismatch ? (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="error">Passwords do not match.</HelperTextItem>
              </HelperText>
            </FormHelperText>
          ) : null}
        </FormGroup>
        {errorMessage ? (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant="error">{errorMessage}</HelperTextItem>
            </HelperText>
          </FormHelperText>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          isBlock
          className="osac-signin__submit"
          isDisabled={isWorking || !canSubmit}
        >
          Save password
        </Button>
      </Form>
    </OsacAuthShell>
  )
}
