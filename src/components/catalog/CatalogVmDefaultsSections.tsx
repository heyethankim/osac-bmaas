import {
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
} from '@patternfly/react-core'
import {
  VM_CATALOG_CONFIGURATION_DEFAULTS,
  VM_CATALOG_CONFIGURATION_DEFAULTS_LEDE,
  VM_CATALOG_DEFAULT_RESOURCES,
} from '../../catalog/vmCatalogDefaults'

type CatalogVmDefaultsSectionsProps = {
  /** Optional id prefix for aria-labels when multiple drawers mount. */
  idPrefix?: string
}

export function CatalogVmDefaultsSections({
  idPrefix = 'catalog-vm',
}: CatalogVmDefaultsSectionsProps) {
  return (
    <div className="catalog-vm-defaults">
      <div className="catalog-vm-defaults__section">
        <Content component="p" className="catalog-vm-defaults__title">
          Default resources
        </Content>
        <div className="catalog-vm-defaults__resource-list" aria-label="Default resources">
          {VM_CATALOG_DEFAULT_RESOURCES.map((resource) => (
            <Label
              key={`${resource.label}-${resource.value}`}
              isCompact
              className="catalog-vm-defaults__resource-chip"
            >
              {resource.value} {resource.label}
            </Label>
          ))}
        </div>
      </div>

      <div className="catalog-vm-defaults__section">
        <Content component="p" className="catalog-vm-defaults__title">
          Configuration defaults
        </Content>
        <Content component="p" className="catalog-vm-defaults__lede">
          {VM_CATALOG_CONFIGURATION_DEFAULTS_LEDE}
        </Content>
        <DescriptionList
          isCompact
          className="catalog-vm-defaults__dl"
          aria-label={`${idPrefix} configuration defaults`}
        >
          {VM_CATALOG_CONFIGURATION_DEFAULTS.map((field) => (
            <DescriptionListGroup key={field.id}>
              <DescriptionListTerm>
                <span className="catalog-vm-defaults__term">
                  <span>{field.label}</span>
                  <Label
                    color={field.mode === 'editable' ? 'blue' : 'grey'}
                    isCompact
                    className="catalog-vm-defaults__mode-label"
                  >
                    {field.mode === 'editable' ? 'Editable' : 'Fixed'}
                  </Label>
                </span>
              </DescriptionListTerm>
              <DescriptionListDescription>{field.value}</DescriptionListDescription>
            </DescriptionListGroup>
          ))}
        </DescriptionList>
      </div>
    </div>
  )
}
