import type { ReactNode } from 'react'
import { Content, Flex, FlexItem, Label, Title } from '@patternfly/react-core'

type ProviderAdminWorkspacePageHeaderProps = {
  kicker: string
  title: string
  lede?: string
  action?: ReactNode
}

export function ProviderAdminWorkspacePageHeader({
  kicker,
  title,
  lede,
  action,
}: ProviderAdminWorkspacePageHeaderProps) {
  return (
    <Flex
      className="provider-admin-workspace-page__header"
      alignItems={{ default: 'alignItemsFlexStart' }}
      justifyContent={{ default: 'justifyContentSpaceBetween' }}
      gap={{ default: 'gapMd' }}
    >
      <FlexItem>
        <Label color="blue" className="provider-admin-workspace-page__kicker">
          {kicker}
        </Label>
        <Title headingLevel="h1" size="3xl" className="provider-admin-workspace-page__title">
          {title}
        </Title>
        {lede ? (
          <Content component="p" className="provider-admin-workspace-page__lede">
            {lede}
          </Content>
        ) : null}
      </FlexItem>
      {action ? <FlexItem alignSelf={{ default: 'alignSelfFlexStart' }}>{action}</FlexItem> : null}
    </Flex>
  )
}
