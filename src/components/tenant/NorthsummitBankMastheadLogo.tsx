const NORTH_SUMMIT_LOGO_SRC = `${import.meta.env.BASE_URL}north-summit-bank-logo.svg`

export function NorthsummitBankMastheadLogo() {
  return (
    <div className="northsummit-masthead-brand" role="img" aria-label="North Summit Bank">
      <img
        src={NORTH_SUMMIT_LOGO_SRC}
        alt=""
        className="northsummit-masthead-brand__img"
        draggable={false}
      />
    </div>
  )
}
