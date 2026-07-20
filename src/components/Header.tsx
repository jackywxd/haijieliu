export default function Header() {
  return (
    <header id="header">
      <h2 style={{ fontFamily: "Clicker Script" }}>In Loving Memory</h2>
      <h1 style={{ fontFamily: "Monsieur La Doulaise" }}>Haijie Liu</h1>
      <h3 style={{ fontFamily: "Clicker Script" }}>1973 - 2020</h3>
      <br />
      <div className="row">
        <div className="column" style={{ fontFamily: "League Script" }}>
          <p>You have fought the good fight,</p>
          <p style={{ fontFamily: "League Script" }}>
            You have finished the race,
          </p>
          <p style={{ fontFamily: "League Script" }}>You have kept the faith.</p>
        </div>
        <div className="column">
          <p>就算換了時空變了容顏　</p>
          <p>我依然記得你眼裡的依戀</p>
          <p>縱然聚散由命也要用心感動天</p>
        </div>
      </div>
    </header>
  );
}
