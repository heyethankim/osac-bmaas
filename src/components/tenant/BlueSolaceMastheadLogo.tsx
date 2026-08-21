const BLUE_SOLACE_LOGO_SRC = `${import.meta.env.BASE_URL}bluesolace-financial-group-logo.png`

export function BlueSolaceMastheadLogo() {
  return (
    <div className="bluesolace-masthead-brand" role="img" aria-label="BlueSolace Financial Group">
      <img
        src={BLUE_SOLACE_LOGO_SRC}
        alt=""
        className="bluesolace-masthead-brand__img"
        draggable={false}
      />
    </div>
  )
}
