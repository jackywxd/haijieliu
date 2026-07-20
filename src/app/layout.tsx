import type { Metadata, Viewport } from "next";
import AppShell from "@/components/AppShell";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "../styles/main.scss";

export const metadata: Metadata = {
  title: "In Loving Memory Haijie",
  description: "In Loving Memory Haijie",
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
    title: "In Loving Memory Haijie",
    description: "In Loving Memory Haijie",
    url: "https://haijieliu.com",
    type: "website",
    images: [{ url: "https://media.haijieliu.com/images/icons/website-icon.png" }],
  },
  twitter: {
    card: "summary",
    title: "In Loving Memory Haijie",
    description: "In Loving Memory Haijie",
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
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
