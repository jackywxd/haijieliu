import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "紀念歌曲 Songs",
  description:
    "為紀念劉海婕（Haijie Liu, 1973–2020）而選的歌曲：Going Home 與 You Raise Me Up。Songs chosen in loving memory of Haijie Liu.",
  alternates: { canonical: "/songs" },
};

export default function SongsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
