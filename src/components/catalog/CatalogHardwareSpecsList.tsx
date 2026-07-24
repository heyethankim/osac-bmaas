import type { CatalogHardwareSpecs } from '../../catalog/hardwareSpecs'

type CatalogHardwareSpecsListProps = {
  specs: CatalogHardwareSpecs
  className?: string
}

export function CatalogHardwareSpecsList({ specs, className }: CatalogHardwareSpecsListProps) {
  return (
    <dl className={['catalog-hardware-specs', className].filter(Boolean).join(' ')}>
      <div className="catalog-hardware-specs__row">
        <dt className="catalog-hardware-specs__label">CPU</dt>
        <dd className="catalog-hardware-specs__value">{specs.cpu}</dd>
      </div>
      <div className="catalog-hardware-specs__row">
        <dt className="catalog-hardware-specs__label">RAM</dt>
        <dd className="catalog-hardware-specs__value">{specs.ram}</dd>
      </div>
      <div className="catalog-hardware-specs__row">
        <dt className="catalog-hardware-specs__label">GPU</dt>
        <dd className="catalog-hardware-specs__value">{specs.gpu}</dd>
      </div>
      <div className="catalog-hardware-specs__row">
        <dt className="catalog-hardware-specs__label">OS image</dt>
        <dd className="catalog-hardware-specs__value">{specs.osImage}</dd>
      </div>
    </dl>
  )
}
