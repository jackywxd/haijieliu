import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "生命歷程 Life Journey",
  description:
    "劉海婕（Haijie Liu, 1973–2020）從求學、工作到成家的生命歷程。The life journey of Haijie Liu, from her studies and career to her family.",
  alternates: { canonical: "/journey" },
};

export default function JourneyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
