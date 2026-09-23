import { Button, type ButtonProps } from '@patternfly/react-core'
import { ExternalLinkAltIcon } from '@patternfly/react-icons/dist/esm/icons/external-link-alt-icon'
import type { ReactNode } from 'react'

type ExternalLinkButtonProps = {
  href: string
  children: ReactNode
  className?: string
  variant?: ButtonProps['variant']
  iconPosition?: 'start' | 'end'
  onClick?: () => void
}

/** Inline or block link that opens in a new tab with the standard external-link icon. */
export function ExternalLinkButton({
  href,
  children,
  className,
  variant = 'link',
  iconPosition = 'end',
  onClick,
}: ExternalLinkButtonProps) {
  return (
    <Button
      variant={variant}
      isInline={variant === 'link'}
      icon={<ExternalLinkAltIcon aria-hidden />}
      iconPosition={iconPosition}
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}
