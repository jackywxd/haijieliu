"use client";

type Props = {
  onToggleMenu: () => void;
};

export default function Top({ onToggleMenu }: Props) {
  return (
    <header id="top" className="alt">
      <nav>
        <a
          className="menu-link"
          href="#menu"
          onClick={(e) => {
            e.preventDefault();
            onToggleMenu();
          }}
        >
          Menu
        </a>
      </nav>
    </header>
  );
}
