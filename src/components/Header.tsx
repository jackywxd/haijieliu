// The faces live in layout/_header.scss with the rest of the type, rather than
// inline, so the phone and desktop sizes can differ.
export default function Header() {
  return (
    <header id="header">
      <div className="row">
        <div className="column">
          <h2 className="header-eyebrow">In Loving Memory</h2>
          <h1 className="header-name">Haijie Liu</h1>
          <h3 className="header-dates">1973 – 2020</h3>
        </div>
        <div className="column header-epitaph">
          <p>You have fought the good fight,</p>
          <p>You have finished the race,</p>
          <p>You have kept the faith.</p>
        </div>
      </div>
    </header>
  );
}
