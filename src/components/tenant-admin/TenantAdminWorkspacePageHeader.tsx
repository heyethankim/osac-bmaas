import type { ReactNode } from 'react'
import { Content, Flex, FlexItem, Label, Title } from '@patternfly/react-core'

type TenantAdminWorkspacePageHeaderProps = {
  kicker: string
  title: string
  lede?: string
  action?: ReactNode
}

export function TenantAdminWorkspacePageHeader({
  kicker,
  title,
  lede,
  action,
}: TenantAdminWorkspacePageHeaderProps) {
  return (
    <Flex
      className="tenant-admin-workspace-page__header"
      alignItems={{ default: 'alignItemsFlexStart' }}
      justifyContent={{ default: 'justifyContentSpaceBetween' }}
      gap={{ default: 'gapMd' }}
    >
      <FlexItem>
        <Label color="grey" className="tenant-admin-workspace-page__kicker">
          {kicker}
        </Label>
        <Title headingLevel="h1" size="3xl" className="tenant-admin-workspace-page__title">
          {title}
        </Title>
        {lede ? (
          <Content component="p" className="tenant-admin-workspace-page__lede">
            {lede}
          </Content>
        ) : null}
      </FlexItem>
      {action ? <FlexItem alignSelf={{ default: 'alignSelfFlexStart' }}>{action}</FlexItem> : null}
    </Flex>
  )
}
