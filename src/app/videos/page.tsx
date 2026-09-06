import type { Metadata } from "next";
import Timeline from "@/components/Timeline";

export const metadata: Metadata = {
  title: "每年紀念影片 Memorial Videos",
  description:
    "自 2020 年起，每年為劉海婕（Haijie Liu）製作的紀念影片與思念的詩句。Yearly memorial videos for Haijie Liu, one for every year since 2020.",
  alternates: { canonical: "/videos" },
};

export default function VideosPage() {
  return <Timeline as="h1" />;
}
