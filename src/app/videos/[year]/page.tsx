import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VideoPlayer from "@/components/VideoPlayer";
import { getVideoByYear, getVideos } from "@/lib/videos";

type Props = {
  params: Promise<{ year: string }>;
};

export async function generateStaticParams() {
  return getVideos().map((video) => ({
    year: String(video.year),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  const video = getVideoByYear(Number(year));
  if (!video) return {};

  return {
    title: video.description,
    description: video.description,
  };
}

export default async function VideoYearPage({ params }: Props) {
  const { year } = await params;
  const video = getVideoByYear(Number(year));

  if (!video) {
    notFound();
  }

  return <VideoPlayer video={video} />;
}
