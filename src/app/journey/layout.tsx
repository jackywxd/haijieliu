import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Journey | In Loving Memory Haijie",
  description: "Haijie's journey through life, in loving memory.",
};

export default function JourneyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
