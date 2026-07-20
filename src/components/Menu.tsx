"use client";

import Link from "next/link";

type Props = {
  onToggleMenu: () => void;
};

const links = [
  { href: "/", label: "Home" },
  { href: "/videos", label: "Videos" },
  { href: "/songs", label: "Songs" },
  { href: "/gallery", label: "Gallery" },
  { href: "/message", label: "Messages" },
  { href: "/journey", label: "Journey" },
  { href: "/about", label: "About" },
];

export default function Menu({ onToggleMenu }: Props) {
  return (
    <nav id="menu">
      <div className="inner">
        <ul className="links">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} onClick={onToggleMenu}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <a
        className="close"
        href="#close"
        onClick={(e) => {
          e.preventDefault();
          onToggleMenu();
        }}
      >
        Close
      </a>
    </nav>
  );
}
