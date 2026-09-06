import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "關於海婕 About Haijie",
  description:
    "劉海婕（Haijie Liu, 1973–2020）的丈夫寫下建立這個紀念網站的緣由，以及對妻子的思念。Why this memorial site for Haijie Liu exists, written by her husband.",
  alternates: { canonical: "/about" },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
