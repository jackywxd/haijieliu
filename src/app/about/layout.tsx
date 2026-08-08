import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | In Loving Memory Haijie",
  description: "About Haijie Liu, in loving memory.",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
