import type { ComponentType, SVGProps } from 'react'
import { RhUiConnectedIcon } from '@patternfly/react-icons/dist/esm/icons/rh-ui-connected-icon'
import { OutlinedBuildingIcon } from '@patternfly/react-icons/dist/esm/icons/outlined-building-icon'
import { RhUiKeyIcon } from '@patternfly/react-icons/dist/esm/icons/rh-ui-key-icon'
import { RhUiProfileIcon } from '@patternfly/react-icons/dist/esm/icons/rh-ui-profile-icon'
import { RhUiZoneIcon } from '@patternfly/react-icons/dist/esm/icons/rh-ui-zone-icon'

type InventoryCardIconComponent = ComponentType<SVGProps<SVGSVGElement>>

export const TENANT_PLACEHOLDER_CARD_ICON: InventoryCardIconComponent = OutlinedBuildingIcon
export const VIRTUAL_NETWORK_CARD_ICON: InventoryCardIconComponent = RhUiZoneIcon
export const EXTERNAL_NETWORK_CARD_ICON: InventoryCardIconComponent = RhUiConnectedIcon
export const SECRET_CARD_ICON: InventoryCardIconComponent = RhUiKeyIcon
export const ADMINISTRATOR_CARD_ICON: InventoryCardIconComponent = RhUiProfileIcon

export function renderInventoryCardIcon(Icon: InventoryCardIconComponent) {
  return <Icon aria-hidden />
}
