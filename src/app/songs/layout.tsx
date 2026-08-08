import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Songs | In Loving Memory Haijie",
  description: "Songs in loving memory of Haijie.",
};

export default function SongsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
