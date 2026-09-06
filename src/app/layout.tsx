import type { Metadata, Viewport } from "next";
import AppShell from "@/components/AppShell";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "../styles/main.scss";

export const metadata: Metadata = {
  // Search Console reported http://haijieliu.com/ and http://www.haijieliu.com/
  // as "Duplicate without user-selected canonical". Both hosts serve the site
  // and neither redirects, so without a canonical Google had four spellings of
  // every page and no instruction about which one counts. metadataBase makes
  // the per-page `alternates.canonical` values below absolute against the
  // https apex, which is the spelling the sitemap uses.
  metadataBase: new URL("https://haijieliu.com"),
  alternates: { canonical: "/" },
  // Title and description used to be the same six words on every page, which
  // gave Google nothing to tell the pages apart by and none of the names people
  // actually search for. The template keeps the brand on every tab without each
  // page repeating it.
  title: {
    default: "劉海婕紀念網站 In Loving Memory of Haijie Liu (1973–2020)",
    template: "%s | 劉海婕 Haijie Liu 紀念網站",
  },
  description:
    "紀念劉海婕（Haijie Liu, 1973–2020）：生命歷程、紀念相冊、歌曲、每一年的紀念影片，以及親友的懷念留言。A memorial website for Haijie Liu — her journey, photos, songs, yearly memorial videos and messages from those who loved her.",
  keywords: [
    "haijie",
    "haijieliu",
    "memory",
    "in love memory of haijie",
    "海婕",
    "劉海婕",
    "刘海婕",
    "纪念海婕",
    "紀念海婕",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "512x512" }],
  },
  openGraph: {
    title: "劉海婕紀念網站 In Loving Memory of Haijie Liu (1973–2020)",
    description:
      "紀念劉海婕（Haijie Liu, 1973–2020）：生命歷程、紀念相冊、歌曲與每一年的紀念影片。",
    siteName: "劉海婕紀念網站 In Loving Memory of Haijie Liu",
    locale: "zh_TW",
    url: "https://haijieliu.com",
    type: "website",
    images: [{ url: "https://media.haijieliu.com/images/icons/website-icon.png" }],
  },
  twitter: {
    card: "summary",
    title: "劉海婕紀念網站 In Loving Memory of Haijie Liu (1973–2020)",
    description:
      "紀念劉海婕（Haijie Liu, 1973–2020）：生命歷程、紀念相冊、歌曲與每一年的紀念影片。",
    images: ["https://media.haijieliu.com/images/icons/website-icon.png"],
  },
  appleWebApp: {
    capable: true,
    title: "Haijie",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#1b1f22",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>
        <AppShell>{children}</AppShell>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
