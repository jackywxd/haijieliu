import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
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
  openGraph: {
    title: "In Loving Memory Haijie",
    description: "In Loving Memory Haijie",
    url: "https://haijieliu.com",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "In Loving Memory Haijie",
    description: "In Loving Memory Haijie",
  },
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
      </body>
    </html>
  );
}
