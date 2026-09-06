import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VideoPlayer from "@/components/VideoPlayer";
import { getVideoByYear, getVideos, isoDuration, type VideoMeta } from "@/lib/videos";

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
    title: `${video.year} 年紀念影片 Memorial Video`,
    description: `${video.year} 年為劉海婕（Haijie Liu）製作的紀念影片。${video.description}`,
    alternates: { canonical: `/videos/${video.year}` },
    openGraph: {
      title: `${video.year} | In Loving Memory Haijie`,
      description: video.description,
      url: `/videos/${video.year}`,
      type: "video.other",
      images: video.poster ? [{ url: video.poster }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${video.year} | In Loving Memory Haijie`,
      description: video.description,
      images: video.poster ? [video.poster] : undefined,
    },
  };
}

// Search Console reported these videos as "No thumbnail URL provided": a bare
// <video> tag gives Google no still to show, so the video is crawled but never
// indexed as a video result. thumbnailUrl, name and uploadDate are the
// properties Google requires of a VideoObject; the rest are recommended.
function videoJsonLd(video: VideoMeta) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: `${video.year} — In Loving Memory Haijie`,
    description: video.description,
    thumbnailUrl: video.poster ? [video.poster] : undefined,
    uploadDate: video.uploadDate,
    duration: video.durationSeconds
      ? isoDuration(video.durationSeconds)
      : undefined,
    // contentUrl only: schema.org's embedUrl means a player, and this page is
    // a plain <video> rather than something embeddable in an iframe.
    contentUrl: video.link,
    width: video.width,
    height: video.height,
  };
}

export default async function VideoYearPage({ params }: Props) {
  const { year } = await params;
  const video = getVideoByYear(Number(year));

  if (!video) {
    notFound();
  }

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify drops the undefined properties, so a video missing
        // its probed metadata emits valid markup rather than nulls.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd(video)) }}
      />
      <VideoPlayer video={video} />
    </>
  );
}
