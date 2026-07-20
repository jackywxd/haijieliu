"use client";

import { useEffect, useState, type ReactNode } from "react";
import Menu from "./Menu";
import Top from "./Top";

export default function AppShell({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState("is-loading");
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setLoading(""), 100);
    return () => window.clearTimeout(id);
  }, []);

  const onToggleMenu = () => setIsMenuVisible((v) => !v);

  return (
    <div
      className={`body ${loading} ${isMenuVisible ? "is-menu-visible" : ""}`}
    >
      <Top onToggleMenu={onToggleMenu} />
      {children}
      <Menu onToggleMenu={onToggleMenu} />
    </div>
  );
}
