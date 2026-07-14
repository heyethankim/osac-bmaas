import { Button, type ButtonProps } from '@patternfly/react-core'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

type RouterButtonProps = Omit<ButtonProps, 'component'> & {
  to: LinkProps['to']
  children: ReactNode
}

/** PatternFly Button rendered as a react-router Link (see Button examples). */
export function RouterButton({ to, children, ...buttonProps }: RouterButtonProps) {
  return (
    <Button
      {...buttonProps}
      component={(props: AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <Link {...props} to={to} />
      )}
    >
      {children}
    </Button>
  )
}
