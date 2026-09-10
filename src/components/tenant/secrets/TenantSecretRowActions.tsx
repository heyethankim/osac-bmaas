import { ActionsColumn, type IAction } from '@patternfly/react-table'

type TenantSecretRowActionsProps = {
  onEdit: () => void
  onDelete: () => void
}

export function TenantSecretRowActions({ onEdit, onDelete }: TenantSecretRowActionsProps) {
  const items: IAction[] = [
    { title: 'Edit', onClick: onEdit },
    { isSeparator: true },
    { title: 'Delete', onClick: onDelete, isDanger: true },
  ]

  return <ActionsColumn items={items} />
}
