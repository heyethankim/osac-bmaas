import {
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalHeader,
  ModalVariant,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core'
import { DesktopIcon } from '@patternfly/react-icons/dist/esm/icons/desktop-icon'
import { MoonIcon } from '@patternfly/react-icons/dist/esm/icons/moon-icon'
import { SunIcon } from '@patternfly/react-icons/dist/esm/icons/sun-icon'
import { useThemePreferences } from '../../theme/themePreferences'

type UserPreferencesModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function UserPreferencesModal({ isOpen, onClose }: UserPreferencesModalProps) {
  const {
    colorSchemePreference,
    setColorSchemePreference,
    contrastModePreference,
    setContrastModePreference,
  } = useThemePreferences()

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="user-preferences-title"
    >
      <ModalHeader
        title="User preferences"
        labelId="user-preferences-title"
        description="Choose how this application looks for you. Changes apply immediately."
      />
      <ModalBody>
        <Form>
          <FormGroup label="Color scheme" fieldId="user-preferences-color-scheme">
            <ToggleGroup aria-label="Color scheme" id="user-preferences-color-scheme">
              <ToggleGroupItem
                text="System"
                icon={<DesktopIcon />}
                buttonId="user-preferences-color-scheme-system"
                isSelected={colorSchemePreference === 'system'}
                onChange={() => setColorSchemePreference('system')}
              />
              <ToggleGroupItem
                text="Light"
                icon={<SunIcon />}
                buttonId="user-preferences-color-scheme-light"
                isSelected={colorSchemePreference === 'light'}
                onChange={() => setColorSchemePreference('light')}
              />
              <ToggleGroupItem
                text="Dark"
                icon={<MoonIcon />}
                buttonId="user-preferences-color-scheme-dark"
                isSelected={colorSchemePreference === 'dark'}
                onChange={() => setColorSchemePreference('dark')}
              />
            </ToggleGroup>
          </FormGroup>
          <FormGroup label="Contrast mode" fieldId="user-preferences-contrast-mode">
            <ToggleGroup aria-label="Contrast mode" id="user-preferences-contrast-mode">
              <ToggleGroupItem
                text="System"
                icon={<DesktopIcon />}
                buttonId="user-preferences-contrast-mode-system"
                isSelected={contrastModePreference === 'system'}
                onChange={() => setContrastModePreference('system')}
              />
              <ToggleGroupItem
                text="Default"
                buttonId="user-preferences-contrast-mode-default"
                isSelected={contrastModePreference === 'default'}
                onChange={() => setContrastModePreference('default')}
              />
              <ToggleGroupItem
                text="High contrast"
                buttonId="user-preferences-contrast-mode-high-contrast"
                isSelected={contrastModePreference === 'high-contrast'}
                onChange={() => setContrastModePreference('high-contrast')}
              />
              <ToggleGroupItem
                text="Glass"
                buttonId="user-preferences-contrast-mode-glass"
                isSelected={contrastModePreference === 'glass'}
                onChange={() => setContrastModePreference('glass')}
              />
            </ToggleGroup>
          </FormGroup>
        </Form>
      </ModalBody>
    </Modal>
  )
}
