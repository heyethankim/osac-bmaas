import { useEffect, useState } from 'react'
import {
  Button,
  Form,
  FormGroup,
  Spinner,
  TextInput,
  Title,
} from '@patternfly/react-core'
import { ConceptualDesignSticker } from '../components/ConceptualDesignSticker'
import redHatHatLogoUrl from '../assets/Logo-RedHat-Hat-Color-RGB.svg?url'

export type OsacSignInPageProps = {
  onNext: () => void
  defaultEmail: string
  isContinuing?: boolean
}

export function OsacSignInPage({
  onNext,
  defaultEmail,
  isContinuing = false,
}: OsacSignInPageProps) {
  const [email, setEmail] = useState(defaultEmail)

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    setEmail(defaultEmail)
  }, [defaultEmail])

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
            Sign in
          </Title>

          <Form
            autoComplete="off"
            className="osac-signin__form"
            onSubmit={(event) => {
              event.preventDefault()
              if (isContinuing) {
                return
              }
              onNext()
            }}
          >
            <FormGroup
              label="Email address"
              fieldId="osac-email"
              className="osac-signin__field"
            >
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

            <Button
              type="submit"
              variant="primary"
              isBlock
              className="osac-signin__submit"
              isDisabled={isContinuing || !email.trim()}
            >
              Next
            </Button>
          </Form>
        </div>
      </main>

      {isContinuing ? (
        <div
          className="osac-signin__loading-veil"
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="Continuing to sign in"
        >
          <Spinner size="lg" aria-label="Continuing to sign in" />
        </div>
      ) : null}
      <ConceptualDesignSticker />
    </div>
  )
}
