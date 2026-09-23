import { ExternalLinkAltIcon } from '@patternfly/react-icons/dist/esm/icons/external-link-alt-icon'
import type { ReactNode } from 'react'
import { RouterButton } from '../RouterButton'

type M360BillingAccountLinkProps = {
  to: string
  children?: ReactNode
  className?: string
}

export function M360BillingAccountLink({
  to,
  children = 'View in M360',
  className,
}: M360BillingAccountLinkProps) {
  return (
    <RouterButton
      variant="link"
      isInline
      to={to}
      className={className}
      icon={<ExternalLinkAltIcon aria-hidden />}
      iconPosition="end"
    >
      {children}
    </RouterButton>
  )
}
