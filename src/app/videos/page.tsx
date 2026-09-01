import type { Metadata } from "next";
import Timeline from "@/components/Timeline";

export const metadata: Metadata = {
  title: "Memorial Videos | In Loving Memory Haijie",
  description: "Yearly memorial videos in loving memory of Haijie.",
};

export default function VideosPage() {
  return <Timeline />;
}
