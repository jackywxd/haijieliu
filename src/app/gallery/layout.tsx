import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "紀念相冊 Photo Gallery",
  description:
    "劉海婕（Haijie Liu, 1973–2020）的紀念相冊，收錄家人親友珍藏的照片。A photo gallery in loving memory of Haijie Liu, kept by her family and friends.",
  alternates: { canonical: "/gallery" },
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
