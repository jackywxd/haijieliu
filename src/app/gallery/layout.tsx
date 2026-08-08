import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gallery | In Loving Memory Haijie",
  description: "Photo gallery in loving memory of Haijie.",
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
