import Link from "next/link";
import { getVideos } from "@/lib/videos";

// The day Haijie died — the point the timeline counts from. Stated in
// src/app/about/page.tsx ("suddenly passed away on Aug 28 2020"); the first
// entry carries this date instead of an ordinal, since it is not an
// anniversary but the year itself.
const DEPARTURE_DATE = "八月廿八日";

const CHINESE_NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

// Counted from whichever year comes first in the data rather than a hard-coded
// 2020, so the labels stay correct if the earliest entry ever changes. Falls
// back to digits past the numeral table so an eleventh year renders as 第11年
// rather than 第undefined年.
function anniversaryLabel(year: number, firstYear: number): string {
  const nth = year - firstYear;
  if (nth <= 0) return DEPARTURE_DATE;
  return `第${CHINESE_NUMERALS[nth - 1] ?? nth}年`;
}

export default function Timeline() {
  const videos = [...getVideos()].sort((a, b) => a.year - b.year);
  if (videos.length === 0) return null;

  const firstYear = videos[0].year;
  const latestYear = videos[videos.length - 1].year;

  return (
    <section id="timeline" aria-label="思念的每一年">
      <p className="timeline-label">Every Year Since</p>
      <p className="timeline-sublabel">思念的每一年</p>

      <ol className="timeline-list">
        {videos.map((video) => (
          <li
            key={video.year}
            className={
              video.year === latestYear
                ? "timeline-item is-latest"
                : "timeline-item"
            }
          >
            <Link href={`/videos/${video.year}`} className="timeline-link">
              <span className="timeline-heading">
                <span className="timeline-year">{video.year}</span>
                <span className="timeline-ordinal">
                  {anniversaryLabel(video.year, firstYear)}
                </span>
              </span>
              <span className="timeline-poem">{video.description}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
